// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

contract EnergyContract is Ownable, Pausable, ReentrancyGuard {
    AggregatorV3Interface internal priceFeed;
    address public solarFarm;
    address public paymentReceiver;
    uint256 public availableKWh;
    uint256 public constant PRICE_PER_KWH_USD_CENTS = 12;
    uint256 public constant MAX_KWH_PER_PURCHASE = 1000;
    uint256 public constant STALENESS_THRESHOLD = 15 minutes;
    uint256 public constant ADD_ENERGY_DELAY = 2 minutes;
    uint256 public constant COMMIT_REVEAL_WINDOW = 5 minutes;
    uint256 public constant COMMIT_COOLDOWN = 0.5 minutes;
    uint256 public constant MAX_AUTHORIZED_PARTIES = 100;
    uint256 public constant MAX_GAS_FOR_CALL = 5_000_000;
    uint256 public lastChainlinkFailure;
    uint256 private cachedEthPrice;
    uint256 private priceLastUpdated;
    // NEW: Store the last updatedAt timestamp from Chainlink
    uint256 private lastChainlinkUpdate;

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
        address buyer;
        address seller;
        uint256 kWh;
        uint256 pricePerKWhUSD;
        uint256 ethPriceUSD;
        uint256 timestamp;
    }

    struct PurchaseCommitment {
        bytes32 commitmentHash;
        uint256 timestamp;
    }

    mapping(address => bool) public authorizedParties;
    mapping(address => PurchaseCommitment) public purchaseCommitments;
    mapping(address => uint256) public lastCommitTime;
    mapping(address => uint256) public pendingRefunds;
    mapping(address => uint256) public lastAddEnergyRequest;
    mapping(uint256 => Transaction) public transactions;
    uint256 public transactionCount;
    uint256 public authorizedPartyCount;
    address[] private authorizedPartyList;

    event EnergyAddRequested(address indexed seller, uint256 indexed kWh, uint256 timestamp);
    event EnergyAdded(address indexed seller, uint256 indexed kWh, uint256 timestamp);
    event EnergyPurchaseCommitted(address indexed buyer, bytes32 commitmentHash, uint256 timestamp);
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
    event AuthorizationsBatchRevoked(uint256 startIndex, uint256 endIndex, uint256 timestamp);
    event RefundWithdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event CommitmentCleared(address indexed user, uint256 timestamp);
    event PriceCacheUpdated(uint256 indexed newPrice, uint256 timestamp);
    event PausedDueToChainlinkDowntime(uint256 timestamp);

    modifier onlyAuthorizedParties() {
        if (!authorizedParties[msg.sender]) revert PartyNotAuthorized();
        _;
    }

    constructor(address _priceFeed, address _solarFarm) Ownable(msg.sender) {
        if (_priceFeed == address(0) || _solarFarm == address(0)) revert InvalidPartyAddress();
        priceFeed = AggregatorV3Interface(_priceFeed);

        // Initialize with Chainlink price if valid
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        if (price > 0 && price >= 100 * 10 ** 8 && price <= 10000 * 10 ** 8 && updatedAt > 0) {
            cachedEthPrice = uint256(price) * 10 ** 10;
            priceLastUpdated = block.timestamp;
            lastChainlinkUpdate = updatedAt; // Store Chainlink's update timestamp
            emit PriceCacheUpdated(cachedEthPrice, block.timestamp);
        }

        solarFarm = _solarFarm;
        paymentReceiver = _solarFarm;
        authorizedParties[_solarFarm] = true;
        authorizedPartyList.push(_solarFarm);
        authorizedPartyCount = 1;
        emit Authorized(_solarFarm, block.timestamp);
        transferOwnership(_solarFarm);
    }

    function authorizeParty(address _party) external onlyOwner whenNotPaused {
        if (_party == address(0)) revert InvalidPartyAddress();
        if (authorizedParties[_party]) revert PartyAlreadyAuthorized();
        if (authorizedPartyCount >= MAX_AUTHORIZED_PARTIES) revert MaxAuthorizedPartiesReached();
        authorizedParties[_party] = true;
        authorizedPartyList.push(_party);
        authorizedPartyCount++;
        emit Authorized(_party, block.timestamp);
    }

    function unAuthorizeParty(address _party) external onlyOwner whenNotPaused {
        if (!authorizedParties[_party]) revert PartyNotAuthorized();
        authorizedParties[_party] = false;
        bool found = false;
        for (uint256 i = 0; i < authorizedPartyList.length; i++) {
            if (authorizedPartyList[i] == _party) {
                authorizedPartyList[i] = authorizedPartyList[authorizedPartyList.length - 1];
                authorizedPartyList.pop();
                authorizedPartyCount--;
                found = true;
                break;
            }
        }
        if (!found) revert PartyNotFoundInList();
        emit Unauthorized(_party, block.timestamp);
    }

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

    function revokeAuthorizationsBatch(uint256 startIndex, uint256 batchSize) external onlyOwner {
        if (startIndex >= authorizedPartyList.length || batchSize == 0)
            revert InvalidBatchIndex(startIndex, authorizedPartyList.length);
        uint256 endIndex = startIndex + batchSize;
        if (endIndex > authorizedPartyList.length) endIndex = authorizedPartyList.length;
        uint256 removedCount = 0;
        for (uint256 i = startIndex; i < endIndex; i++) {
            if (authorizedPartyList[i] != solarFarm) {
                authorizedParties[authorizedPartyList[i]] = false;
                authorizedPartyList[i] = address(0);
                removedCount++;
            }
        }
        address[] memory newList = new address[](authorizedPartyList.length - removedCount);
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

    function getAuthorizedPartyList() external view returns (address[] memory) {
        return authorizedPartyList;
    }

    function requestAddEnergy(uint256 _kWh) external onlyOwner whenNotPaused {
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE) revert InsufficientEnergyAvailable(_kWh, MAX_KWH_PER_PURCHASE);
        lastAddEnergyRequest[msg.sender] = block.timestamp;
        emit EnergyAddRequested(solarFarm, _kWh, block.timestamp);
    }

    function checkAuthState(address _party) external view returns (bool isAuthorized) {
        if (_party == address(0)) revert InvalidPartyAddress();
        return authorizedParties[_party];
    }

    function confirmAddEnergy(uint256 _kWh) external onlyOwner whenNotPaused {
        if (lastAddEnergyRequest[msg.sender] == 0) revert NoPendingRequest();
        if (block.timestamp < lastAddEnergyRequest[msg.sender] + ADD_ENERGY_DELAY)
            revert DelayNotElapsed(lastAddEnergyRequest[msg.sender], block.timestamp);
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE) revert InsufficientEnergyAvailable(_kWh, MAX_KWH_PER_PURCHASE);
        availableKWh += _kWh;
        lastAddEnergyRequest[msg.sender] = 0;
        emit EnergyAdded(solarFarm, _kWh, block.timestamp);
    }

    function commitPurchase(bytes32 _commitmentHash) external onlyAuthorizedParties whenNotPaused {
        if (_commitmentHash == bytes32(0)) revert InvalidCommitmentHash();
        if (block.timestamp < lastCommitTime[msg.sender] + COMMIT_COOLDOWN)
            revert CommitmentCooldownActive(lastCommitTime[msg.sender], block.timestamp);
        purchaseCommitments[msg.sender] = PurchaseCommitment({
            commitmentHash: _commitmentHash,
            timestamp: block.timestamp
        });
        lastCommitTime[msg.sender] = block.timestamp;
        emit EnergyPurchaseCommitted(msg.sender, _commitmentHash, block.timestamp);
    }

    function calculateRequiredPayment(uint256 _kWh, uint256 _ethPriceUSD) public pure returns (uint256) {
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE) revert InsufficientEnergyAvailable(_kWh, MAX_KWH_PER_PURCHASE);
        if (_ethPriceUSD < 100 * 10 ** 8 || _ethPriceUSD > 10000 * 10 ** 8) revert InvalidPriceBounds();
        uint256 totalCostUSDCents = _kWh * PRICE_PER_KWH_USD_CENTS;
        if (totalCostUSDCents > 2 ** 128) revert("Cost overflow");
        uint256 ethPriceUSDcents = _ethPriceUSD / 1e6;
        uint256 totalCostWei = (totalCostUSDCents * 1e18) / ethPriceUSDcents;
        return totalCostWei;
    }

    function revealPurchase(
        uint256 _kWh,
        uint256 _nonce
    ) external payable onlyAuthorizedParties whenNotPaused nonReentrant {
        if (_kWh == 0 || _kWh > MAX_KWH_PER_PURCHASE || availableKWh < _kWh)
            revert InsufficientEnergyAvailable(_kWh, availableKWh);
        PurchaseCommitment memory commitment = purchaseCommitments[msg.sender];
        if (commitment.timestamp == 0) revert CommitmentExpired(0, block.timestamp);
        if (block.timestamp > commitment.timestamp + COMMIT_REVEAL_WINDOW)
            revert CommitmentExpired(commitment.timestamp, block.timestamp);
        if (keccak256(abi.encodePacked(_kWh, _nonce, msg.sender)) != commitment.commitmentHash)
            revert InvalidCommitment();
        uint256 ethPriceUSD = getLatestEthPrice();
        uint256 totalCostWei = calculateRequiredPayment(_kWh, cachedEthPrice / 10 ** 10);
        if (totalCostWei == 0 || msg.value < totalCostWei) revert PaymentAmountTooSmall(msg.value, totalCostWei);
        availableKWh -= _kWh;
        if (msg.value > totalCostWei) pendingRefunds[msg.sender] += msg.value - totalCostWei;
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
        (bool sent, ) = payable(paymentReceiver).call{ value: totalCostWei, gas: MAX_GAS_FOR_CALL }("");
        if (!sent) revert PaymentFailed();
        emit EnergyPurchased(msg.sender, solarFarm, _kWh, totalCostWei, ethPriceUSD, block.timestamp);
    }

    function withdrawRefunds() external whenNotPaused nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        if (amount == 0) revert NoRefundsAvailable();
        pendingRefunds[msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{ value: amount, gas: MAX_GAS_FOR_CALL }("");
        if (!sent) revert PaymentFailed();
        emit RefundWithdrawn(msg.sender, amount, block.timestamp);
    }

    function clearExpiredCommitment(address _buyer) external {
        if (_buyer == address(0)) revert InvalidPartyAddress();
        PurchaseCommitment memory commitment = purchaseCommitments[_buyer];
        if (commitment.timestamp == 0) revert CommitmentExpired(0, block.timestamp);
        if (block.timestamp <= commitment.timestamp + COMMIT_REVEAL_WINDOW) revert("Commitment not expired");
        delete purchaseCommitments[_buyer];
        emit CommitmentCleared(_buyer, block.timestamp);
    }

    function updatePaymentReceiver(address _newReceiver) external onlyOwner {
        if (_newReceiver == address(0)) revert InvalidPartyAddress();
        uint256 size;
        assembly {
            size := extcodesize(_newReceiver)
        }
        if (size > 0) revert InvalidPartyAddress();
        paymentReceiver = _newReceiver;
    }

    function getTransaction(uint256 _id) external view returns (Transaction memory) {
        if (_id >= transactionCount) revert InvalidTransactionID();
        return transactions[_id];
    }

    function getTransactionsCount() external view returns (uint256) {
        return transactionCount;
    }

    function getPriceLatestUpdate() external view returns (uint256 time) {
        return priceLastUpdated;
    }

    // FIXED: Return cached price if available and not stale
    function getLatestEthPriceWithoutCaching() public view returns (uint256) {
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();

        bool isChainlinkValid = true;
        if (price <= 0) {
            isChainlinkValid = false;
        } else if (answeredInRound < roundId) {
            isChainlinkValid = false;
        } else if (price < 100 * 10 ** 8 || price > 10000 * 10 ** 8) {
            isChainlinkValid = false;
        }

        if (isChainlinkValid) {
            return uint256(price) * 10 ** 10;
        } else {
            // If Chainlink is invalid/stale, check if we have a valid cached price
            if (cachedEthPrice > 0 && priceLastUpdated > 0) {
                // Only revert if cached price is also stale
                return cachedEthPrice;
            } else {
                revert PriceFeedStale(updatedAt, STALENESS_THRESHOLD);
            }
        }
    }

    // FIXED: Proper caching logic - only update if Chainlink data changed
    function getLatestEthPrice() public returns (uint256) {
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();

        bool isChainlinkValid = true;
        if (price <= 0) {
            isChainlinkValid = false;
        } else if (updatedAt <= block.timestamp - STALENESS_THRESHOLD) {
            isChainlinkValid = false;
        } else if (answeredInRound < roundId) {
            isChainlinkValid = false;
        } else if (price < 100 * 10 ** 8 || price > 10000 * 10 ** 8) {
            isChainlinkValid = false;
        }

        if (isChainlinkValid) {
            uint256 adjustedPrice = uint256(price) * 10 ** 10;

            // FIXED: Only update cache if the Chainlink data actually changed
            if (updatedAt > lastChainlinkUpdate) {
                cachedEthPrice = adjustedPrice;
                priceLastUpdated = block.timestamp;
                lastChainlinkUpdate = updatedAt;
                emit PriceCacheUpdated(adjustedPrice, block.timestamp);
            }

            return adjustedPrice;
        } else {
            // If Chainlink is invalid/stale, check if we have a valid cached price
            if (cachedEthPrice > 0 && priceLastUpdated > 0) {
                // Only revert if cached price is also stale
                if (block.timestamp > priceLastUpdated + STALENESS_THRESHOLD) {
                    revert PriceFeedStale(priceLastUpdated, STALENESS_THRESHOLD);
                }
                return cachedEthPrice;
            } else {
                revert InvalidEthPrice();
            }
        }
    }

    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        bytes memory hexString = new bytes(66);
        hexString[0] = "0";
        hexString[1] = "x";
        bytes memory hexChars = "0123456789abcdef";
        for (uint256 i = 0; i < 32; i++) {
            uint8 highNibble = uint8(_bytes32[i] >> 4);
            uint8 lowNibble = uint8(_bytes32[i] & 0x0f);
            hexString[2 + i * 2] = hexChars[highNibble];
            hexString[3 + i * 2] = hexChars[lowNibble];
        }
        return string(hexString);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
