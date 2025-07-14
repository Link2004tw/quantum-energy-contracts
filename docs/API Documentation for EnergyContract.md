Table of Contents

[[#Architecture Document (ARCHITECTURE.md)]]

[[#Why Commit-Reveal Pattern?]]
[[#How Does Authorization Scaling Work?]]
[[#What Are the Gas Cost Implications?]]
[[#How Does Price Feed Integration Work?]]
[[#Conclusion]]


[[#Security Document (SECURITY.md)]]

[[#Threat Model: What Attacks Are You Protecting Against?]]
[[#Security Assumptions: What Do You Trust?]]
[[#Known Limitations: What Risks Remain?]]
[[#Audit Checklist: What Should Reviewers Focus On?]]
[[#Conclusion]]


[[#API Documentation (API.md)]]

[[#authorizeParty]]
[[#unAuthorizeParty]]
[[#revokeAllAuthorizations]]
[[#revokeAuthorizationsBatch]]
[[#getAuthorizedPartyList]]
[[#requestAddEnergy]]
[[#confirmAddEnergy]]
[[#commitPurchase]]
[[#calculateRequiredPayment]]
[[#revealPurchase]]
[[#withdrawRefunds]]
[[#clearExpiredCommitment]]
[[#updatePaymentReceiver]]
[[#getTransaction]]
[[#getTransactionsCount]]
[[#getPriceLatestUpdate]]
[[#getLatestEthPrice]]
[[#pause]]
[[#unpause]]
[[#getCachedEthPrice]]


# API Documentation for EnergyContract

This document provides detailed API documentation for all public functions in the `EnergyContract` smart contract. Each function is described with its purpose, use cases, parameters, return values, error conditions, gas cost estimates, and usage examples.
## authorizeParty
### Purpose and Use Cases
Authorizes a new address to purchase energy from the contract. Used by the contract owner (solar farm) to grant access to trusted buyers, enabling them to call `commitPurchase` and `revealPurchase`.
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
```solidity showLineNumbers
// Authorize a new buyer
address buyer = 0x1234567890123456789012345678901234567890;
EnergyContract contract = EnergyContract(0xContractAddress);
contract.authorizeParty(buyer);
```

## unAuthorizeParty
### Purpose and Use Cases
Removes authorization from a previously authorized address, preventing it from purchasing energy. Used by the owner to revoke access from untrusted or inactive buyers.
### Parameters
- `_party` (`address`): The address to be unauthorized.
### Error Conditions

- `PartyNotAuthorized`: If `_party` is not authorized.
- `PartyNotFoundInList`: If `_party` is not found in `authorizedPartyList` (indicates a logic error).
- Reverts if called by a non-owner or when paused.

### Gas Cost Estimates
- ~20,000 gas per revocation + ~20,000 gas for array restructuring: For a batch of 10, ~220,000 gas.
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
- ~10,000 gas per authorized party + ~20,000 gas for array reset: Scales with `authorizedPartyList` length. For 100 parties, ~1,020,000 gas.
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
## requestAddEnergy
### Purpose and Use Cases
Initiates a request to add energy (in kWh) to the contract's available pool. Used by the owner to signal intent to increase `availableKWh`, with a delay for confirmation.
### Parameters
- `_kWh` (`uint256`): Amount of energy to add (in kWh).
### Error Conditions
- `InsufficientEnergyAvailable`: If `_kWh` is zero or exceeds `MAX_KWH_PER_PURCHASE` (1,000).
- Reverts if called by a non-owner or when paused.
### Gas Cost Estimates

- ~20,000–30,000 gas: Includes storage write to `lastAddEnergyRequest` (~20,000 gas) and event emission (~5,000 gas).
### Usage Example

```solidity
// Request to add 500 kWh
EnergyContract contract = EnergyContract(0xContractAddress);
contract.requestAddEnergy(500);
```
## confirmAddEnergy
### Purpose and Use Cases
Confirms a previous energy addition request after a delay (`ADD_ENERGY_DELAY = 2 minutes`). Updates `availableKWh` and clears the request.
### Parameters
- `_kWh` (`uint256`): Amount of energy to confirm (in kWh).
### Error Conditions
- `NoPendingRequest`: If no prior request exists for the caller.
- `DelayNotElapsed`: If `ADD_ENERGY_DELAY` has not passed since the request.
- `InsufficientEnergyAvailable`: If `_kWh` is zero or exceeds `MAX_KWH_PER_PURCHASE`.
- Reverts if called by a non-owner or when paused.

### Gas Cost Estimates
- ~30,000–40,000 gas: Includes storage updates to `availableKWh` and `lastAddEnergyRequest` (~20,000 gas) and event emission (~5,000 gas).
### Usage Example
```solidity
// Confirm adding 500 kWh after delay
EnergyContract contract = EnergyContract(0xContractAddress);
contract.confirmAddEnergy(500);
```
## commitPurchase
### Purpose and Use Cases
Commits to an energy purchase by submitting a hashed commitment of purchase details (kWh and nonce). Used by authorized buyers to initiate a purchase while preventing front-running.
### Parameters
- `_commitmentHash` (`bytes32`): Hash of kWh, nonce, and buyer's address (`keccak256(abi.encodePacked(_kWh, _nonce, msg.sender))`).

### Error Conditions
- `InvalidCommitmentHash`: If `_commitmentHash` is zero.
- `CommitmentCooldownActive`: If `COMMIT_COOLDOWN` (5 minutes) has not elapsed since the last commitment.
- Reverts if called by an unauthorized party or when paused.
### Gas Cost Estimates
- ~30,000–40,000 gas: Includes storage writes to `purchaseCommitments` and `lastCommitTime` (~20,000 gas) and event emission (~5,000 gas).
### Usage Example
```solidity
// Commit to a purchase
uint256 kWh = 100;
uint256 nonce = 12345;
bytes32 commitment = keccak256(abi.encodePacked(kWh, nonce, msg.sender));
EnergyContract contract = EnergyContract(0xContractAddress);
contract.commitPurchase(commitment);
```
## calculateRequiredPayment
### Purpose and Use Cases
Calculates the required ETH payment (in Wei) for a given kWh amount based on the ETH/USD price. Used off-chain to estimate payment or on-chain for validation.
### Parameters
- `_kWh` (`uint256`): Amount of energy to purchase (in kWh).
- `_ethPriceUSD` (`uint256`): ETH/USD price (in USD with 8 decimals).
### Return Values
- `uint256`: Required payment in Wei.
### Error Conditions
- `InsufficientEnergyAvailable`: If `_kWh` is zero or exceeds `MAX_KWH_PER_PURCHASE`.
- `InvalidPriceBounds`: If `_ethPriceUSD` is outside 100–10,000 USD (with 8 decimals).
- Reverts on overflow if `totalCostUSDCents > 2^128`.
### Gas Cost Estimates
- ~5,000–10,000 gas: Pure function with arithmetic operations and console logs (if enabled).
### Usage Example
```solidity
// Calculate payment for 100 kWh at $2,000 ETH/USD
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 payment = contract.calculateRequiredPayment(100, 2000 * 10**8);
```
## revealPurchase
### Purpose and Use Cases
Reveals and executes a committed purchase by providing the kWh amount and nonce, verifying the commitment, and processing the payment. Used by authorized buyers to complete a purchase.
### Parameters
- `_kWh` (`uint256`): Amount of energy to purchase (in kWh).
- `_nonce` (`uint256`): Nonce used in the commitment hash.
### Error Conditions
- `InsufficientEnergyAvailable`: If `_kWh` is zero, exceeds `MAX_KWH_PER_PURCHASE`, or exceeds `availableKWh`.
- `CommitmentExpired`: If no commitment exists or `COMMIT_REVEAL_WINDOW` (5 minutes) has passed.
- `InvalidCommitment`: If the provided `_kWh` and `_nonce` do not match the stored `commitmentHash`.
- `PaymentAmountTooSmall`: If `msg.value` is less than the required payment.
- `PaymentFailed`: If the ETH transfer to `paymentReceiver` fails.
- `PriceFeedStale`: If both Chainlink and cached prices are stale.
- `InvalidEthPrice`: If no valid ETH price is available.
- Reverts if called by an unauthorized party, when paused, or during reentrancy.
### Gas Cost Estimates
- ~150,000–200,000 gas: Includes hash verification (~10,000 gas), price feed call (~10,000 gas), storage updates (~50,000 gas), ETH transfer (~20,000 gas), and event emission (~10,000 gas).

### Usage Example
```solidity
// Reveal and execute a purchase
uint256 kWh = 100;
uint256 nonce = 12345;
uint256 ethPriceUSD = 2000 * 10**8; // $2,000
uint256 payment = contract.calculateRequiredPayment(kWh, ethPriceUSD);
EnergyContract contract = EnergyContract(0xContractAddress);
contract.revealPurchase{value: payment}(kWh, nonce);
```
## withdrawRefunds
### Purpose and Use Cases
Allows users to withdraw overpaid ETH stored in `pendingRefunds`. Used by buyers who sent excess funds during `revealPurchase`.
### Error Conditions
- `NoRefundsAvailable`: If `pendingRefunds[msg.sender]` is zero.
- `PaymentFailed`: If the ETH transfer to the caller fails.
- Reverts if called when paused or during reentrancy.
### Gas Cost Estimates
- ~30,000–50,000 gas: Includes storage update (~20,000 gas), ETH transfer (~20,000 gas), and event emission (~5,000 gas).
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
- ~20,000–30,000 gas: Includes storage deletion (~15,000 gas) and event emission (~5,000 gas).
### Usage Example
```solidity
// Clear an expired commitment
address buyer = 0x1234567890123456789012345678901234567890;
EnergyContract contract = EnergyContract(0xContractAddress);
contract.clearExpiredCommitment(buyer);
```
## updatePaymentReceiver
### Purpose and Use Cases

Updates the address that receives ETH payments for energy purchases. Used by the owner to redirect funds to a new wallet.
### Parameters
- `_newReceiver` (`address`): New payment receiver address.
### Error Conditions
- `InvalidPartyAddress`: If `_newReceiver` is the zero address or a contract address.
- Reverts if called by a non-owner.
### Gas Cost Estimates
- ~20,000–30,000 gas: Includes storage write (~20,000 gas) and contract code size check (~5,000 gas).
### Usage Example
```solidity
// Update payment receiver
address newReceiver = 0x0987654321098765432109876543210987654321;
EnergyContract contract = EnergyContract(0xContractAddress);
contract.updatePaymentReceiver(newReceiver);
```
## getTransaction
### Purpose and Use Cases
Retrieves details of a transaction by its ID. Used by external applications to inspect purchase history.
### Parameters
- `_id` (`uint256`): Transaction ID.
### Return Values
- `Transaction memory`: Struct containing buyer, seller, kWh, price per kWh, ETH price, and timestamp.
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
### Purpose andUse Cases
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
- `InvalidPriceBounds`: If Chainlink price is outside 100–10,000 USD.
- `PriceFeedStale`:ល`: If both Chainlink and cached prices are stale.
- `InvalidEthPrice`: If no valid price is available (cache uninitialized).
### Gas Cost Estimates

- ~10,000–20,000 gas: Includes Chainlink external call (~10,000 gas) and storage updates (~5,000 gas).
### Usage Example
```solidity
// Get latest ETH/USD price
EnergyContract contract = EnergyContract(0xContractAddress);
uint256 ethPrice = contract.getLatestEthPrice();
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
