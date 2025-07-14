# Architecture Document for EnergyContract

This document outlines the key design decisions for the `EnergyContract` smart contract, which facilitates energy trading using a commit-reveal pattern, integrates with Chainlink for price feeds, and manages authorization for scalability.

## Why Commit-Reveal Pattern?

The commit-reveal pattern is implemented to prevent front-running attacks during energy purchases. This approach ensures fairness and security in the transaction process by requiring buyers to commit to their purchase intent before revealing the details.

- **Purpose**: The commit-reveal pattern mitigates the risk of malicious actors observing pending transactions in the mempool and manipulating the purchase process (e.g., by submitting higher gas fees to outpace legitimate buyers).
- **Implementation**:
    - **Commit Phase**: Buyers submit a hashed commitment (`commitmentHash`) of their intended purchase details (kWh amount and nonce) using `commitPurchase`. This hash is stored on-chain with a timestamp, ensuring the buyer's intent is recorded without revealing sensitive details.
    - **Reveal Phase**: Within a 5-minute `COMMIT_REVEAL_WINDOW`, buyers call `revealPurchase` with the actual kWh amount and nonce. The contract verifies that the hash of these inputs matches the stored `commitmentHash` before processing the purchase.
- **Security Benefits**:
    - Prevents front-running by hiding purchase details during the commit phase.
    - The `COMMIT_COOLDOWN` (5 minutes) prevents spamming or rapid successive commitments from the same address.
    - The `COMMIT_REVEAL_WINDOW` ensures commitments expire if not revealed, freeing up state and preventing indefinite locking of resources.
- **Trade-offs**:
    - Increases user interaction complexity, requiring two transactions (commit and reveal).
    - Adds a time delay for purchase completion, which may affect user experience but is necessary for security.

## How Does Authorization Scaling Work?

Authorization scaling is designed to manage a controlled set of participants who can purchase energy, ensuring the contract remains efficient and secure while supporting a growing number of users.

- **Mechanism**:
    - The contract maintains a `mapping(address => bool) authorizedParties` and an `address[] authorizedPartyList` to track authorized participants.
    - The `onlyAuthorizedParties` modifier restricts purchase-related functions (`commitPurchase`, `revealPurchase`) to authorized addresses.
    - The contract owner (initially the solar farm) can authorize new parties using `authorizeParty` and revoke authorizations individually (`unAuthorizeParty`) or in batches (`revokeAuthorizationsBatch`).
    - The `MAX_AUTHORIZED_PARTIES` constant (set to 100) limits the total number of authorized parties to prevent unbounded growth of the `authorizedPartyList`.
- **Scaling Strategy**:
    - **Batch Revocation**: The `revokeAuthorizationsBatch` function allows the owner to revoke multiple authorizations in a single transaction, reducing gas costs compared to individual revocations. It iterates over a specified range of the `authorizedPartyList`, nullifying unauthorized addresses and rebuilding the list efficiently.
    - **Efficient Storage**: The `authorizedPartyList` is used for iteration and batch operations, while the `mapping` provides O(1) lookup for authorization checks. This dual structure balances gas costs for reads and writes.
    - **Revoke All**: The `revokeAllAuthorizations` function resets all authorizations except for the solar farm, providing a fallback for emergency cleanup or contract reset.
- **Performance Considerations**:
    - The `authorizedPartyCount` variable tracks the number of authorized parties, preventing the need to compute the list length dynamically.
    - The `getAuthorizedPartyList` view function allows external inspection of authorized parties without modifying state.
- **Trade-offs**:
    - The `MAX_AUTHORIZED_PARTIES` limit caps scalability but prevents excessive gas consumption during list operations.
    - Batch revocation requires careful index management to avoid out-of-bounds errors, mitigated by the `InvalidBatchIndex` error check.

## What Are the Gas Cost Implications?

Gas efficiency is a critical consideration in the contract design to ensure cost-effective operations for users and the solar farm.

- **Commit-Reveal Pattern**:
    - **Commit Phase**: The `commitPurchase` function is lightweight, storing a `PurchaseCommitment` struct (hash and timestamp) and updating `lastCommitTime`. Gas costs are minimal, primarily for storage writes (~20,000 gas per storage slot).
    - **Reveal Phase**: The `revealPurchase` function is more gas-intensive due to:
        - Hash verification (`keccak256` computation).
        - Price feed interaction via `getLatestEthPrice`.
        - State updates (`availableKWh`, `transactions`, `pendingRefunds`).
        - ETH transfer to `paymentReceiver`.
        - Estimated gas cost: ~150,000–200,000 gas, depending on storage operations and external call overhead.
    - Mitigation: The `nonReentrant` modifier prevents reentrancy attacks, and the `MAX_GAS_FOR_CALL` (5,000,000 gas) limits gas usage for external transfers.
- **Price Feed Integration**:
    - Calling `priceFeed.latestRoundData` incurs external call overhead (~5,000–10,000 gas). To reduce costs, the contract caches the ETH/USD price (`cachedEthPrice`) and only updates it when Chainlink data is valid.
    - Fallback to cached price during Chainlink downtime avoids repeated failed calls, saving gas.
- **Authorization Management**:
    - **Authorization**: Adding a party (`authorizeParty`) writes to the `mapping` and `array`, costing ~40,000–50,000 gas due to two storage operations.
    - **Batch Revocation**: `revokeAuthorizationsBatch` is gas-efficient for large-scale updates, as it consolidates multiple state changes into one transaction. Gas costs scale linearly with batch size (~20,000 gas per revocation).
    - **Revoke All**: `revokeAllAuthorizations` iterates over the entire `authorizedPartyList`, with gas costs proportional to the list length (~10,000 gas per element plus array deletion overhead).
- **Energy Management**:
    - `requestAddEnergy` and `confirmAddEnergy` are lightweight, primarily updating `lastAddEnergyRequest` and `availableKWh` (~20,000–30,000 gas each).
    - The `ADD_ENERGY_DELAY` (2 minutes) prevents rapid state changes, indirectly reducing gas consumption by limiting transaction frequency.
- **Error Handling**:
    - Custom errors (e.g., `InsufficientEnergyAvailable`, `PaymentAmountTooSmall`) replace string-based reverts, saving ~200–300 gas per error by avoiding string storage.
- **Trade-offs**:
    - Caching the price feed reduces gas costs but risks using stale data if Chainlink is down for extended periods (mitigated by `STALENESS_THRESHOLD`).
    - The `MAX_AUTHORIZED_PARTIES` limit caps gas costs for list operations but restricts scalability.
    - The `nonReentrant` modifier adds ~1,000–2,000 gas per call but is essential for security.

## How Does Price Feed Integration Work?

The contract integrates with Chainlink's ETH/USD price feed to convert energy prices (in USD cents) to ETH for payments, ensuring accurate pricing in a volatile market.

- **Implementation**:
    - The `AggregatorV3Interface` from Chainlink is used to fetch the latest ETH/USD price via `priceFeed.latestRoundData`.
    - The `getLatestEthPrice` function retrieves the price, validates it, and updates the `cachedEthPrice` if valid. Validation checks include:
        - Positive price (`price > 0`).
        - Data freshness (`updatedAt > block.timestamp - STALENESS_THRESHOLD`).
        - Complete round (`answeredInRound >= roundId`).
        - Price bounds (`100 <= price <= 10,000 USD`, adjusted for 8 decimals).
    - If Chainlink data is invalid (stale, incomplete, or out-of-bounds), the contract falls back to `cachedEthPrice`, provided it is not stale (within `STALENESS_THRESHOLD` of `priceLastUpdated`).
- **Price Calculation**:
    - The `calculateRequiredPayment` function computes the ETH payment based on:
        - Energy amount (`_kWh`).
        - Fixed price per kWh (`PRICE_PER_KWH_USD_CENTS = 12`).
        - Current ETH/USD price (`_ethPriceUSD`).
    - Formula: `totalCostWei = (kWh * PRICE_PER_KWH_USD_CENTS * 1e18) / (ethPriceUSD / 1e2)`.
    - The result is adjusted to Wei for Ethereum transactions.
- **Error Handling**:
    - `InvalidPriceBounds` ensures the ETH/USD price is within a realistic range (100–10,000 USD).
    - `PriceFeedStale` reverts if both Chainlink and cached prices are stale.
    - `InvalidEthPrice` reverts if no valid price is available (e.g., cache is uninitialized).
- **Resilience**:
    - The contract caches the last valid price (`cachedEthPrice`) to handle Chainlink downtime, ensuring purchases can continue unless the cache itself becomes stale.
    - The `lastChainlinkFailure` variable tracks downtime, and the `PriceCacheUpdated` event logs price updates for transparency.
- **Trade-offs**:
    - Caching reduces gas costs and improves reliability during Chainlink outages but risks using outdated prices if the cache is not refreshed within `STALENESS_THRESHOLD` (15 minutes).
    - The fixed `PRICE_PER_KWH_USD_CENTS` simplifies pricing but assumes a stable energy market, which may require updates via contract upgrades.

## Conclusion

The `EnergyContract` balances security, scalability, and gas efficiency through:

- The commit-reveal pattern to prevent front-running.
- A scalable authorization system with batch operations and a capped participant limit.
- Gas optimization via custom errors, price caching, and efficient state management.
- Robust Chainlink integration with a fallback cache for reliable price feeds.

These design choices ensure a secure and efficient platform for energy trading while maintaining flexibility for future enhancements.
