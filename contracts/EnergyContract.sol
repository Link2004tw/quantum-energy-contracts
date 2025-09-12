// SPDX-License-Identifier: MIT
// Prompt: Fix TypeError in EnergyContract.sol by removing invalid try/catch blocks around Address.sendValue calls in revealPurchase, withdrawRefunds, and withdrawFunds, as try/catch can only be used with external function calls or contract creation calls.

pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

// Interface for the Uranium Price Consumer contract
interface IUraniumPriceConsumer {
    function lastPrice() external view returns (uint256);

    function requestUraniumPrice(
        uint64 subscriptionId,
        bytes32 donID
    ) external returns (bytes32 requestId);
}

contract EnergyContract is Ownable, Pausable, ReentrancyGuard {
    using Address for address payable; // For safer ETH transfers

    AggregatorV3Interface internal priceFeed;
    IUraniumPriceConsumer public uraniumPriceConsumer;

    address public solarFarm;
    address payable public paymentReceiver;
    uint256 public availableUraniumPounds;

    uint256 public uraniumPriceUSDCents;
    uint256 public uraniumPriceLastUpdated;
    uint256 public fallbackPricePerPoundUSDCents = 1200;
    uint64 public uraniumSubscriptionId;
    bytes32 public uraniumDonID;

    uint256 public constant MAX_URANIUM_POUNDS_PER_PURCHASE = 100;
    uint256 public constant STALENESS_THRESHOLD = 15 minutes;
    uint256 public constant URANIUM_PRICE_STALENESS = 1 hours;
    uint256 public constant ADD_ENERGY_DELAY = 2 minutes;
    uint256 public constant COMMIT_REVEAL_WINDOW = 5 minutes;
    uint256 public constant COMMIT_COOLDOWN = 5 minutes;
    uint256 public constant MAX_AUTHORIZED_PARTIES = 100;
    uint256 public constant MAX_GAS_FOR_CALL = 5_000_000;

    uint256 public constant URANIUM_TO_ENERGY_MULTIPLIER = 1;
    uint256 public constant MIN_PRICE_PER_POUND_CENTS = 500;
    uint256 public constant MAX_PRICE_PER_POUND_CENTS = 50000;

    uint256 public lastChainlinkFailure;
    uint256 private cachedEthPrice;
    uint256 private priceLastUpdated;
    address payable private testingAddress;
    uint256 private lastChainlinkUpdate;

    error InsufficientUraniumAvailable(uint256 requested, uint256 available);
    error PaymentAmountTooSmall(uint256 provided, uint256 required);
    error PriceFeedStale(uint256 lastUpdate, uint256 threshold);
    error UraniumPriceStale(uint256 lastUpdate, uint256 threshold);
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
    error UraniumPriceConsumerNotSet();

    struct Transaction {
        address buyer;
        address seller;
        uint256 uraniumPounds;
        uint256 pricePerPoundUSD;
        uint256 ethPriceUSD;
        uint256 uraniumPriceUSD;
        uint256 timestamp;
        uint256 cost;
    }

    struct PurchaseCommitment {
        bytes32 commitmentHash;
        uint256 timestamp;
    }

    mapping(address => bool) public authorizedParties;
    mapping(address => PurchaseCommitment) public purchaseCommitments;
    mapping(address => uint256) public lastCommitTime;
    mapping(address => uint256) public pendingRefunds;
    mapping(address => uint256) public lastAddUraniumRequest;
    mapping(uint256 => Transaction) public transactions;
    uint256 public transactionCount;
    uint256 public authorizedPartyCount;
    address[] private authorizedPartyList;

    event FundsWithdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event UraniumAddRequested(
        address indexed seller,
        uint256 indexed uraniumPounds,
        uint256 timestamp
    );
    event UraniumAdded(
        address indexed seller,
        uint256 indexed uraniumPounds,
        uint256 timestamp
    );
    event UraniumPurchaseCommitted(
        address indexed buyer,
        bytes32 commitmentHash,
        uint256 timestamp
    );
    event UraniumPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed uraniumPounds,
        uint256 totalCostWei,
        uint256 ethPriceUSD,
        uint256 uraniumPriceUSD,
        uint256 pricePerPoundCents,
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
    event PriceCacheUpdated(uint256 indexed newPrice, uint256 timestamp);
    event UraniumPriceUpdated(uint256 indexed newPrice, uint256 timestamp);
    event UraniumPriceRequested(bytes32 indexed requestId, uint256 timestamp);
    event PausedDueToChainlinkDowntime(uint256 timestamp);
    event FallbackPriceUsed(uint256 fallbackPrice, uint256 timestamp);

    modifier onlyAuthorizedParties() {
        if (!authorizedParties[msg.sender]) revert PartyNotAuthorized();
        _;
    }

    constructor(
        address _priceFeed,
        address _solarFarm,
        address payable _testingAddress,
        address _uraniumPriceConsumer,
        uint64 _uraniumSubscriptionId,
        bytes32 _uraniumDonID
    ) Ownable(msg.sender) {
        if (
            _priceFeed == address(0) ||
            _solarFarm == address(0) ||
            _testingAddress == address(0) ||
            _uraniumPriceConsumer == address(0)
        ) revert InvalidPartyAddress();

        priceFeed = AggregatorV3Interface(_priceFeed);
        uraniumPriceConsumer = IUraniumPriceConsumer(_uraniumPriceConsumer);
        uraniumSubscriptionId = _uraniumSubscriptionId;
        uraniumDonID = _uraniumDonID;
        testingAddress = _testingAddress;

        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        if (
            price > 0 &&
            price >= 100 * 10 ** 8 &&
            price <= 10000 * 10 ** 8 &&
            updatedAt > 0
        ) {
            cachedEthPrice = uint256(price) * 10 ** 10;
            priceLastUpdated = block.timestamp;
            lastChainlinkUpdate = updatedAt;
            emit PriceCacheUpdated(cachedEthPrice, block.timestamp);
        }

        uint256 currentUraniumPrice = uraniumPriceConsumer.lastPrice();
        if (currentUraniumPrice > 0) {
            uraniumPriceUSDCents = currentUraniumPrice;
            uraniumPriceLastUpdated = block.timestamp;
            emit UraniumPriceUpdated(currentUraniumPrice, block.timestamp);
        }

        solarFarm = _solarFarm;
        paymentReceiver = payable(_solarFarm);
        authorizedParties[_solarFarm] = true;
        authorizedParties[testingAddress] = true;
        authorizedPartyList.push(_solarFarm);
        authorizedPartyList.push(testingAddress);
        authorizedPartyCount = 2;
        emit Authorized(_solarFarm, block.timestamp);
        emit Authorized(testingAddress, block.timestamp);
        transferOwnership(_solarFarm);
    }

    function requestUraniumPriceUpdate() external onlyOwner whenNotPaused {
        if (address(uraniumPriceConsumer) == address(0))
            revert UraniumPriceConsumerNotSet();
        bytes32 requestId = uraniumPriceConsumer.requestUraniumPrice(
            uraniumSubscriptionId,
            uraniumDonID
        );
        emit UraniumPriceRequested(requestId, block.timestamp);
    }

    function updateUraniumPrice() external whenNotPaused {
        uint256 newPrice = uraniumPriceConsumer.lastPrice();
        if (newPrice > 0 && newPrice != uraniumPriceUSDCents) {
            uraniumPriceUSDCents = newPrice;
            uraniumPriceLastUpdated = block.timestamp;
            emit UraniumPriceUpdated(newPrice, block.timestamp);
        }
    }

    function calculateUraniumPricePerPound()
        public
        view
        returns (uint256 pricePerPoundCents)
    {
        if (
            uraniumPriceUSDCents == 0 ||
            block.timestamp > uraniumPriceLastUpdated + URANIUM_PRICE_STALENESS
        ) {
            return fallbackPricePerPoundUSDCents;
        }

        pricePerPoundCents = uraniumPriceUSDCents;

        if (pricePerPoundCents < MIN_PRICE_PER_POUND_CENTS) {
            pricePerPoundCents = MIN_PRICE_PER_POUND_CENTS;
        } else if (pricePerPoundCents > MAX_PRICE_PER_POUND_CENTS) {
            pricePerPoundCents = MAX_PRICE_PER_POUND_CENTS;
        }

        return pricePerPoundCents;
    }

    function getUraniumPriceInfo()
        external
        view
        returns (
            uint256 price,
            uint256 lastUpdated,
            bool isStale,
            uint256 calculatedUraniumPrice
        )
    {
        price = uraniumPriceUSDCents;
        lastUpdated = uraniumPriceLastUpdated;
        isStale =
            block.timestamp > uraniumPriceLastUpdated + URANIUM_PRICE_STALENESS;
        calculatedUraniumPrice = calculateUraniumPricePerPound();
    }

    function setFallbackPrice(uint256 _fallbackPriceCents) external onlyOwner {
        require(
            _fallbackPriceCents >= MIN_PRICE_PER_POUND_CENTS &&
                _fallbackPriceCents <= MAX_PRICE_PER_POUND_CENTS,
            "Invalid fallback price"
        );
        fallbackPricePerPoundUSDCents = _fallbackPriceCents;
    }

    function setUraniumPriceConsumer(
        address _uraniumPriceConsumer,
        uint64 _subscriptionId,
        bytes32 _donID
    ) external onlyOwner {
        if (_uraniumPriceConsumer == address(0)) revert InvalidPartyAddress();
        uraniumPriceConsumer = IUraniumPriceConsumer(_uraniumPriceConsumer);
        uraniumSubscriptionId = _subscriptionId;
        uraniumDonID = _donID;
    }

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

    function getAuthorizedPartyList() external view returns (address[] memory) {
        return authorizedPartyList;
    }

    function requestAddUranium(
        uint256 _uraniumPounds
    ) external onlyOwner whenNotPaused {
        if (
            _uraniumPounds == 0 ||
            _uraniumPounds > MAX_URANIUM_POUNDS_PER_PURCHASE
        )
            revert InsufficientUraniumAvailable(
                _uraniumPounds,
                MAX_URANIUM_POUNDS_PER_PURCHASE
            );
        lastAddUraniumRequest[msg.sender] = block.timestamp;
        emit UraniumAddRequested(solarFarm, _uraniumPounds, block.timestamp);
    }

    function checkAuthState(
        address _party
    ) external view returns (bool isAuthorized) {
        if (_party == address(0)) revert InvalidPartyAddress();
        return authorizedParties[_party];
    }

    function confirmAddUranium(
        uint256 _uraniumPounds
    ) external onlyOwner whenNotPaused {
        if (lastAddUraniumRequest[msg.sender] == 0) revert NoPendingRequest();
        if (
            block.timestamp <
            lastAddUraniumRequest[msg.sender] + ADD_ENERGY_DELAY
        )
            revert DelayNotElapsed(
                lastAddUraniumRequest[msg.sender],
                block.timestamp
            );
        if (
            _uraniumPounds == 0 ||
            _uraniumPounds > MAX_URANIUM_POUNDS_PER_PURCHASE
        )
            revert InsufficientUraniumAvailable(
                _uraniumPounds,
                MAX_URANIUM_POUNDS_PER_PURCHASE
            );
        availableUraniumPounds += _uraniumPounds;
        lastAddUraniumRequest[msg.sender] = 0;
        emit UraniumAdded(solarFarm, _uraniumPounds, block.timestamp);
    }

    function commitPurchase(
        bytes32 _commitmentHash
    ) external onlyAuthorizedParties whenNotPaused {
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
        emit UraniumPurchaseCommitted(
            msg.sender,
            _commitmentHash,
            block.timestamp
        );
    }

    function calculateRequiredPayment(
        uint256 _uraniumPounds,
        uint256 _ethPriceUSD
    ) public view returns (uint256) {
        if (
            _uraniumPounds == 0 ||
            _uraniumPounds > MAX_URANIUM_POUNDS_PER_PURCHASE
        )
            revert InsufficientUraniumAvailable(
                _uraniumPounds,
                MAX_URANIUM_POUNDS_PER_PURCHASE
            );
        if (_ethPriceUSD < 100 * 10 ** 8 || _ethPriceUSD > 10000 * 10 ** 8)
            revert InvalidPriceBounds();

        uint256 pricePerPoundCents = calculateUraniumPricePerPound();
        uint256 totalCostUSDCents = _uraniumPounds * pricePerPoundCents;
        if (totalCostUSDCents > 2 ** 128) revert("Cost overflow");

        uint256 ethPriceUSDcents = _ethPriceUSD / 1e6;
        uint256 totalCostWei = (totalCostUSDCents * 1e18) / ethPriceUSDcents;
        return totalCostWei;
    }

    // Removed try/catch block around sendValue as it’s invalid for library functions
    function revealPurchase(
        uint256 _uraniumPounds,
        uint256 _nonce,
        bytes32 _secret
    ) external payable onlyAuthorizedParties whenNotPaused nonReentrant {
        if (
            _uraniumPounds == 0 ||
            _uraniumPounds > MAX_URANIUM_POUNDS_PER_PURCHASE ||
            availableUraniumPounds < _uraniumPounds
        )
            revert InsufficientUraniumAvailable(
                _uraniumPounds,
                availableUraniumPounds
            );
        bytes32 commitmentHash = keccak256(
            abi.encodePacked(
                msg.sender,
                _uraniumPounds,
                _nonce,
                block.timestamp,
                _secret
            )
        );
        if (msg.sender != testingAddress) {
            PurchaseCommitment memory commitment = purchaseCommitments[
                msg.sender
            ];
            if (commitment.timestamp == 0)
                revert CommitmentExpired(0, block.timestamp);
            if (block.timestamp > commitment.timestamp + COMMIT_REVEAL_WINDOW)
                revert CommitmentExpired(commitment.timestamp, block.timestamp);
            if (commitmentHash != commitment.commitmentHash)
                revert InvalidCommitment();
        }

        uint256 ethPriceUSD = getLatestEthPrice();
        uint256 currentUraniumPrice = uraniumPriceUSDCents;
        uint256 pricePerPoundCents = calculateUraniumPricePerPound();
        uint256 totalCostWei = calculateRequiredPayment(
            _uraniumPounds,
            ethPriceUSD / 1e10
        );

        if (totalCostWei == 0 || msg.value < totalCostWei)
            revert PaymentAmountTooSmall(msg.value, totalCostWei);

        availableUraniumPounds -= _uraniumPounds;
        if (msg.value > totalCostWei)
            pendingRefunds[msg.sender] += msg.value - totalCostWei;
        delete purchaseCommitments[msg.sender];

        transactions[transactionCount] = Transaction({
            buyer: msg.sender,
            seller: solarFarm,
            uraniumPounds: _uraniumPounds,
            pricePerPoundUSD: pricePerPoundCents,
            ethPriceUSD: ethPriceUSD,
            uraniumPriceUSD: currentUraniumPrice,
            timestamp: block.timestamp,
            cost: totalCostWei
        });
        transactionCount++;

        console.log("cost: %d", totalCostWei);
        console.log("pounds: %d", _uraniumPounds);
        console.log("uranium price: %d", currentUraniumPrice);
        console.log("price per pound: %d", pricePerPoundCents);

        // Replaced try/catch with direct sendValue call, which reverts on failure
        payable(paymentReceiver).sendValue(totalCostWei);

        emit UraniumPurchased(
            msg.sender,
            solarFarm,
            _uraniumPounds,
            totalCostWei,
            ethPriceUSD,
            currentUraniumPrice,
            pricePerPoundCents,
            block.timestamp
        );
    }

    // Removed try/catch block around sendValue as it’s invalid for library functions
    function withdrawRefunds() external whenNotPaused nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        if (amount == 0) revert NoRefundsAvailable();
        pendingRefunds[msg.sender] = 0;
        // Replaced try/catch with direct sendValue call, which reverts on failure
        payable(msg.sender).sendValue(amount);
        emit RefundWithdrawn(msg.sender, amount, block.timestamp);
    }

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

    function updatePaymentReceiver(
        address payable _newReceiver
    ) external onlyOwner {
        if (_newReceiver == address(0)) revert InvalidPartyAddress();
        paymentReceiver = _newReceiver;
    }

    function getTransaction(
        uint256 _id
    ) external view returns (Transaction memory) {
        if (_id >= transactionCount) revert InvalidTransactionID();
        return transactions[_id];
    }

    function getTransactionsCount() external view returns (uint256) {
        return transactionCount;
    }

    function getPriceLatestUpdate() external view returns (uint256 time) {
        return priceLastUpdated;
    }

    function getLatestEthPriceWithoutCaching() public view returns (uint256) {
        (uint80 roundId, int256 price, , , uint80 answeredInRound) = priceFeed
            .latestRoundData();

        bool isChainlinkValid = true;
        if (price <= 0) {
            isChainlinkValid = false;
        } else if (answeredInRound < roundId) {
            isChainlinkValid = false;
        } else if (price < 100 * 10 ** 8 || price > 10000 * 10 ** 8) {
            isChainlinkValid = false;
        }

        if (isChainlinkValid) {
            uint256 adjustedPrice = uint256(price) * 10 ** 10;
            return adjustedPrice;
        } else {
            if (cachedEthPrice > 0 && priceLastUpdated > 0) {
                return cachedEthPrice;
            } else {
                revert InvalidEthPrice();
            }
        }
    }

    // Removed try/catch block around sendValue as it’s invalid for library functions
    function withdrawFunds(
        address payable _to,
        uint256 _amount
    ) external onlyOwner nonReentrant {
        if (_to == address(0)) revert InvalidPartyAddress();
        if (_amount == 0 || _amount > address(this).balance)
            revert PaymentAmountTooSmall(_amount, address(this).balance);
        // Replaced try/catch with direct sendValue call, which reverts on failure
        _to.sendValue(_amount);
        emit FundsWithdrawn(_to, _amount, block.timestamp);
    }

    function getLatestEthPrice() public returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        bool isChainlinkValid = true;
        if (price <= 0) {
            isChainlinkValid = false;
        } else if (answeredInRound < roundId) {
            isChainlinkValid = false;
        } else if (price < 100 * 10 ** 8 || price > 10000 * 10 ** 8) {
            isChainlinkValid = false;
        }

        if (isChainlinkValid) {
            uint256 adjustedPrice = uint256(price) * 10 ** 10;

            if (updatedAt > lastChainlinkUpdate) {
                cachedEthPrice = adjustedPrice;
                priceLastUpdated = block.timestamp;
                lastChainlinkUpdate = updatedAt;
                emit PriceCacheUpdated(adjustedPrice, block.timestamp);
            }

            return adjustedPrice;
        } else {
            if (cachedEthPrice > 0 && priceLastUpdated > 0) {
                if (block.timestamp > priceLastUpdated + STALENESS_THRESHOLD) {
                    revert PriceFeedStale(
                        priceLastUpdated,
                        STALENESS_THRESHOLD
                    );
                }
                return cachedEthPrice;
            } else {
                revert InvalidEthPrice();
            }
        }
    }

    function bytes32ToString(
        bytes32 _bytes32
    ) internal pure returns (string memory) {
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
