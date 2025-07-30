Below is a complete `README.md` file tailored for your `EnergyContract` project, reflecting your use of the Hardhat testnet, the recent implementation of gas estimation, and the current date and time (11:55 AM EEST, Wednesday, July 30, 2025). This file consolidates the project overview, setup instructions, testing, deployment, and contributing guidelines from your previous documentation, ensuring it’s concise yet comprehensive for users and contributors.

# EnergyContract

## Project Overview

**EnergyContract** is a Solidity smart contract designed to facilitate secure and transparent energy trading between a solar farm and authorized buyers on the Ethereum blockchain. It uses a commit-reveal scheme to ensure fairness and security for energy purchases (in kWh). The accompanying Next.js frontend (`solarfarm_ui`) provides a user-friendly interface, integrated with Firebase for authentication and data storage. Key features include:

- **Energy Management**: Allows the solar farm owner to add energy with a delay (`ADD_ENERGY_DELAY`) via `addEnergy`.
- **Commit-Reveal Purchases**: Buyers commit (`commitPurchase`) and reveal (`revealPurchase`) within `COMMIT_REVEAL_WINDOW` to prevent front-running.
- **Price Oracle**: Integrates Chainlink’s ETH/USD price feed with a cached fallback (`cachedEthPrice`) for payment accuracy.
- **Security**: Uses OpenZeppelin’s Ownable, Pausable, and ReentrancyGuard to protect against unauthorized access and reentrancy attacks.
- **Refund Mechanism**: Supports overpayment refunds via `withdrawRefunds` with `nonReentrant`.
- **Gas Estimation**: Offers real-time gas cost estimates for commit and reveal purchases via the `/buySolar` UI, using `utils/contract.js`.
- **Visual Documentation**: Includes Mermaid diagrams in `docs/diagrams/` for contract and frontend flows.

## Goals
- Provide a secure, gas-efficient energy trading platform.
- Ensure transparency with event emissions (e.g., `EnergyPurchased`, `RefundWithdrawn`).
- Mitigate risks using best practices (e.g., commit-reveal, reentrancy guards).
- Enhance user experience with transparent gas and energy cost estimates.
- Support development and testing with Hardhat, Remix, Next.js, Firebase, and AI tools (e.g., Grok).

## Quick Start Guide
### Prerequisites
- **Node.js**: v18.x (e.g., v18.20.4). Install via [nodejs.org](https://nodejs.org) or `nvm: nvm install 18 && nvm use 18`.
- **npm**: v9.x or later (bundled with Node.js).
- **MetaMask**: For Hardhat testnet interaction (optional).
- **Firebase Account**: For `solarfarm_ui` authentication and database.
- **VS Code**: Recommended with extensions:
  - Solidity (juanblanco.solidity)
  - Prettier (esbenp.prettier-vscode)
  - ESLint (dbaeumer.vscode-eslint)
  - Hardhat (nomicfoundation.hardhat-vscode)
  - DotENV (mikestead.dotenv)
  - Mermaid Preview (bierner.markdown-mermaid)
  - Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
- **Browser Developer Tools**: Enable (F12) to inspect gas estimation logs.

### Setup
1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd energy-contract
   ```

2. **Install Backend Dependencies**
   ```bash
   npm install
   ```
   Installs `hardhat@2.22.10`, `@nomicfoundation/hardhat-toolbox@5.0.0`, `@openzeppelin/contracts@5.0.2`, `@chainlink/contracts@0.8.0`, `dotenv@16.4.5`, and `chai@4.5.0`.

3. **Configure Backend Environment**
   Create a `.env` file:
   ```
   RPC_URL=http://127.0.0.1:8545
   PRIVATE_KEY=your_private_key_here
   ```
   - Use `http://127.0.0.1:8545` for Hardhat.
   - Replace with a test private key (e.g., from Hardhat accounts).
   - Add `.env` to `.gitignore`.

4. **Install Frontend Dependencies**
   ```bash
   cd solarfarm_ui
   npm install
   ```
   Installs `next@15.0.1`, `firebase@10.14.1`, `firebase-admin@12.5.0`, `tailwindcss@3.4.14`, and others.

5. **Configure Frontend Environment**
   Create `solarfarm_ui/.env`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-database-name.firebaseio.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
   NEXT_PUBLIC_PRICE_FEED_ADDRESS=your_price_feed_address
   ```
   - Get Firebase credentials from [console.firebase.google.com](https://console.firebase.google.com).
   - Add `solarfarm_ui/.env` and `solarfarm_ui/*.json` to `.gitignore`.
   - Ensure `NEXT_PUBLIC_CONTRACT_ADDRESS` matches the Hardhat deployment.

6. **Run Hardhat Node**
   ```bash
   npx hardhat node
   ```

7. **Deploy Contracts**
   ```bash
   npx hardhat run scripts/deploy.js --network hardhat
   ```
   Updates `solarfarm_ui/.env` with the deployed `CONTRACT_ADDRESS`.

8. **Run Frontend**
   ```bash
   cd solarfarm_ui
   npm run dev
   ```
   Access at [http://localhost:3000](http://localhost:3000).

9. **Verify Gas Estimation**
   - Navigate to `/buySolar`, enter an amount (e.g., 20 kWh), and click 'Estimate Costs'.
   - Check console logs (F12) for gas estimates. Ensure sufficient `availableKWh` (add via `requestAddEnergy` and `confirmAddEnergy`).
   - If 'Nonce too low' occurs, restart `npx hardhat node` or use `mining: { auto: false, interval: 5000 }` in `hardhat.config.js`.

## Testing Instructions

### Test Suites
- **Unit Tests (`test/unit/EnergyContract.test.js`)**: Tests functions (`authorizeParty`, `commitPurchase`, `revealPurchase`, etc.) and edge cases.
- **Integration Tests (`test/integration/FullFlow.test.js`)**: Tests full flow (`requestAddEnergy` → `confirmAddEnergy` → `commitPurchase` → `revealPurchase`).
- **Security Tests (`test/security/SecurityTests.test.js`)**: Tests reentrancy, access control, and price manipulation.
- **Gas Estimation Tests**: Add to `test/unit/EnergyContract.test.js` to verify `estimateGasForCommitPurchase` and `estimateGasForRevealPurchase` with edge cases (e.g., `InsufficientEnergyAvailable`).

### Running Tests
- **Compile Contracts**:
  ```bash
  npx hardhat compile
  ```
- **Run Tests**:
  ```bash
  npx hardhat test
  ```
  Or specific suites:
  ```bash
  npx hardhat test test/unit/EnergyContract.test.js
  ```
- **Check Gas Logs**: Use `console.log` outputs in `utils/contract.js` for gas estimation.

### Notes
- Use `hardhat-network-helpers` (`evm_increaseTime`) for time-based tests.
- Validate flows against `docs/diagrams/`.

## Deployment Guide

### Local Deployment
1. **Start Hardhat Node**
   ```bash
   npx hardhat node
   ```
2. **Deploy Contracts**
   ```bash
   npx hardhat run scripts/deploy.js --network hardhat
   ```
3. **Deploy Frontend**
   ```bash
   cd solarfarm_ui
   npm run dev
   ```
4. **Verify**
   - Check console for addresses.
   - Test at [http://localhost:3000](http://localhost:3000).
   - Validate gas estimation on `/buySolar`.

## Visual Documentation
- **Diagrams (`docs/diagrams/`)**:
  - `contract-flow.mmd`: Contract function flow.
  - `contract-flow-security.mmd`: Security features.
  - `commit-reveal-state.mmd`: Commit-reveal states.
  - `login-flow.mmd`: Login sequence.
  - `purchase-energy-flow.mmd`: Purchase flow with gas estimation.
  - `add-energy-flow.mmd`: Add energy flow.
  - `update-price-flow.mmd`: Update price flow.
- **Render**: Use VS Code Mermaid Preview or [mermaid.live](https://mermaid.live).

## Contributing Guidelines

### How to Contribute
1. **Fork the Repository**
   ```bash
   git clone <your-forked-repo-url>
   cd energy-contract
   ```
2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make Changes**
   - Update `contracts/`, `test/`, `scripts/`, `solarfarm_ui/`, or `docs/diagrams/`.
   - Format with Prettier.
   - Update tests and diagrams.
   - Modify gas estimation in `utils/contract.js` or tests if needed.
4. **Test Changes**
   - Run `npx hardhat test`.
   - Test frontend with `npm run dev` in `solarfarm_ui`.
   - Validate diagrams.
5. **Commit and Push**
   ```bash
   git commit -m "Add feature: your-feature-name"
   git push origin feature/your-feature-name
   ```
6. **Submit a PR**
   - Open against `main`.
   - Describe changes and update diagrams.

### Code Standards
- Use Solidity 0.8.30 and OpenZeppelin practices.
- Write modular tests with Mocha/Chai and hardhat.
- Use React/Next.js and Tailwind CSS.
- Optimize gas usage in gas estimation functions.

### Issues and Bugs
- Report via GitHub Issues with logs.
- Use Remix AI for security issues.

## Security Considerations
- **Backend**: Protect `.env`, validate `SolarFarmABI.json`, test edge cases, secure gas inputs.
- **Frontend**: Secure Firebase credentials, validate admin actions, sanitize gas estimation inputs.
- **AI Usage**: Review AI-generated code (e.g., `OrderItem.jsx`) manually.

## Changelog
- **July 30, 2025**: Added gas estimation feature for commit and reveal purchases, including UI integration and error handling (11:55 AM EEST).