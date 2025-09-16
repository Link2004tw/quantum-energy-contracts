# Architecture Document for EnergyContract

This document outlines the key design decisions for the `EnergyContract` smart contract, which facilitates uranium trading using a commit-reveal pattern, integrates with Chainlink for ETH/USD price feeds and a custom oracle for uranium prices, and manages authorization for scalability.

## Why Commit-Reveal Pattern?

The commit-reveal pattern is implemented to prevent front-running attacks during uranium purchases. This approach ensures fairness and security in the transaction process by requiring buyers to commit to their purchase intent before revealing the details.

- **Purpose**: The commit-reveal pattern mitigates the risk of malicious actors observing pending transactions in the mempool and manipulating the purchase process (e.g., by submitting higher gas fees to outpace legitimate buyers).
- **Implementation**:
    - **Commit Phase**: Buyers submit a hashed commitment (`commitmentHash`) of their intended purchase details (uranium pounds, nonce, and secret) using `commitPurchase`. This hash is stored on-chain with a timestamp in the `purchaseCommitments` mapping, ensuring the buyer's intent is recorded without revealing sensitive details.
    - **Reveal Phase**: Within a 5-minute `COMMIT_REVEAL_WINDOW`, buyers call `revealPurchase` with the actual uranium pounds, nonce, and secret. The contract verifies that the hash of these inputs (`keccak256(abi.encodePacked(msg.sender, _uraniumPounds, _nonce, _secret))`) matches the stored `commitmentHash` before processing the purchase.
    - The `testingAddress` bypasses commitment checks for testing purposes, allowing direct purchases without a prior commitment.
- **Security Benefits**:
    - Prevents front-running by hiding purchase details during the commit phase.
    - The `COMMIT_COOLDOWN` (5 minutes) prevents spamming or rapid successive commitments from the same address.
    - The `COMMIT_REVEAL_WINDOW` ensures commitments expire if not revealed, freeing up state via `clearExpiredCommitment` and preventing indefinite locking of resources.
- **Trade-offs**:
    - Increases user interaction complexity, requiring two transactions (commit and reveal).
    - Adds a time delay for purchase completion, which may affect user experience but is necessary for security.
    - The `testingAddress` bypass reduces security for testing but is restricted to a specific address controlled by the deployer.

## How Does Authorization Scaling Work?

Authorization scaling is designed to manage a controlled set of participants who can purchase uranium, ensuring the contract remains efficient and secure while supporting a growing number of users.

- **Mechanism**:
    - The contract maintains a `mapping(address => bool) authorizedParties` for O(1) authorization checks and an `address[] authorizedPartyList` for iteration and batch operations.
    - The `onlyAuthorizedParties` modifier restricts purchase-related functions (`commitPurchase`, `revealPurchase`) to authorized addresses.
    - The contract owner (initially the solar farm) can authorize new parties using `authorizeParty`, revoke authorizations individually (`unAuthorizeParty`), or in batches (`revokeAuthorizationsBatch`).
    - The `MAX_AUTHORIZED_PARTIES` constant (set to 100) limits the total number of authorized parties to prevent unbounded growth of the `authorizedPartyList`.
- **Scaling Strategy**:
    - **Batch Revocation**: The `revokeAuthorizationsBatch` function allows the owner to revoke multiple authorizations in a single transaction, reducing gas costs compared to individual revocations. It iterates over a specified range of the `authorizedPartyList`, nullifying unauthorized addresses and rebuilding the list efficiently.
    - **Efficient Storage**: The `mapping` provides fast authorization checks, while the `array` supports iteration for batch operations. The `authorizedPartyCount` variable tracks the number of authorized parties, avoiding dynamic length calculations.
    - **Revoke All**: The `revokeAllAuthorizations` function resets all authorizations except for the solar farm, providing a fallback for emergency cleanup or contract reset.
    - The `checkAuthState` function allows external verification of authorization status.
- **Performance Considerations**:
    - The `authorizedPartyCount` variable ensures O(1) access to the number of authorized parties.
    - The `getAuthorizedPartyList` view function allows external inspection of authorized parties without modifying state, useful for frontends or auditors.
- **Trade-offs**:
    - The `MAX_AUTHORIZED_PARTIES` limit caps scalability but prevents excessive gas consumption during list operations.
    - Batch revocation requires careful index management, mitigated by the `InvalidBatchIndex` error check.
    - Maintaining both a mapping and an array increases storage costs but balances lookup and iteration efficiency.

## What Are the Gas Cost Implications?

Gas efficiency is a critical consideration in the contract design to ensure cost-effective operations for users and the solar farm.

- **Commit-Reveal Pattern**:
    - **Commit Phase**: The `commitPurchase` function is lightweight, storing a `PurchaseCommitment` struct (hash and timestamp) and updating `lastCommitTime`. Gas costs are ~~30,000–40,000 gas, primarily for storage writes (~~20,000 gas per slot) and event emission (~5,000 gas).
    - **Reveal Phase**: The `revealPurchase` function is more gas-intensive due to:
        - Hash verification (`keccak256` computation: ~10,000 gas).
        - Price feed interaction via `getLatestEthPrice` (~10,000 gas).
        - State updates (`availableUraniumPounds`, `transactions`, `pendingRefunds`: ~50,000 gas).
        - ETH transfer to `paymentReceiver` (~20,000 gas).
        - Console logs for debugging (~10,000 gas).
        - Estimated total: ~150,000–200,000 gas.
    - Mitigation: The `nonReentrant` modifier prevents reentrancy attacks, and the `MAX_GAS_FOR_CALL` (5,000,000 gas) limits gas usage for external transfers.
- **Price Feed Integration**:
    - Calling `priceFeed.latestRoundData` incurs external call overhead (~5,000–10,000 gas). The contract caches the ETH/USD price (`cachedEthPrice`) to reduce repeated calls, updating only when Chainlink data is valid.
    - The uranium price oracle call (`uraniumPriceConsumer.lastPrice`) in `updateUraniumPrice` costs ~~20,000 gas, with `requestUraniumPriceUpdate` potentially higher (~~50,000 gas) due to Chainlink's request mechanism.
- **Authorization Management**:
    - **Authorization**: Adding a party (`authorizeParty`) writes to the `mapping` and `array`, costing ~40,000–50,000 gas (two storage operations: ~20,000 gas each, plus event emission: ~5,000 gas).
    - **Batch Revocation**: `revokeAuthorizationsBatch` consolidates multiple state changes, costing ~20,000 gas per revocation plus ~20,000 gas for array restructuring. For 10 revocations: ~220,000 gas.
    - **Revoke All**: `revokeAllAuthorizations` iterates over the entire `authorizedPartyList`, costing ~~10,000 gas per element plus array deletion overhead (~~20,000 gas). For 100 parties: ~1,020,000 gas.
- **Uranium Management**:
    - `requestAddUranium` and `confirmAddUranium` are lightweight, updating `lastAddUraniumRequest` and `availableUraniumPounds` (~20,000–30,000 gas each, including storage writes and event emission).
    - The `ADD_ENERGY_DELAY` (2 minutes) prevents rapid state changes, indirectly reducing gas consumption by limiting transaction frequency.
- **Error Handling**:
    - Custom errors (e.g., `InsufficientUraniumAvailable`, `PaymentAmountTooSmall`) save ~200–300 gas per revert compared to string-based errors by avoiding string storage.
- **Trade-offs**:
    - Caching the ETH price reduces gas costs but risks using stale data, mitigated by `STALENESS_THRESHOLD` (15 minutes).
    - The `MAX_AUTHORIZED_PARTIES` limit caps gas costs for list operations but restricts scalability.
    - The `nonReentrant` modifier adds ~1,000–2,000 gas per call but is essential for security.
    - Console logs in `revealPurchase` increase gas costs but aid debugging during development.

## How Does Price Feed Integration Work?

The contract integrates with Chainlink's ETH/USD price feed and a custom `IUraniumPriceConsumer` oracle to convert uranium prices (in USD cents per pound) to ETH for payments, ensuring accurate pricing in a volatile market.

- **Implementation**:
    - **ETH/USD Price Feed**:
        - The `AggregatorV3Interface` from Chainlink is used to fetch the latest ETH/USD price via `priceFeed.latestRoundData` in `getLatestEthPrice`.
        - Validation checks ensure:
            - Positive price (`price > 0`).
            - Complete round (`answeredInRound >= roundId`).
            - Price bounds (`100 <= price <= 10,000 USD`, with 8 decimals).
        - The price is adjusted to 18 decimals (`uint256(price) * 10^10`) for consistency with Ethereum's Wei precision.
        - If Chainlink data is invalid, the contract falls back to `cachedEthPrice`, provided it is not stale (within `STALENESS_THRESHOLD` of `priceLastUpdated`).
        - The `cachedEthPrice`, `priceLastUpdated`, and `lastChainlinkUpdate` are updated when valid Chainlink data is received.
    - **Uranium Price Oracle**:
        - The `IUraniumPriceConsumer` interface provides the uranium price via `lastPrice`, returning the price in USD cents per pound.
        - The `requestUraniumPriceUpdate` function initiates a price update request, using `uraniumSubscriptionId` and `uraniumDonID` for Chainlink integration.
        - The `updateUraniumPrice` function fetches the latest price and updates `uraniumPriceUSDCents` and `uraniumPriceLastUpdated` if the price is valid and changed.
        - Unlike the ETH price, no staleness check is enforced in purchase functions, relying on the owner to call `updateUraniumPrice` regularly.
- **Price Calculation**:
    - The `calculateRequiredPayment` function computes the ETH payment based on:
        - Uranium amount (`_uraniumPounds`).
        - Uranium price (`uraniumPriceUSDCents`).
        - ETH/USD price (`_ethPriceUSD`, with 8 decimals, adjusted to cents).
    - Formula: `totalCostWei = (_uraniumPounds * uraniumPriceUSDCents * 1e18) / (_ethPriceUSD / 1e6)`.
    - Note: The division by `1e6` is incorrect, as `_ethPriceUSD` is in 18-decimal precision (should be `/ 10^16` to convert to cents correctly). This is a known issue in the contract.
    - The result is adjusted to Wei for Ethereum transactions.
- **Error Handling**:
    - `InvalidPriceBounds` ensures the ETH/USD price is within 100–10,000 USD.
    - `PriceFeedStale` reverts if both Chainlink and cached ETH prices are stale.
    - `InvalidEthPrice` reverts if no valid ETH price is available (cache uninitialized).
    - `UraniumPriceConsumerNotSet` reverts if the uranium price consumer address is zero.
- **Resilience**:
    - The ETH price cache (`cachedEthPrice`) ensures purchases can continue during Chainlink downtime, provided the cache is not stale.
    - The uranium price (`uraniumPriceUSDCents`) relies on manual updates via `updateUraniumPrice`, which assumes regular owner interaction.
    - The `PriceCacheUpdated` and `UraniumPriceUpdated` events log price changes for transparency.
- **Trade-offs**:
    - Caching the ETH price reduces gas costs and improves reliability but risks using outdated prices if not refreshed within `STALENESS_THRESHOLD`.
    - The lack of automatic uranium price staleness checks simplifies the contract but places responsibility on the owner to maintain price freshness.
    - The incorrect ETH price conversion in `calculateRequiredPayment` may lead to inflated costs, requiring a contract update.

## Conclusion

The `EnergyContract` balances security, scalability, and gas efficiency through:

- The commit-reveal pattern to prevent front-running, with a testing bypass for flexibility.
- A scalable authorization system with batch operations and a capped participant limit.
- Gas optimization via custom errors, ETH price caching, and efficient state management.
- Dual price feed integration with Chainlink for ETH/USD and a custom oracle for uranium prices, with caching for resilience.

**Known Issues**:

- The `calculateRequiredPayment` function incorrectly divides `_ethPriceUSD` by `1e6` instead of `10^16`, leading to potential cost miscalculations.
- The absence of uranium price staleness checks relies on owner diligence, which could be improved with automatic fallback logic.
- The contract name (`EnergyContract`) and some constants (e.g., `ADD_ENERGY_DELAY`) use energy-related terminology, which is misleading given the focus on uranium.

These design choices ensure a secure and efficient platform for uranium trading, with room for future enhancements such as automated price staleness handling or corrected ETH price calculations.