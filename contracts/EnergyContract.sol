// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

contract EnergyContract is Ownable, Pausable, ReentrancyGuard {
    // Chainlink ETH/USD price feed
    AggregatorV3Interface internal priceFeed;
    // Solar farm details
    address public solarFarm; // Address of the solar farm
    address public paymentReceiver; // Address to receive ETH payments
    uint256 public availableKWh; // Available energy in kWh
    uint256 public constant PRICE_PER_KWH_USD_CENTS = 12; // Fixed price per kWh in USD cents
    uint256 public constant MAX_KWH_PER_PURCHASE = 1000; // Max kWh per purchase
    uint256 public constant STALENESS_THRESHOLD = 15 minutes; // Price feed staleness threshold
    uint256 public constant ADD_ENERGY_DELAY = 2 minutes; // Delay for adding energy
    uint256 public constant COMMIT_REVEAL_WINDOW = 5 minutes; // Commitment reveal window
    //uint256 public constant COMMIT_COOLDOWN = 5 minutes; // Cooldown between commitments
    uint256 public constant COMMIT_COOLDOWN = 0.5 minutes; // Cooldown between commitments

    uint256 public constant MAX_AUTHORIZED_PARTIES = 100; // Max authorized parties
    uint256 public constant MAX_GAS_FOR_CALL = 5_000_000; // Gas limit for external calls
    //last failure timestamp for Chainlink price feed
    uint256 public lastChainlinkFailure;

    // Cached ETH/USD price to reduce gas costs
    uint256 private cachedEthPrice;
    uint256 private priceLastUpdated;

    // Custom errors for gas-efficient error handling
    error InsufficientEnergyAvailable(uint256 requested, uint256 available);
    error PaymentAmountTooSmall(uint256 provided, uint256 required);
    error PriceFeedStale(uint256 lastUpdate, uint256 threshold);
    error CommitmentExpired(uint256 commitTime, uint256 currentTime);
    error InvalidPartyAddress();
    error PartyAlreadyAuthorized();
    error PartyNotAuthorized();
    error MaxAuthorizedPartiesReached();
    error NoPendingRequest();
    error DelayNotElapsed(uint256 requestTime, uint256 currentTime);
    error CommitmentCooldownActive(uint256 lastCommit, uint256 currentTime);
    error InvalidCommitment();
    error PaymentFailed();
    error NoRefundsAvailable();
    error InvalidTransactionID();
    error InvalidPriceBounds();
    error InvalidBatchIndex(uint256 startIndex, uint256 arrayLength);
    error InvalidCommitmentHash();
    error PartyNotFoundInList();
    error InvalidEthPrice();

    struct Transaction {
        address buyer; // Address of the buyer
        address seller; // Address of the seller (always solarFarm)
        uint256 kWh; // Amount of energy purchased
        uint256 pricePerKWhUSD; // Price per kWh in USD cents
        uint256 ethPriceUSD; // ETH/USD price at transaction time
        uint256 timestamp; // Transaction timestamp
    }

    struct PurchaseCommitment {
        bytes32 commitmentHash; // Hash of buyer's kWh and nonce
        uint256 timestamp; // Commitment timestamp
    }

    // State variables
    mapping(address => bool) public authorizedParties; // Tracks authorized parties
    mapping(address => PurchaseCommitment) public purchaseCommitments; // Tracks purchase commitments
    mapping(address => uint256) public lastCommitTime; // Tracks last commitment time
    mapping(address => uint256) public pendingRefunds; // Tracks pending refunds
    mapping(address => uint256) public lastAddEnergyRequest; // Tracks last energy add request
    mapping(uint256 => Transaction) public transactions; // Stores transactions
    //mapping(string => address) public uids; don't know if I will use it
    uint256 public transactionCount; // Transaction counter
    uint256 public authorizedPartyCount; // Authorized party counter
    address[] private authorizedPartyList; // List of authorized parties

    // Events
    event EnergyAddRequested(
        address indexed seller,
        uint256 indexed kWh,
        uint256 timestamp
    );
    event EnergyAdded(
        address indexed seller,
        uint256 indexed kWh,
        uint256 timestamp
    );
    event EnergyPurchaseCommitted(
        address indexed buyer,
        bytes32 commitmentHash,
        uint256 timestamp
    );
    event EnergyPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed kWh,
        uint256 totalCostWei,
        uint256 ethPriceUSD,
        uint256 timestamp
    );
    event Authorized(address indexed party, uint256 timestamp);
    event Unauthorized(address indexed party, uint256 timestamp);
    event AllAuthorizationsRevoked(uint256 timestamp);
    event AuthorizationsBatchRevoked(
        uint256 startIndex,
        uint256 endIndex,
        uint256 timestamp
    );
    event RefundWithdrawn(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event CommitmentCleared(address indexed user, uint256 timestamp);
    event PriceCacheUpdated(uint256 indexed newPrice, uint256 timestamp); // For the update function
    event PausedDueToChainlinkDowntime(uint256 timestamp); // For Chainlink downtime

    // Modifier to restrict access to authorized parties
    modifier onlyAuthorizedParties() {
        if (!authorizedParties[msg.sender]) revert PartyNotAuthorized();
        _;
    }

    // Constructor initializes the contract with price feed and solar farm addresses
    constructor(address _priceFeed, address _solarFarm) Ownable(msg.sender) {
        if (_priceFeed == address(0) || _solarFarm == address(0))
            revert InvalidPartyAddress();
        priceFeed = AggregatorV3Interface(_priceFeed);
        (, int256 price, , , ) = priceFeed.latestRoundData();
        if (price >= 0) {
            cachedEthPrice = uint256(price) * 10 ** 10; // Adjust for decimals
        }
        solarFarm = _solarFarm;
        paymentReceiver = _solarFarm;
        authorizedParties[_solarFarm] = true;
        authorizedPartyList.push(_solarFarm);
        authorizedPartyCount = 1;
        emit Authorized(_solarFarm, block.timestamp);
        transferOwnership(_solarFarm);
    }

    // Authorizes a new party to purchase energy
    function authorizeParty(address _party) external onlyOwner whenNotPaused {
        if (_party == address(0)) revert InvalidPartyAddress();
        if (authorizedParties[_party]) revert PartyAlreadyAuthorized();
        if (authorizedPartyCount >= MAX_AUTHORIZED_PARTIES)
            revert MaxAuthorizedPartiesReached();
        authorizedParties[_party] = true;
        authorizedPartyList.push(_party);
        authorizedPartyCount++;
        emit Authorized(_party, block.timestamp);
    }

    // Removes authorization from a party
    function unAuthorizeParty(address _party) external onlyOwner whenNotPaused {
        if (!authorizedParties[_party]) revert PartyNotAuthorized();
        authorizedParties[_party] = false;
        bool found = false;
        for (uint256 i = 0; i < authorizedPartyList.length; i++) {
            if (authorizedPartyList[i] == _party) {
                authorizedPartyList[i] = authorizedPartyList[
                    authorizedPartyList.length - 1
                ];
                authorizedPartyList.pop();
                authorizedPartyCount--;
                found = true;
                break;
            }
        }
        if (!found) revert PartyNotFoundInList();
        emit Unauthorized(_party, block.timestamp);
    }

    // Revokes all authorizations except solarFarm
    function revokeAllAuthorizations() external onlyOwner {
        for (uint256 i = 0; i < authorizedPartyList.length; i++) {
            if (authorizedPartyList[i] != solarFarm) {
                authorizedParties[authorizedPartyList[i]] = false;
            }
        }
        delete authorizedPartyList;
        authorizedPartyList.push(solarFarm);
        authorizedPartyCount = 1;
        emit AllAuthorizationsRevoked(block.timestamp);
    }

    function getCachedEthPrice() public view returns (uint256) {
        return cachedEthPrice;
    }

    // Revokes authorizations in batches for gas efficiency
    function revokeAuthorizationsBatch(
        uint256 startIndex,
        uint256 batchSize
    ) external onlyOwner {
        if (startIndex >= authorizedPartyList.length || batchSize == 0)
            revert InvalidBatchIndex(startIndex, authorizedPartyList.length);
        uint256 endIndex = startIndex + batchSize;
        if (endIndex > authorizedPartyList.length)
            endIndex = authorizedPartyList.length;
        uint256 removedCount = 0;
        for (uint256 i = startIndex; i < endIndex; i++) {
            if (authorizedPartyList[i] != solarFarm) {
                authorizedParties[authorizedPartyList[i]] = false;
                authorizedPartyList[i] = address(0);
                removedCount++;
            }
        }
        // Rebuild array to remove marked entries
        address[] memory newList = new address[](
            authorizedPartyList.length - removedCount
        );
        uint256 newIndex = 0;
        for (uint256 i = 0; i < authorizedPartyList.length; i++) {
            if (authorizedPartyList[i] != address(0)) {
                newList[newIndex] = authorizedPartyList[i];
                newIndex++;
            }
        }
        authorizedPartyList = newList;
        authorizedPartyCount = newList.length;
        emit AuthorizationsBatchRevoked(startIndex, endIndex, block.timestamp);
    }

    // View function to inspect authorizedPartyList
    function getAuthorizedPartyList() external view returns (address[] memory) {
        return authorizedPartyList;
    }

    // Requests to add energy to the available pool
    function requestAddEnergy(uint256 _kWh) external onlyOwner whenNotPaused {
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE)
            revert InsufficientEnergyAvailable(_kWh, MAX_KWH_PER_PURCHASE);
        lastAddEnergyRequest[msg.sender] = block.timestamp;
        emit EnergyAddRequested(solarFarm, _kWh, block.timestamp);
    }

    // Checks the authorization status of a party
    function checkAuthState(
        address _party
    ) external view returns (bool isAuthorized) {
        console.log("checking");
        if (_party == address(0)) revert InvalidPartyAddress();
        return authorizedParties[_party]; // Returns false if _party is not authorized
    }

    // Confirms adding energy after delay
    function confirmAddEnergy(uint256 _kWh) external onlyOwner whenNotPaused {
        if (lastAddEnergyRequest[msg.sender] == 0) revert NoPendingRequest();
        if (
            block.timestamp <
            lastAddEnergyRequest[msg.sender] + ADD_ENERGY_DELAY
        )
            revert DelayNotElapsed(
                lastAddEnergyRequest[msg.sender],
                block.timestamp
            );
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE)
            revert InsufficientEnergyAvailable(_kWh, MAX_KWH_PER_PURCHASE);
        availableKWh += _kWh;
        lastAddEnergyRequest[msg.sender] = 0;
        emit EnergyAdded(solarFarm, _kWh, block.timestamp);
    }

    // Commits to an energy purchase
    function commitPurchase(
        bytes32 _commitmentHash
    ) external onlyAuthorizedParties whenNotPaused {
        //console.log("the sender is: %d", msg.sender);
        if (_commitmentHash == bytes32(0)) revert InvalidCommitmentHash();
        if (block.timestamp < lastCommitTime[msg.sender] + COMMIT_COOLDOWN)
            revert CommitmentCooldownActive(
                lastCommitTime[msg.sender],
                block.timestamp
            );
        purchaseCommitments[msg.sender] = PurchaseCommitment({
            commitmentHash: _commitmentHash,
            timestamp: block.timestamp
        });
        lastCommitTime[msg.sender] = block.timestamp;
        emit EnergyPurchaseCommitted(
            msg.sender,
            _commitmentHash,
            block.timestamp
        );
    }

    function calculateRequiredPayment(
        uint256 _kWh,
        uint256 _ethPriceUSD
    ) public pure returns (uint256) {
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE)
            revert InsufficientEnergyAvailable(_kWh, MAX_KWH_PER_PURCHASE);
        if (_ethPriceUSD < 100 * 10 ** 8 || _ethPriceUSD > 10000 * 10 ** 8)
            revert InvalidPriceBounds();

        uint256 totalCostUSDCents = _kWh * PRICE_PER_KWH_USD_CENTS;
        if (totalCostUSDCents > 2 ** 128) revert("Cost overflow");
        uint256 ethPriceUSDcents = _ethPriceUSD / 1e2; // Assuming _ethPriceUSD has 8 decimals
        uint256 totalCostWei = (totalCostUSDCents * 1e18) / ethPriceUSDcents;
        // Debug output: split into multiple console.log calls to avoid argument limit
        //console.log("totalCostUSDCents:", totalCostUSDCents);
        //console.log("ethPriceUSDcents:", ethPriceUSDcents);
        //console.log("totalCostWei:", totalCostWei);
        return totalCostWei;
    }

    // Reveals and executes a committed purchase
    function revealPurchase(
        uint256 _kWh,
        uint256 _nonce
    ) external payable onlyAuthorizedParties whenNotPaused nonReentrant {
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE || availableKWh < _kWh)
            revert InsufficientEnergyAvailable(_kWh, availableKWh);

        PurchaseCommitment memory commitment = purchaseCommitments[msg.sender];
        if (commitment.timestamp == 0) {
            console.log("1");
            revert CommitmentExpired(0, block.timestamp);
        }
        if (block.timestamp > commitment.timestamp + COMMIT_REVEAL_WINDOW)
            revert CommitmentExpired(commitment.timestamp, block.timestamp);

        if (
            keccak256(abi.encodePacked(_kWh, _nonce, msg.sender)) !=
            commitment.commitmentHash
        ) {
            console.log("2");
            revert InvalidCommitment();
        }

        uint256 ethPriceUSD = getLatestEthPrice(); // Updates cache if Chainlink valid, falls back to cache if down
        uint256 totalCostUSDCents = _kWh * PRICE_PER_KWH_USD_CENTS;
        if (totalCostUSDCents > 2 ** 128) revert("Cost overflow");
        uint256 totalCostWei = calculateRequiredPayment(
            _kWh,
            cachedEthPrice / 10 ** 10
        );
        if (totalCostWei == 0 || msg.value < totalCostWei) {
            console.log("3");
            revert PaymentAmountTooSmall(msg.value, totalCostWei);
        }

        availableKWh -= _kWh;

        if (msg.value > totalCostWei)
            pendingRefunds[msg.sender] += msg.value - totalCostWei;
        delete purchaseCommitments[msg.sender];
        transactions[transactionCount] = Transaction({
            buyer: msg.sender,
            seller: solarFarm,
            kWh: _kWh,
            pricePerKWhUSD: PRICE_PER_KWH_USD_CENTS,
            ethPriceUSD: ethPriceUSD,
            timestamp: block.timestamp
        });
        transactionCount++;

        (bool sent, ) = payable(paymentReceiver).call{
            value: totalCostWei,
            gas: MAX_GAS_FOR_CALL
        }("");
        if (!sent) {
            console.log("4");
            revert PaymentFailed();
        }
        emit EnergyPurchased(
            msg.sender,
            solarFarm,
            _kWh,
            totalCostWei,
            ethPriceUSD,
            block.timestamp
        );
    }

    function withdrawRefunds() external whenNotPaused nonReentrant {
        //console.log("EnergyContract: withdrawRefunds called by:", msg.sender);
        uint256 amount = pendingRefunds[msg.sender];
        if (amount == 0) {
            // console.log("EnergyContract: NoRefundsAvailable for:", msg.sender);
            revert NoRefundsAvailable();
        }
        pendingRefunds[msg.sender] = 0;
        // console.log("Sending refund of", amount, "to", msg.sender);

        (bool sent, ) = payable(msg.sender).call{
            value: amount,
            gas: MAX_GAS_FOR_CALL
        }("");
        if (!sent) {
            // console.log(
            //     "EnergyContract: PaymentFailed sending to:",
            //     msg.sender
            // );
            revert PaymentFailed();
        }
        // console.log(
        //     "EnergyContract: RefundWithdrawn for:",
        //     msg.sender,
        //     "amount:",
        //     amount
        // );
        emit RefundWithdrawn(msg.sender, amount, block.timestamp);
    }

    // Clears expired purchase commitments
    function clearExpiredCommitment(address _buyer) external {
        if (_buyer == address(0)) revert InvalidPartyAddress();
        PurchaseCommitment memory commitment = purchaseCommitments[_buyer];
        if (commitment.timestamp == 0)
            revert CommitmentExpired(0, block.timestamp);
        if (block.timestamp <= commitment.timestamp + COMMIT_REVEAL_WINDOW)
            revert("Commitment not expired");
        delete purchaseCommitments[_buyer];
        emit CommitmentCleared(_buyer, block.timestamp);
    }

    // Updates the payment receiver address
    function updatePaymentReceiver(address _newReceiver) external onlyOwner {
        if (_newReceiver == address(0)) revert InvalidPartyAddress();
        // Prevent setting paymentReceiver to a contract
        uint256 size;
        assembly {
            size := extcodesize(_newReceiver)
        }
        if (size > 0) revert InvalidPartyAddress();
        paymentReceiver = _newReceiver;
    }

    // Retrieves a transaction by ID
    function getTransaction(
        uint256 _id
    ) external view returns (Transaction memory) {
        if (_id >= transactionCount) revert InvalidTransactionID();
        return transactions[_id];
    }

    // Returns the total number of transactions
    function getTransactionsCount() external view returns (uint256) {
        return transactionCount;
    }

    function getPriceLatestUpdate() external view returns (uint256 time) {
        // Returns the last updated timestamp of the price feed
        return priceLastUpdated;
    }

    function getLatestEthPrice() public returns (uint256) {
        // Try Chainlink first
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        // Check if Chainlink data is valid
        bool isChainlinkValid = true;
        if (price <= 0) {
            isChainlinkValid = false; // Invalid price
        } else if (updatedAt <= block.timestamp - STALENESS_THRESHOLD) {
            isChainlinkValid = false; // Stale data
        } else if (answeredInRound < roundId) {
            isChainlinkValid = false; // Incomplete round
        } else if (price < 100 * 10 ** 8 || price > 10000 * 10 ** 8) {
            isChainlinkValid = false; // Out-of-bounds price
            revert InvalidPriceBounds();
        }

        if (isChainlinkValid) {
            // Valid Chainlink data: update cache and return price
            uint256 adjustedPrice = uint256(price) * 10 ** 10;
            cachedEthPrice = adjustedPrice;
            priceLastUpdated = block.timestamp;
            emit PriceCacheUpdated(adjustedPrice, block.timestamp);
            return adjustedPrice;
        } else {
            // Chainlink down: check if cached value is stale
            if (block.timestamp > priceLastUpdated + STALENESS_THRESHOLD) {
                revert PriceFeedStale(priceLastUpdated, STALENESS_THRESHOLD);
            }
            // Return cached value if available
            if (cachedEthPrice != 0) {
                return cachedEthPrice;
            }
            // No valid cache: revert
            revert InvalidEthPrice();
        }
    }

    function bytes32ToString(
        bytes32 _bytes32
    ) internal pure returns (string memory) {
        // Initialize a string with 66 characters: "0x" + 64 hex digits
        bytes memory hexString = new bytes(66);

        // Set "0x" prefix
        hexString[0] = "0";
        hexString[1] = "x";

        // Convert each byte to two hex digits
        bytes memory hexChars = "0123456789abcdef";
        for (uint256 i = 0; i < 32; i++) {
            // Get high nibble (4 bits)
            uint8 highNibble = uint8(_bytes32[i] >> 4);
            // Get low nibble
            uint8 lowNibble = uint8(_bytes32[i] & 0x0f);
            // Map to hex characters
            hexString[2 + i * 2] = hexChars[highNibble];
            hexString[3 + i * 2] = hexChars[lowNibble];
        }

        return string(hexString);
    }

    // Pauses the contract
    function pause() external onlyOwner {
        _pause();
    }

    // Unpauses the contract
    function unpause() external onlyOwner {
        _unpause();
    }
}
