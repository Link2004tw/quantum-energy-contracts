# EnergyContract API Documentation

This document provides detailed API documentation for all public functions in the `EnergyContract` smart contract. Each function is described with its purpose, use cases, parameters, return values, error conditions, gas cost estimates, and usage examples. The contract facilitates uranium purchases using a commit-reveal mechanism, integrating Chainlink for ETH/USD pricing and a custom oracle for uranium prices.

## authorizeParty

### Purpose and Use Cases

Authorizes a new address to purchase uranium from the contract. Used by the contract owner (solar farm) to grant access to trusted buyers, enabling them to call `commitPurchase` and `revealPurchase`.

### Parameters

- `_party` (`address`): The address to be authorized.

### Error Conditions

- `InvalidPartyAddress`: If `_party` is the zero address.
- `PartyAlreadyAuthorized`: If `_party` is already authorized.
- `MaxAuthorizedPartiesReached`: If the number of authorized parties reaches `MAX_AUTHORIZED_PARTIES` (100).
- Reverts if called by a non-owner or when the contract is paused.

### Gas Cost Estimates

- ~~40,000–50,000 gas: Includes storage writes to `authorizedParties` mapping (~~20,000 gas) and `authorizedPartyList` array push (~~20,000 gas), plus event emission (~~5,000 gas).

### Usage Example

```solidity
// Authorize a new buyer
address buyer = 0x1234567890123456789012345678901234567890;
EnergyContract contract = EnergyContract(0xContractAddress);
contract.authorizeParty(buyer);
```

## unAuthorizeParty

### Purpose and Use Cases

Removes authorization from a previously authorized address, preventing it from purchasing uranium. Used by the owner to revoke access from untrusted or inactive buyers.

### Parameters

- `_party` (`address`): The address to be unauthorized.

### Error Conditions

- `PartyNotAuthorized`: If `_party` is not authorized.
- `PartyNotFoundInList`: If `_party` is not found in `authorizedPartyList` (indicates a logic error).
- Reverts if called by a non-owner or when paused.

### Gas Cost Estimates

- ~~30,000–40,000 gas: Includes storage update (~~20,000 gas), array restructuring (~~10,000 gas), and event emission (~~5,000 gas).

### Usage Example

```solidity
// Revoke authorization from a buyer
address buyer = 0x1234567890123456789012345678901234567890;
EnergyContract contract = EnergyContract(0xContractAddress);
contract.unAuthorizeParty(buyer);
```

## revokeAllAuthorizations

### Purpose and Use Cases

Revokes authorization for all parties except the solar farm, resetting the authorized parties list. Used in emergency scenarios or to reset the contract's authorization state.

### Error Conditions

- Reverts if called by a non-owner.

### Gas Cost Estimates

- ~10,000 gas per authorized party + ~20,000 gas for array reset: For 100 parties, ~1,020,000 gas.

### Usage Example

```solidity
// Revoke all authorizations
EnergyContract contract = EnergyContract(0xContractAddress);
contract.revokeAllAuthorizations();
```

## revokeAuthorizationsBatch

### Purpose and Use Cases

Revokes authorizations for a batch of parties in a specified index range of `authorizedPartyList`. Used to efficiently manage large numbers of revocations, reducing gas costs compared to individual calls.

### Parameters

- `startIndex` (`uint256`): Starting index in `authorizedPartyList`.
- `batchSize` (`uint256`): Number of parties to process.

### Error Conditions

- `InvalidBatchIndex`: If `startIndex` is out of bounds or `batchSize` is zero.
- Reverts if called by a non-owner or when paused.

### Gas Cost Estimates

- ~20,000 gas per revocation + ~20,000 gas for array restructuring: For a batch of 10, ~220,000 gas.

### Usage Example

```solidity
// Revoke authorizations for 10 parties starting at index 5
EnergyContract contract = EnergyContract(0xContractAddress);
contract.revokeAuthorizationsBatch(5, 10);
```

## getAuthorizedPartyList

### Purpose and Use Cases

Returns the list of authorized parties. Used by external applications or users to inspect authorized buyers.

### Return Values

- `address[] memory`: Array of authorized party addresses.

### Gas Cost Estimates

- ~5,000–10,000 gas: Depends on the size of `authorizedPartyList` and memory allocation for the return array.

### Usage Example

```solidity
// Get the list of authorized parties
EnergyContract contract = EnergyContract(0xContractAddress);
address[] memory parties = contract.getAuthorizedPartyList();
```

## requestAddUranium

### Purpose and Use Cases

Initiates a request to add uranium (in pounds) to the contract's available pool. Used by the owner to signal intent to increase `availableUraniumPounds`, with a delay for confirmation.

### Parameters

- `_uraniumPounds` (`uint256`): Amount of uranium to add (in pounds).

### Error Conditions

- `InsufficientUraniumAvailable`: If `_uraniumPounds` is zero or exceeds `MAX_URANIUM_POUNDS_PER_PURCHASE` (100).
- Reverts if called by a non-owner or when paused.

### Gas Cost Estimates

- ~~20,000–30,000 gas: Includes storage write to `lastAddUraniumRequest` (~~20,000 gas) and event emission (~5,000 gas).

### Usage Example

```solidity
// Request to add 50 pounds of uranium
EnergyContract contract = EnergyContract(0xContractAddress);
contract.requestAddUranium(50);
```

## confirmAddUranium

### Purpose and Use Cases

Confirms a previous uranium addition request after a delay (`ADD_ENERGY_DELAY = 2 minutes`). Updates `availableUraniumPounds` and clears the request.

### Parameters

- `_uraniumPounds` (`uint256`): Amount of uranium to confirm (in pounds).

### Error Conditions

- `NoPendingRequest`: If no prior request exists for the caller.
- `DelayNotElapsed`: If `ADD_ENERGY_DELAY` has not passed since the request.
- `InsufficientUraniumAvailable`: If `_uraniumPounds` is zero or exceeds `MAX_URANIUM_POUNDS_PER_PURCHASE`.
- Reverts if called by a non-owner or when paused.

### Gas Cost Estimates

- ~~30,000–40,000 gas: Includes storage updates to `availableUraniumPounds` and `lastAddUraniumRequest` (~~20,000 gas) and event emission (~5,000 gas).

### Usage Example

```solidity
// Confirm adding 50 pounds of uranium after delay
EnergyContract contract = EnergyContract(0xContractAddress);
contract.confirmAddUranium(50);
```

## commitPurchase

### Purpose and Use Cases

Commits to a uranium purchase by submitting a hashed commitment of purchase details (pounds, nonce, and secret). Used by authorized buyers to initiate a purchase while preventing front-running.

### Parameters

- `_commitmentHash` (`bytes32`): Hash of pounds, nonce, secret, and buyer's address (`keccak256(abi.encodePacked(msg.sender, _uraniumPounds, _nonce, _secret))`).

### Error Conditions

- `InvalidCommitmentHash`: If `_commitmentHash` is zero.
- `CommitmentCooldownActive`: If `COMMIT_COOLDOWN` (5 minutes) has not elapsed since the last commitment.
- Reverts if called by an unauthorized party or when paused.

### Gas Cost Estimates

- ~~30,000–40,000 gas: Includes storage writes to `purchaseCommitments` and `lastCommitTime` (~~20,000 gas) and event emission (~5,000 gas).

### Usage Example

```solidity
// Commit to a purchase
uint256 pounds = 50;
uint256 nonce = 12345;
bytes32 secret = bytes32(uint256(42));
bytes32 commitment = keccak256(abi.encodePacked(msg.sender, pounds, nonce, secret));
EnergyContract contract = EnergyContract(0xContractAddress);
contract.commitPurchase(commitment);
```

## calculateRequiredPayment

### Purpose and Use Cases

Calculates the required ETH payment (in Wei) for a given uranium amount based on the ETH/USD price and uranium price (USD cents per pound). Used off-chain to estimate payment or on-chain for validation.

### Parameters

- `_uraniumPounds` (`uint256`): Amount of uranium to purchase (in pounds).
- `_ethPriceUSD` (`uint256`): ETH/USD price (in USD with 8 decimals).

### Return Values

- `uint256`: Required payment in Wei.

### Error Conditions

- `InsufficientUraniumAvailable`: If `_uraniumPounds` is zero or exceeds `MAX_URANIUM_POUNDS_PER_PURCHASE` (100).
- `InvalidPriceBounds`: If `_ethPriceUSD` is outside 100–10,000 USD (with 8 decimals).
- Reverts on overflow if `totalCostUSDCents > 2^128`.

### Gas Cost Estimates

- ~5,000–10,000 gas: View function with arithmetic operations and console logs (if enabled).

### Usage Example

```solidity
// Calculate payment for 50 pounds at $2,000 ETH/USD
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 payment = contract.calculateRequiredPayment(50, 2000 * 10**8);
```

## revealPurchase

### Purpose and Use Cases

Reveals and executes a committed uranium purchase by providing the pounds, nonce, and secret, verifying the commitment, and processing the payment. Used by authorized buyers to complete a purchase. If `msg.sender` is the `testingAddress`, it bypasses commitment checks for testing purposes.

### Parameters

- `_uraniumPounds` (`uint256`): Amount of uranium to purchase (in pounds).
- `_nonce` (`uint256`): Nonce used in the commitment hash.
- `_secret` (`bytes32`): Secret used in the commitment hash.

### Error Conditions

- `InsufficientUraniumAvailable`: If `_uraniumPounds` is zero, exceeds `MAX_URANIUM_POUNDS_PER_PURCHASE`, or exceeds `availableUraniumPounds`.
- `CommitmentExpired`: If no commitment exists or `COMMIT_REVEAL_WINDOW` (5 minutes) has passed (unless `msg.sender` is `testingAddress`).
- `InvalidCommitment`: If the provided `_uraniumPounds`, `_nonce`, and `_secret` do not match the stored `commitmentHash` (unless `msg.sender` is `testingAddress`).
- `PaymentAmountTooSmall`: If `msg.value` is less than the required payment.
- `PriceFeedStale`: If both Chainlink and cached ETH prices are stale.
- `InvalidEthPrice`: If no valid ETH price is available.
- Reverts if called by an unauthorized party, when paused, or during reentrancy.

### Gas Cost Estimates

- ~~150,000–200,000 gas: Includes hash verification (~~10,000 gas), price feed call (~~10,000 gas), storage updates (~~50,000 gas), ETH transfer (~~20,000 gas), event emission (~~10,000 gas), and console logs (~10,000 gas).

### Usage Example

```solidity
// Reveal and execute a purchase
uint256 pounds = 50;
uint256 nonce = 12345;
bytes32 secret = bytes32(uint256(42));
uint256 ethPriceUSD = 2000 * 10**8; // $2,000
uint256 payment = contract.calculateRequiredPayment(pounds, ethPriceUSD);
EnergyContract contract = EnergyContract(0xContractAddress);
contract.revealPurchase{value: payment}(pounds, nonce, secret);
```

## withdrawRefunds

### Purpose and Use Cases

Allows users to withdraw overpaid ETH stored in `pendingRefunds`. Used by buyers who sent excess funds during `revealPurchase`.

### Error Conditions

- `NoRefundsAvailable`: If `pendingRefunds[msg.sender]` is zero.
- Reverts if the ETH transfer fails, called when paused, or during reentrancy.

### Gas Cost Estimates

- ~~30,000–50,000 gas: Includes storage update (~~20,000 gas), ETH transfer (~~20,000 gas), and event emission (~~5,000 gas).

### Usage Example

```solidity
// Withdraw pending refunds
EnergyContract contract = EnergyContract(0xContractAddress);
contract.withdrawRefunds();
```

## clearExpiredCommitment

### Purpose and Use Cases

Clears an expired purchase commitment for a buyer, freeing up state. Used by anyone to clean up stale commitments after `COMMIT_REVEAL_WINDOW`.

### Parameters

- `_buyer` (`address`): Address of the buyer with the expired commitment.

### Error Conditions

- `InvalidPartyAddress`: If `_buyer` is the zero address.
- `CommitmentExpired`: If no commitment exists for `_buyer`.
- Reverts if the commitment is not expired (within `COMMIT_REVEAL_WINDOW`).

### Gas Cost Estimates

- ~~20,000–30,000 gas: Includes storage deletion (~~15,000 gas) and event emission (~5,000 gas).

### Usage Example

```solidity
// Clear an expired commitment
address buyer = 0x1234567890123456789012345678901234567890;
EnergyContract contract = EnergyContract(0xContractAddress);
contract.clearExpiredCommitment(buyer);
```

## updatePaymentReceiver

### Purpose and Use Cases

Updates the address that receives ETH payments for uranium purchases. Used by the owner to redirect funds to a new wallet.

### Parameters

- `_newReceiver` (`address payable`): New payment receiver address.

### Error Conditions

- `InvalidPartyAddress`: If `_newReceiver` is the zero address.
- Reverts if called by a non-owner.

### Gas Cost Estimates

- ~~20,000–30,000 gas: Includes storage write (~~20,000 gas) and event emission (~5,000 gas).

### Usage Example

```solidity
// Update payment receiver
address payable newReceiver = payable(0x0987654321098765432109876543210987654321);
EnergyContract contract = EnergyContract(0xContractAddress);
contract.updatePaymentReceiver(newReceiver);
```

## getTransaction

### Purpose and Use Cases

Retrieves details of a transaction by its ID. Used by external applications to inspect purchase history.

### Parameters

- `_id` (`uint256`): Transaction ID.

### Return Values

- `Transaction memory`: Struct containing buyer, seller, uraniumPounds, pricePerPoundUSD, ethPriceUSD, uraniumPriceUSD, timestamp, and cost.

### Error Conditions

- `InvalidTransactionID`: If `_id` is greater than or equal to `transactionCount`.

### Gas Cost Estimates

- ~5,000–10,000 gas: View function accessing a single mapping entry.

### Usage Example

```solidity
// Get transaction details
EnergyContract contract = EnergyContract(0xContractAddress);
EnergyContract.Transaction memory tx = contract.getTransaction(0);
```

## getTransactionsCount

### Purpose and Use Cases

Returns the total number of transactions recorded. Used to iterate over or monitor transaction history.

### Return Values

- `uint256`: Total number of transactions.

### Gas Cost Estimates

- ~2,000–5,000 gas: Simple storage read.

### Usage Example

```solidity
// Get total transaction count
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 count = contract.getTransactionsCount();
```

## getPriceLatestUpdate

### Purpose and Use Cases

Returns the timestamp of the last ETH/USD price update. Used to monitor price feed freshness.

### Return Values

- `uint256`: Timestamp of the last price update.

### Gas Cost Estimates

- ~2,000–5,000 gas: Simple storage read.

### Usage Example

```solidity
// Get last price update timestamp
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 lastUpdate = contract.getPriceLatestUpdate();
```

## getLatestEthPrice

### Purpose and Use Cases

Fetches the latest ETH/USD price from Chainlink or the cached price if Chainlink is invalid. Used internally by `revealPurchase` and externally for price queries.

### Return Values

- `uint256`: ETH/USD price (with 18 decimals).

### Error Conditions

- `PriceFeedStale`: If both Chainlink and cached prices are stale (older than `STALENESS_THRESHOLD = 15 minutes`).
- `InvalidEthPrice`: If no valid price is available (cache uninitialized).

### Gas Cost Estimates

- ~~10,000–20,000 gas: Includes Chainlink external call (~~10,000 gas) and storage updates (~5,000 gas).

### Usage Example

```solidity
// Get latest ETH/USD price
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 ethPrice = contract.getLatestEthPrice();
```

## getCachedEthPrice

### Purpose and Use Cases

Returns the cached ETH/USD price. Used to inspect the current price without triggering a Chainlink call.

### Return Values

- `uint256`: Cached ETH/USD price (with 18 decimals).

### Gas Cost Estimates

- ~2,000–5,000 gas: Simple storage read.

### Usage Example

```solidity
// Get cached ETH/USD price
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 cachedPrice = contract.getCachedEthPrice();
```

## requestUraniumPriceUpdate

### Purpose and Use Cases

Requests an update to the uranium price from the `uraniumPriceConsumer` oracle. Used by the owner to refresh the uranium price feed.

### Error Conditions

- `UraniumPriceConsumerNotSet`: If `uraniumPriceConsumer` is the zero address.
- Reverts if called by a non-owner or when paused.

### Gas Cost Estimates

- ~~50,000–100,000 gas: Depends on the external call to `uraniumPriceConsumer.requestUraniumPrice` (~~50,000 gas) and event emission (~5,000 gas).

### Usage Example

```solidity
// Request uranium price update
EnergyContract contract = EnergyContract(0xContractAddress);
contract.requestUraniumPriceUpdate();
```

## updateUraniumPrice

### Purpose and Use Cases

Updates the stored uranium price (`uraniumPriceUSDCents`) from the `uraniumPriceConsumer` oracle. Used to finalize a price update after a request.

### Error Conditions

- Reverts if called when paused or if the new price is zero or unchanged.

### Gas Cost Estimates

- ~~30,000–50,000 gas: Includes external call to `uraniumPriceConsumer.lastPrice` (~~20,000 gas), storage update (~~20,000 gas), and event emission (~~5,000 gas).

### Usage Example

```solidity
// Update uranium price
EnergyContract contract = EnergyContract(0xContractAddress);
contract.updateUraniumPrice();
```

## getUraniumPriceInfo

### Purpose and Use Cases

Returns the current uranium price and its last update timestamp. Used to monitor the uranium price feed freshness and value.

### Return Values

- `price` (`uint256`): Current uranium price in USD cents per pound.
- `lastUpdated` (`uint256`): Timestamp of the last uranium price update.

### Gas Cost Estimates

- ~5,000–10,000 gas: View function accessing storage variables.

### Usage Example

```solidity
// Get uranium price info
EnergyContract contract = EnergyContract(0xContractAddress);
(uint256 price, uint256 lastUpdated) = contract.getUraniumPriceInfo();
```

## setUraniumPriceConsumer

### Purpose and Use Cases

Sets the uranium price consumer contract address and Chainlink parameters. Used by the owner to configure or update the uranium price oracle.

### Parameters

- `_uraniumPriceConsumer` (`address`): Address of the uranium price consumer contract.
- `_subscriptionId` (`uint64`): Chainlink subscription ID.
- `_donID` (`bytes32`): Chainlink DON ID.

### Error Conditions

- `InvalidPartyAddress`: If `_uraniumPriceConsumer` is the zero address.
- Reverts if called by a non-owner.

### Gas Cost Estimates

- ~~20,000–30,000 gas: Includes storage writes (~~20,000 gas) and event emission (~5,000 gas).

### Usage Example

```solidity
// Set uranium price consumer
address consumer = 0x0987654321098765432109876543210987654321;
uint64 subscriptionId = 123;
bytes32 donID = bytes32(uint256(456));
EnergyContract contract = EnergyContract(0xContractAddress);
contract.setUraniumPriceConsumer(consumer, subscriptionId, donID);
```

## getAvailableUranium

### Purpose and Use Cases

Returns the available uranium (in pounds) in the contract. Used to check the contract's uranium inventory before purchasing.

### Return Values

- `uint256`: Available uranium pounds.

### Gas Cost Estimates

- ~2,000–5,000 gas: Simple storage read.

### Usage Example

```solidity
// Get available uranium
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 available = contract.getAvailableUranium();
```

## checkAuthState

### Purpose and Use Cases

Checks if an address is authorized to purchase uranium. Used to verify a buyer's authorization status.

### Parameters

- `_party` (`address`): Address to check.

### Return Values

- `isAuthorized` (`bool`): True if the party is authorized, false otherwise.

### Error Conditions

- `InvalidPartyAddress`: If `_party` is the zero address.

### Gas Cost Estimates

- ~2,000–5,000 gas: Simple mapping read.

### Usage Example

```solidity
// Check authorization state
address party = 0x1234567890123456789012345678901234567890;
EnergyContract contract = EnergyContract(0xContractAddress);
bool isAuthorized = contract.checkAuthState(party);
```

## pause

### Purpose and Use Cases

Pauses the contract, disabling most functions. Used by the owner in emergency situations to prevent interactions.

### Error Conditions

- Reverts if called by a non-owner.

### Gas Cost Estimates

- ~20,000 gas: Storage update and event emission.

### Usage Example

```solidity
// Pause the contract
EnergyContract contract = EnergyContract(0xContractAddress);
contract.pause();
```

## unpause

### Purpose and Use Cases

Unpauses the contract, re-enabling functions. Used by the owner to resume normal operations.

### Error Conditions

- Reverts if called by a non-owner.

### Gas Cost Estimates

- ~20,000 gas: Storage update and event emission.

### Usage Example

```solidity
// Unpause the contract
EnergyContract contract = EnergyContract(0xContractAddress);
contract.unpause();
```

## withdrawFunds

### Purpose and Use Cases

Allows the owner to withdraw ETH from the contract's balance. Used to transfer collected funds to a designated address.

### Parameters

- `_to` (`address payable`): Address to receive the funds.
- `_amount` (`uint256`): Amount of ETH to withdraw (in Wei).

### Error Conditions

- `InvalidPartyAddress`: If `_to` is the zero address.
- `PaymentAmountTooSmall`: If `_amount` is zero or exceeds the contract's balance.
- Reverts if called by a non-owner or during reentrancy.

### Gas Cost Estimates

- ~~30,000–50,000 gas: Includes storage checks (~~10,000 gas), ETH transfer (~~20,000 gas), and event emission (~~5,000 gas).

### Usage Example

```solidity
// Withdraw 1 ETH
address payable to = payable(0x0987654321098765432109876543210987654321);
uint256 amount = 1 ether;
EnergyContract contract = EnergyContract(0xContractAddress);
contract.withdrawFunds(to, amount);
```