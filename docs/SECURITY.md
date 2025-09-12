# Security Document for EnergyContract

This document outlines the threat model, security assumptions, known limitations, and audit checklist for the `EnergyContract` smart contract. It details the attacks mitigated, trusted components, remaining risks, and key areas for auditors to review. Additionally, it provides instructions for creating an admin account in Firebase to support role-based access control in the `solarfarm_ui` application.

## Threat Model: What Attacks Are You Protecting Against?

The `EnergyContract` is designed to mitigate several common smart contract vulnerabilities and attacks specific to its energy trading functionality. The following threats are addressed:

- **Front-Running Attacks**:
    - **Threat**: Malicious actors observe pending purchase transactions in the mempool and submit competing transactions with higher gas fees to outpace legitimate buyers, potentially manipulating prices or stealing opportunities.
    - **Mitigation**: The commit-reveal pattern requires buyers to submit a hashed commitment (`commitPurchase`) before revealing purchase details (`revealPurchase`). This obscures the kWh amount and nonce, making it difficult for attackers to front-run. The `COMMIT_REVEAL_WINDOW` (5 minutes) and `COMMIT_COOLDOWN` (5 minutes) limit rapid or speculative commitments.
- **Reentrancy Attacks**:
    - **Threat**: Malicious contracts could re-enter the `revealPurchase` or `withdrawRefunds` functions during ETH transfers, draining funds or manipulating state.
    - **Mitigation**: The `nonReentrant` modifier from OpenZeppelin's `ReentrancyGuard` prevents recursive calls. The `MAX_GAS_FOR_CALL` (5,000,000 gas) limits gas available for external calls, reducing the risk of malicious contract execution.
- **Unauthorized Access**:
    - **Threat**: Unauthorized users could attempt to call restricted functions (e.g., `commitPurchase`, `revealPurchase`) or manipulate the contract state.
    - **Mitigation**: The `onlyAuthorizedParties` modifier restricts purchase functions to authorized addresses. The `Ownable` contract ensures only the owner (solar farm) can manage authorizations, add energy, or update critical parameters.
- **Price Feed Manipulation**:
    - **Threat**: Attackers could exploit stale or manipulated Chainlink price feeds to purchase energy at incorrect prices, draining contract funds or underpaying.
    - **Mitigation**: The `getLatestEthPrice` function validates Chainlink data for:
        - Positive price (`price > 0`).
        - Freshness (`updatedAt > block.timestamp - STALENESS_THRESHOLD`).
        - Complete round (`answeredInRound >= roundId`).
        - Realistic price bounds (100–10,000 USD).
        - A cached price (`cachedEthPrice`) is used as a fallback if Chainlink data is invalid, with a staleness check (`STALENESS_THRESHOLD = 15 minutes`).
- **Denial of Service (DoS)**:
    - **Threat**: Attackers could spam commitments, exhaust the `authorizedPartyList`, or block energy additions to disrupt contract operations.
    - **Mitigation**:
        - The `COMMIT_COOLDOWN` prevents rapid successive commitments.
        - The `MAX_AUTHORIZED_PARTIES` (100) limits the number of authorized parties, preventing unbounded list growth.
        - The `ADD_ENERGY_DELAY` (2 minutes) ensures energy additions are deliberate, reducing spam risk.
- **Overflow/Underflow Attacks**:
    - **Threat**: Arithmetic operations could overflow or underflow, leading to incorrect calculations or exploits.
    - **Mitigation**: The contract uses Solidity `^0.8.30`, which includes built-in overflow checks. Additional checks in `calculateRequiredPayment` ensure `totalCostUSDCents` does not exceed `2^128`.
- **Griefing Attacks**:
    - **Threat**: Attackers could lock funds by overpaying in `revealPurchase` or failing to reveal commitments, tying up contract resources.
    - **Mitigation**: Overpayments are stored in `pendingRefunds` and can be withdrawn via `withdrawRefunds`. Expired commitments are cleared via `clearExpiredCommitment`, freeing up state.

## Security Assumptions: What Do You Trust?

The contract relies on several components and assumptions for its security:

- **Chainlink Price Feed**:
    - Trusted to provide accurate and timely ETH/USD price data under normal conditions.
    - Assumed to be secure against manipulation by malicious nodes, relying on Chainlink's decentralized oracle network.
    - The contract mitigates downtime or stale data by caching the last valid price.
- **OpenZeppelin Contracts**:
    - The `Ownable`, `Pausable`, and `ReentrancyGuard` contracts from OpenZeppelin are trusted to be secure and audited, providing access control, pausing functionality, and reentrancy protection.
- **Solidity Compiler**:
    - The contract assumes Solidity `^0.8.30` correctly handles arithmetic overflows and other language-level protections.
- **Ethereum Blockchain**:
    - The Ethereum blockchain is trusted for transaction ordering, finality, and gas mechanics.
    - The contract assumes the blockchain's mempool is observable (for front-running risks), mitigated by the commit-reveal pattern.
- **Solar Farm (Owner)**:
    - The solar farm, as the contract owner, is trusted to authorize legitimate parties, manage energy additions, and update the `paymentReceiver` responsibly.
    - The owner is assumed to be a trusted entity, as it has significant control over contract operations.
- **Authorized Parties**:
    - Authorized parties are trusted to act honestly in committing and revealing purchases. Malicious authorized parties could spam commitments, but this is mitigated by cooldowns and expiration mechanisms.
- **Payment Receiver**:
    - The `paymentReceiver` is trusted to be a valid, non-malicious address (enforced by preventing contract addresses in `updatePaymentReceiver`).

## Known Limitations: What Risks Remain?

Despite mitigations, some risks and limitations persist:

- **Chainlink Downtime or Manipulation**:
    - Prolonged Chainlink downtime (>15 minutes) could cause the cached price to become stale, halting purchases (`PriceFeedStale` error).
    - While Chainlink's decentralized oracles reduce manipulation risk, a coordinated attack on the oracle network could provide incorrect prices, though this is unlikely due to Chainlink's design.
- **Owner Centralization Risk**:
    - The solar farm (owner) has significant control, including pausing the contract, managing authorizations, and updating the `paymentReceiver`. A compromised or malicious owner could disrupt operations or misdirect funds.
    - Mitigation requires governance mechanisms (e.g., multi-sig ownership), which are not currently implemented.
- **Gas Limit Risks**:
    - The `MAX_GAS_FOR_CALL` (5,000,000 gas) may be insufficient for complex `paymentReceiver` operations, causing payment failures.
    - Batch revocation (`revokeAuthorizationsBatch`) could hit gas limits for large lists, though `MAX_AUTHORIZED_PARTIES` (100) mitigates this.
- **Commitment Expiry**:
    - Buyers failing to reveal commitments within the `COMMIT_REVEAL_WINDOW` lose their opportunity to purchase, requiring manual clearing via `clearExpiredCommitment`. This could lead to user frustration or DoS if not managed.
- **Price Volatility**:
    - The fixed `PRICE_PER_KWH_USD_CENTS` (12 cents) assumes a stable energy market. Rapid ETH/USD price changes could lead to under- or over-payment if the cached price is slightly outdated, though bounded by `STALENESS_THRESHOLD`.
- **Scalability Constraints**:
    - The `MAX_AUTHORIZED_PARTIES` (100) limits the number of buyers, potentially restricting market growth. Increasing this limit would increase gas costs for list operations.
- **External Contract Risk**:
    - If the `paymentReceiver` is mistakenly set to a contract (despite checks in `updatePaymentReceiver`), it could execute malicious logic during ETH transfers, though `MAX_GAS_FOR_CALL` limits the impact.
- **Economic Attacks**:
    - Malicious authorized parties could overpay in `revealPurchase` to lock funds in `pendingRefunds`, though these can be withdrawn. The contract assumes users will claim refunds promptly.

## Audit Checklist: What Should Reviewers Focus On?

Auditors should prioritize the following areas to ensure the contract's security and correctness:

- **Commit-Reveal Logic**:
    - Verify that `commitPurchase` and `revealPurchase` correctly handle the commitment hash (`keccak256(abi.encodePacked(_kWh, _nonce, msg.sender))`) and prevent front-running or hash collisions.
    - Ensure `COMMIT_REVEAL_WINDOW` and `COMMIT_COOLDOWN` are appropriately set to balance security and usability.
    - Check that `clearExpiredCommitment` correctly handles expired commitments without allowing unauthorized clearing.
- **Price Feed Integration**:
    - Validate `getLatestEthPrice` logic for Chainlink data validation (price, freshness, round completeness, bounds).
    - Test fallback to `cachedEthPrice` under various failure scenarios (e.g., Chainlink downtime, invalid prices).
    - Ensure `STALENESS_THRESHOLD` (15 minutes) is reasonable and prevents stale price usage.
- **Authorization Management**:
    - Confirm that `authorizeParty`, `unAuthorizeParty`, `revokeAuthorizationsBatch`, and `revokeAllAuthorizations` correctly update `authorizedParties` and `authorizedPartyList` without introducing inconsistencies.
    - Verify that `MAX_AUTHORIZED_PARTIES` enforcement prevents unbounded list growth.
    - Test edge cases in batch revocation (e.g., invalid indices, empty batches, solar farm exclusion).
- **Reentrancy Protection**:
    - Ensure the `nonReentrant` modifier is correctly applied to `revealPurchase` and `withdrawRefunds`.
    - Test for reentrancy vulnerabilities in ETH transfers (`paymentReceiver.call` and refund withdrawals).
- **Gas Efficiency and Limits**:
    - Analyze gas consumption for critical functions (`revealPurchase`, `revokeAuthorizationsBatch`, `getLatestEthPrice`).
    - Verify that `MAX_GAS_FOR_CALL` is sufficient for legitimate transfers but restricts malicious contract execution.
    - Check for potential gas limit issues in loops (e.g., `revokeAllAuthorizations` with a large `authorizedPartyList`).
- **Arithmetic Safety**:
    - Confirm that all arithmetic operations (e.g., in `calculateRequiredPayment`, `revealPurchase`) are safe from overflow/underflow, leveraging Solidity `^0.8.30`.
    - Verify that `totalCostUSDCents <= 2^128` checks prevent overflow in price calculations.
- **Access Control**:
    - Ensure `onlyOwner` and `onlyAuthorizedParties` modifiers are correctly applied and cannot be bypassed.
    - Test that `updatePaymentReceiver` correctly prevents contract addresses and handles edge cases (e.g., zero address).
- **Error Handling**:
    - Validate that custom errors (e.g., `InsufficientEnergyAvailable`, `PaymentAmountTooSmall`) are consistently used and reduce gas costs compared to string reverts.
    - Test error conditions (e.g., insufficient kWh, stale price feed, invalid commitments) to ensure proper reversion.
- **Event Emission**:
    - Confirm that all critical state changes (e.g., purchases, authorizations, price updates) emit appropriate events for transparency and off-chain monitoring.
- **Pause Functionality**:
    - Test `pause` and `unpause` functions to ensure only the owner can toggle the contract state and that `whenNotPaused` prevents operations during pauses.
- **Edge Cases**:
    - Test zero values (e.g., `_kWh = 0`, `_commitmentHash = 0`, `_party = address(0)`) for proper error handling.
    - Simulate Chainlink failures (stale data, negative prices, incomplete rounds) to verify fallback behavior.
    - Test large `authorizedPartyList` sizes (near `MAX_AUTHORIZED_PARTIES`) for gas and correctness issues.
- **Upgradeability**:
    - Note that the contract is not upgradeable. Auditors should evaluate whether critical parameters (e.g., `PRICE_PER_KWH_USD_CENTS`, `STALENESS_THRESHOLD`) need upgradability for future flexibility.

## Admin Account Creation

To enable role-based access control in the `solarfarm_ui` application, admin accounts are created manually in Firebase Authentication and assigned the `admin` role via a script (`solarfarm_ui/setInitialAdmin.js`). This role is verified by the `/api/auth/verify-role` endpoint (`app/api/auth/verify-role/route.ts`) to grant access to admin routes (e.g., `/admin/add-energy`, `/admin/update-price`). Below are the steps to create an admin account:

1. **Create an Account in Firebase**:
    
    - Navigate to the Firebase Console at [console.firebase.google.com](https://console.firebase.google.com/).
    - Select your project (configured in `solarfarm_ui/.env` with `NEXT_PUBLIC_FIREBASE_PROJECT_ID`).
    - Go to **Build > Authentication** and click **Users**.
    - Click **Add user** to create a new account:
        - **Email**: Enter a valid email (e.g., `admin@example.com`).
        - **Password**: Set a secure password (e.g., at least 8 characters, including letters, numbers, and symbols).
        - **User UID**: Note the generated UID (e.g., `abc123xyz789`) after saving the user.
    - Enable Email/Password authentication if not already enabled (under **Sign-in method**).
2. **Update the UID in setInitialAdmin.js**:
    
    - Open `solarfarm_ui/setInitialAdmin.js` in your code editor.
    - Update the script to include the UID from the Firebase Console:
        
        ```javascript
        // solarfarm_ui/setInitialAdmin.js
        import { adminAuth } from './config/adminAuth';
        
        async function setInitialAdmin() {
          const adminUid = 'abc123xyz789'; // Replace with the UID from Firebase Console
          try {
            await adminAuth.setCustomUserClaims(adminUid, { role: 'admin' });
            console.log(`Admin role set for UID: ${adminUid}`);
          } catch (error) {
            console.error('Error setting admin role:', error);
          }
        }
        
        setInitialAdmin();
        ```
        
    - Ensure `config/adminAuth.ts` is correctly configured with the Firebase Admin SDK credentials (`solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json`).
3. **Run the Script**:
    
    - In the `solarfarm_ui` directory, ensure dependencies are installed:
        
        ```bash
        npm install
        ```
        
    - Add a script to `package.json` if not already present:
        
        ```json
        {
          "scripts": {
            "setInitialAdmin": "node setInitialAdmin.js"
          }
        }
        ```
        
    - Run the script to set the `admin` role:
        
        ```bash
        npm run setInitialAdmin
        ```
        
    - Verify the output in the console (e.g., `Admin role set for UID: abc123xyz789`).
    - Check the Firebase Console under **Authentication > Users** to confirm the user has the custom claim `role: admin`.
4. **Test Admin Access**:
    
    - Start the `solarfarm_ui` application:
        
        ```bash
        npm run dev
        ```
        
    - Navigate to `http://localhost:3000/login` and sign in with the admin account (`admin@example.com`).
    - Access an admin route (e.g., `http://localhost:3000/admin/add-energy`).
    - Verify that `/api/auth/verify-role` returns `{ role: "admin" }` (inspect network requests in browser dev tools).
    - Test a non-admin account to ensure redirection to `/unauthorized` (`app/unauthorized/page.tsx`).
5. **Security Considerations**:
    
    - Protect `solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json` and `solarfarm_ui/.env` in `.gitignore`:
        
        ```plaintext
        .env
        *.json
        ```
        
    - Restrict access to `setInitialAdmin.js` to authorized developers.
    - Use strong, unique passwords for admin accounts.
    - Monitor Firebase Authentication logs for suspicious activity.
    - Consider implementing multi-factor authentication (MFA) for admin accounts in Firebase.

## Conclusion

The `EnergyContract` mitigates key threats like front-running, reentrancy, and price manipulation through the commit-reveal pattern, OpenZeppelin protections, and Chainlink validation. It trusts Chainlink, OpenZeppelin, and the Ethereum blockchain but remains vulnerable to owner centralization, prolonged Chainlink downtime, and scalability limits. Admin accounts, critical for managing restricted functions in `solarfarm_ui`, are securely created via Firebase and assigned roles using `setInitialAdmin.js`. Auditors should focus on commit-reveal logic, price feed reliability, authorization management, and gas efficiency to ensure robustness.