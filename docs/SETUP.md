# Development Setup Guide for EnergyContract

This guide provides a comprehensive setup for developing, testing, and deploying the `EnergyContract` smart contract using Hardhat with the `@nomicfoundation/hardhat-toolbox` plugin and the Remix Solidity IDE with AI-powered security features. It covers IDE configuration, dependencies, local blockchain setup, testing environment, deployment process, professional QA process, and common troubleshooting issues to ensure developers can get productive quickly.

## IDE Configuration

### Recommended IDEs

- **Visual Studio Code (VS Code)**: A lightweight, extensible IDE for Solidity and JavaScript development, ideal for Hardhat integration and local testing.
- **Remix Solidity IDE**: A web-based IDE for Solidity development, offering AI-powered security analysis, static analysis, and easy contract compilation and deployment. Access at [remix.ethereum.org](https://remix.ethereum.org/).

### VS Code Extensions

For developers using VS Code, install the following extensions:

- **Solidity by Juan Blanco** (`juanblanco.solidity`): Provides syntax highlighting, code completion, and linting for Solidity.
- **Prettier** (`esbenp.prettier-vscode`): Formats code for consistency (supports Solidity with a plugin).
- **ESLint** (`dbaeumer.vscode-eslint`): Lints JavaScript/TypeScript files used in Hardhat scripts and tests.
- **Hardhat** (`nomicfoundation.hardhat-vscode`): Integrates Hardhat tasks and debugging, leveraging `hardhat-toolbox`.
- **DotENV** (`mikestead.dotenv`): Supports `.env` file syntax for environment variables.

### VS Code Settings

Add the following to your VS Code `settings.json` (accessed via `File > Preferences > Settings` or `Ctrl+,`):

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.30",
  "solidity.defaultCompiler": "remote",
  "editor.formatOnSave": true,
  "prettier.requireConfig": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[solidity]": {
    "editor.defaultFormatter": "juanblanco.solidity"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.associations": {
    "*.sol": "solidity"
  }
}
```

- Ensures Solidity compiler version matches the contract (`^0.8.30`).
- Enables auto-formatting with Prettier for Solidity and JavaScript files.
- Associates `.sol` files with Solidity.

### Remix Setup and AI Features

Remix is a browser-based IDE that simplifies Solidity development and provides powerful security analysis tools. To set up Remix for `EnergyContract`:

1. **Access Remix**:
    
    - Open [remix.ethereum.org](https://remix.ethereum.org/) in a modern browser (e.g., Chrome, Firefox).
    - Create a new workspace or import files from your local project (e.g., `contracts/EnergyContract.sol`, `contracts/MockV3Aggregator.sol`, `contracts/MaliciousContract.sol`).
2. **Configure Remix**:
    
    - **Solidity Compiler**: In the "Solidity Compiler" plugin, select version `0.8.30` to match the contract's `pragma solidity ^0.8.30`.
    - **Environment**: Use "JavaScript VM" for quick testing or connect to a Hardhat node (`http://127.0.0.1:8545`) via "Injected Web3" or "Web3 Provider" for local blockchain testing.
    - **File Explorer**: Upload or create `EnergyContract.sol`, `MockV3Aggregator.sol`, and `MaliciousContract.sol`.
3. **AI-Powered Security Analysis**:
    
    - **Remix Static Analysis**: Activate the "Solidity Static Analysis" plugin to detect vulnerabilities (e.g., reentrancy in `revealPurchase`, `withdrawRefunds`, unchecked external calls).
    - **AI Features**: Use Remix's experimental AI-driven code analysis (via plugins like "Code Analysis" or third-party integrations) to:
        - Identify security threats (e.g., reentrancy, access control issues, arithmetic overflows).
        - Suggest gas optimizations for functions like `calculateRequiredPayment`.
        - Detect logical errors in the commit-reveal process.
    - **Usage**: Run AI analysis on `EnergyContract.sol` and review reports for warnings about reentrancy, access control, or price feed issues. Cross-reference with `test/security/SecurityTests.test.js`.
    - **Limitations**: AI features are experimental and may miss edge cases. Combine with static analysis and Hardhat tests for comprehensive coverage.
4. **Testing in Remix**:
    
    - Use the "Solidity Unit Testing" plugin to write and run simple tests, complementing Hardhat tests.
    - Deploy contracts to the JavaScript VM or Hardhat node to test interactions (e.g., `authorizeParty`, `commitPurchase`).

## Required Dependencies and Versions

### Node.js and npm

- **Node.js**: v18.x (LTS recommended, e.g., v18.20.4).
- **npm**: v9.x or later (bundled with Node.js).
- Install via [Node.js official site](https://nodejs.org/) or a version manager like `nvm`:
    
    ```bash
    nvm install 18
    nvm use 18
    ```
    

### Hardhat and Hardhat Toolbox

- **Hardhat**: v2.22.10.
- **@nomicfoundation/hardhat-toolbox**: v5.0.0. This plugin bundles essential Hardhat plugins (`hardhat-ethers`, `hardhat-waffle`, `hardhat-chai-matchers`, `hardhat-network-helpers`, `hardhat-verify`) for streamlined testing, deployment, and contract verification.
- Install:
    
    ```bash
    npm install --save-dev hardhat@2.22.10 @nomicfoundation/hardhat-toolbox@5.0.0
    ```
    

### Solidity Compiler

- **Solc**: v0.8.30 (matches `pragma solidity ^0.8.30` in contracts).
- Installed automatically by Hardhat or Remix when compiling.

### OpenZeppelin Contracts

- **@openzeppelin/contracts**: v5.0.2 (for `Ownable`, `Pausable`, `ReentrancyGuard`).
- Install:
    
    ```bash
    npm install --save-dev @openzeppelin/contracts@5.0.2
    ```
    

### Chainlink Contracts

- **@chainlink/contracts**: v0.8.0 (for `AggregatorV3Interface` and `MockV3Aggregator`).
- Install:
    
    ```bash
    npm install --save-dev @chainlink/contracts@0.8.0
    ```
    

### Other Dependencies

- **dotenv**: v16.4.5 (for managing environment variables).
    
    ```bash
    npm install --save-dev dotenv@16.4.5
    ```
    
- **chai**: v4.5.0 (for testing assertions, included via `hardhat-toolbox`).
    
    ```bash
    npm install --save-dev chai@4.5.0
    ```
    

### Project Setup

For Hardhat users, initialize a Hardhat project:

```bash
npx hardhat init
```

Choose "Create a JavaScript project" and select the option to include `hardhat-toolbox`. This sets up the project with the necessary plugins.

Create or update `package.json` with the following dependencies:

```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@openzeppelin/contracts": "^5.0.2",
    "@chainlink/contracts": "^0.8.0",
    "hardhat": "^2.22.10",
    "dotenv": "^16.4.5",
    "chai": "^4.5.0"
  }
}
```

Run `npm install` to install dependencies. For Remix users, dependencies are not required as Remix handles compilation and deployment in-browser.

## Local Blockchain Setup (Hardhat Configuration)

### Hardhat Configuration File

For Hardhat users, create or update `hardhat.config.js` in the project root to leverage `hardhat-toolbox`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      gas: 12000000,
      blockGasLimit: 12000000,
      accounts: {
        count: 20,
        initialBalance: "10000000000000000000000" // 10,000 ETH
      }
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
```

- **Solidity Version**: Matches `^0.8.30` for contract compatibility.
- **Optimizer**: Enabled with 200 runs for gas-efficient bytecode.
- **Hardhat Network**: Configured for local testing with generous gas limits and accounts.
- **Sepolia Network**: Configured for testnet deployment (update with your RPC URL and private key).
- **Etherscan**: For contract verification, enabled via `hardhat-toolbox`.
- **Hardhat Toolbox**: Provides `hardhat-ethers`, `hardhat-waffle`, `hardhat-chai-matchers`, and `hardhat-verify` for testing and deployment.

### Environment Variables

For Hardhat users, create a `.env` file in the project root:

```plaintext
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

- Replace `YOUR_INFURA_KEY` with your Infura project ID.
- Replace `your_private_key_here` with your wallet's private key (never commit to version control).
- Replace `your_etherscan_api_key_here` with your Etherscan API key.
- Use a `.gitignore` to exclude `.env`:
    
    ```plaintext
    node_modules/
    .env
    ```
    

Remix users can configure network settings directly in the IDE's "Deploy & Run Transactions" plugin.

### Starting the Local Blockchain

For Hardhat users, run the Hardhat node:

```bash
npx hardhat node
```

This starts a local Ethereum blockchain at `http://127.0.0.1:8545` with 20 accounts pre-funded with 10,000 ETH each. Remix users can connect to this node via the "Web3 Provider" environment or use the JavaScript VM for quick testing.

## Testing Environment Setup

### Directory Structure

For Hardhat users, organize the project as follows:

```
project-root/
├── contracts/
│   ├── EnergyContract.sol
│   ├── MockV3Aggregator.sol
│   └── MaliciousContract.sol
├── scripts/
│   └── deploy.js
├── test/
│   ├── integration/
│   │   └── FullFlow.test.js
│   ├── security/
│   │   └── SecurityTests.test.js
│   ├── unit/
│   │   └── EnergyContract.test.js
├── .env
├── hardhat.config.js
├── package.json
```

Remix users can upload these files to the Remix File Explorer or create them directly in the IDE.

### Contract Dependencies

- **EnergyContract.sol**: The main smart contract for energy trading, implementing `Ownable`, `Pausable`, `ReentrancyGuard`, and Chainlink's `AggregatorV3Interface`.
- **MockV3Aggregator.sol**: A mock Chainlink price feed for local testing, provided by `@chainlink/contracts`. Example implementation:
    
    ```solidity
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;
    
    contract MockV3Aggregator {
        uint8 public decimals;
        int256 public latestPrice;
        uint256 public latestTimestamp;
    
        constructor(uint8 _decimals, int256 _initialPrice) {
            decimals = _decimals;
            latestPrice = _initialPrice;
            latestTimestamp = block.timestamp;
        }
    
        function updateAnswer(int256 _price) external {
            latestPrice = _price;
            latestTimestamp = block.timestamp;
        }
    
        function updateRoundData(
            uint80 _roundId,
            int256 _answer,
            uint256 _startedAt,
            uint256 _updatedAt
        ) external {
            latestPrice = _answer;
            latestTimestamp = _updatedAt;
        }
    
        function latestRoundData() external view returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            return (1, latestPrice, latestTimestamp, latestTimestamp, 1);
        }
    }
    ```
    
- **MaliciousContract.sol**: Used in security tests to simulate reentrancy attacks. Create in `contracts/` or Remix File Explorer:
    
    ```solidity
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.30;
    
    contract MaliciousContract {
        address public immutable energyContract;
    
        constructor(address _energyContract) {
            energyContract = _energyContract;
        }
    
        function commitPurchase(bytes32 _commitmentHash) external payable {
            (bool success, ) = energyContract.call(
                abi.encodeWithSignature("commitPurchase(bytes32)", _commitmentHash)
            );
            require(success, "Commit purchase failed");
        }
    
        function attackRevealPurchase(uint256 _kWh, uint256 _nonce) external payable {
            (bool success, ) = energyContract.call{value: msg.value}(
                abi.encodeWithSignature("revealPurchase(uint256,uint256)", _kWh, _nonce)
            );
            require(success, "Reveal purchase failed");
        }
    
        function attackWithdrawRefunds() external {
            (bool success, ) = energyContract.call(
                abi.encodeWithSignature("withdrawRefunds()")
            );
            require(success, "Withdraw refunds failed");
        }
    
        receive() external payable {
            (bool success, ) = energyContract.call(
                abi.encodeWithSignature("withdrawRefunds()")
            );
            if (!success) {
                // Silently fail to avoid infinite loop
            }
        }
    }
    ```
    

### Writing Tests

The test suites use Mocha and Chai (via `hardhat-toolbox`) for assertions, with Hardhat for blockchain interactions. Remix users can use the "Solidity Unit Testing" plugin for simpler tests. Three Hardhat test suites are provided:

1. **Unit Tests** (`test/unit/EnergyContract.test.js`):
    
    - Tests individual functions: authorization management (`authorizeParty`, `unAuthorizeParty`), price calculations (`calculateRequiredPayment`, `getLatestEthPrice`), commit-reveal security (`commitPurchase`, `revealPurchase`), and pull-based payments (`withdrawRefunds`).
    - Covers edge cases: duplicate authorizations, invalid commitment hashes, price feed failures, and commitment cooldown.
    - Note: The provided test suite references a `maxEthPriceUSD` parameter in `revealPurchase`, which is not present in `EnergyContract.sol`. This suggests a potential contract update or test inconsistency.
2. **Integration Tests** (`test/integration/FullFlow.test.js`):
    
    - Tests the complete purchase flow: `authorizeParty`, `requestAddEnergy`, `confirmAddEnergy`, `commitPurchase`, `revealPurchase`.
    - Tests emergency pause scenarios using the `Pausable` modifier.
3. **Security Tests** (`test/security/SecurityTests.test.js`):
    
    - Tests reentrancy attacks using `MaliciousContract.sol` on `revealPurchase` and `withdrawRefunds`.
    - Tests unauthorized access to owner-only and authorized-party-only functions.
    - Tests price manipulation scenarios (invalid/stale prices, cached price fallback).

### Running Tests

For Hardhat users, compile and run all tests using `hardhat-toolbox`:

```bash
npx hardhat compile
npx hardhat test
```

To run specific test suites:

```bash
npx hardhat test test/unit/EnergyContract.test.js
npx hardhat test test/integration/FullFlow.test.js
npx hardhat test test/security/SecurityTests.test.js
```

The `hardhat-toolbox` plugin provides `hardhat-chai-matchers` for advanced assertions (e.g., `to.emit`, `to.be.revertedWithCustomError`) and `hardhat-network-helpers` for time manipulation (`evm_increaseTime`, `evm_mine`).

For Remix users:

- Use the "Solidity Unit Testing" plugin to write and run tests directly in Remix.
- Deploy contracts to the JavaScript VM or connect to a Hardhat node (`http://127.0.0.1:8545`) for testing.
- Run static analysis and AI-driven security checks on `EnergyContract.sol` to complement Hardhat tests.

### Writing Additional Tests

Follow these best practices for Hardhat and Remix tests:

- **Use Helpers**: Leverage helper functions (`addEnergy`, `authorizeParty`, `getHashedCommitment`, `commitPurchase`, `revealPurchase`, `advanceTime`) for consistent setup in Hardhat tests.
- **Fetch Constants**: Retrieve constants (`MAX_KWH_PER_PURCHASE`, `PRICE_PER_KWH_USD_CENTS`, `ADD_ENERGY_DELAY`, `COMMIT_REVEAL_WINDOW`) from the contract to avoid hardcoding.
- **Test Edge Cases**: Cover all custom errors (e.g., `InvalidCommitmentHash`, `PriceFeedStale`, `MaxAuthorizedPartiesReached`) and boundary conditions (e.g., zero inputs, maximum kWh).
- **Simulate Attacks**: Use `MaliciousContract.sol` to test reentrancy or other attack vectors in Hardhat or Remix.
- **Verify Events**: Check emitted events (`Authorized`, `EnergyAdded`, `EnergyPurchased`, etc.) for state-changing functions.
- **Manipulate Time**: Use `hardhat-network-helpers` (`evm_increaseTime`, `evm_mine`) in Hardhat or Remix's JavaScript VM for time-dependent tests.
- **Security Analysis**: In Remix, run "Solidity Static Analysis" and AI-driven analysis to detect vulnerabilities (e.g., reentrancy, access control issues) before running Hardhat tests.

## Deployment Process Step-by-Step

### 1. Compile Contracts

For Hardhat users:

```bash
npx hardhat compile
```

For Remix users, compile contracts in the "Solidity Compiler" plugin, ensuring version `0.8.30` is selected.

### 2. Create a Deployment Script (Hardhat)

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy MockV3Aggregator for testing (skip for mainnet/testnet)
  const MockV3Aggregator = await hre.ethers.getContractFactory("MockV3Aggregator");
  const priceFeed = await MockV3Aggregator.deploy(8, 2000 * 10 ** 8); // $2,000 ETH/USD
  await priceFeed.deployed();
  console.log("MockV3Aggregator deployed to:", priceFeed.address);

  // Deploy EnergyContract
  const EnergyContract = await hre.ethers.getContractFactory("EnergyContract");
  const energyContract = await EnergyContract.deploy(priceFeed.address, deployer.address);
  await energyContract.deployed();
  console.log("EnergyContract deployed to:", energyContract.address);

  // Deploy MaliciousContract for security tests (optional)
  const MaliciousContract = await hre.ethers.getContractFactory("MaliciousContract");
  const maliciousContract = await MaliciousContract.deploy(energyContract.address);
  await maliciousContract.deployed();
  console.log("MaliciousContract deployed to:", maliciousContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

For Remix users, deploy contracts via the "Deploy & Run Transactions" plugin, selecting the JavaScript VM or Hardhat node.

### 3. Deploy to Local Blockchain

For Hardhat users, start the Hardhat node:

```bash
npx hardhat node
```

Deploy the contracts:

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

For Remix users, deploy to the JavaScript VM or connect to the Hardhat node (`http://127.0.0.1:8545`) via "Web3 Provider".

### 4. Deploy to Sepolia Testnet

For Hardhat users, update `.env` with your Sepolia RPC URL, private key, and Etherscan API key. Modify `scripts/deploy.js` to use the Sepolia Chainlink ETH/USD price feed address (e.g., `0x694AA1769357215DE4FAC081bf1f309aDC325306`). Deploy:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

For Remix users, select "Injected Web3" in the "Deploy & Run Transactions" plugin, connect to MetaMask with a Sepolia-funded account, and deploy with the correct price feed address.

### 5. Verify Contract on Etherscan

For Hardhat users, verify the contract using `hardhat-verify` (included in `hardhat-toolbox`):

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <PRICE_FEED_ADDRESS> <SOLAR_FARM_ADDRESS>
```

Replace `<CONTRACT_ADDRESS>`, `<PRICE_FEED_ADDRESS>`, and `<SOLAR_FARM_ADDRESS>` with the deployed addresses.

For Remix users, use the "Contract Verification" plugin to verify the contract on Etherscan, providing the same constructor arguments.

## Professional QA Process

The QA process for `EnergyContract` is designed to ensure robustness, security, and reliability through comprehensive testing strategies. Below are answers to key testing strategy questions, addressing critical functions, potential attacks, price feed reliability, network congestion, and payment handling.

### 1. What's the most critical function to test first?

The **most critical function** to test first is `revealPurchase(uint256 _kWh, uint256 _nonce)`. This function is central to the contract’s core functionality, as it:

- Finalizes energy purchases by validating commitments (`keccak256(abi.encodePacked(_kWh, _nonce, msg.sender))` against `commitmentHash`).
- Handles ETH payments (`msg.value >= totalCostWei`), deducts `availableKWh`, and transfers funds to `paymentReceiver`.
- Interacts with the Chainlink price feed (`getLatestEthPrice`) and updates `cachedEthPrice`.
- Uses `nonReentrant` to prevent reentrancy attacks and checks `COMMIT_REVEAL_WINDOW` for commitment validity.

**Why it’s critical**:

- It processes financial transactions, making it a prime target for attacks (e.g., reentrancy, price manipulation).
- It relies on external data (Chainlink price feed), introducing potential failure points (e.g., stale or invalid prices).
- Errors in this function could lead to incorrect energy allocation, payment failures, or loss of funds.

**Testing approach**:

- **Unit Tests**: Verify commitment validation, payment calculations (`calculateRequiredPayment`), and `availableKWh` updates. Test edge cases (e.g., zero `_kWh`, invalid `_nonce`, insufficient `msg.value`).
- **Security Tests**: Use `MaliciousContract.sol` to attempt reentrancy attacks (e.g., via `attackRevealPurchase`). Test with invalid/stale Chainlink prices (`PriceFeedStale`, `InvalidPriceBounds`).
- **Integration Tests**: Simulate the full flow (`commitPurchase` → `revealPurchase`) with valid and invalid inputs.
- **Remix Analysis**: Run static analysis and AI-driven checks to detect logical errors or vulnerabilities in payment logic.

### 2. What attack would you try if you wanted to steal energy or ETH?

To steal energy or ETH, the most likely attack vector would be a **reentrancy attack** targeting the `revealPurchase` or `withdrawRefunds` functions, as both handle ETH transfers. The attack would involve:

- **Attack Vector**: Deploy a malicious contract (like `MaliciousContract.sol`) that calls `revealPurchase` or `withdrawRefunds` and re-enters the contract via its `receive` function to repeatedly drain funds before state updates.
- **Example Attack**:
    1. An attacker commits a valid purchase (`commitPurchase`) with a correct `commitmentHash`.
    2. In `revealPurchase`, the contract transfers ETH to `paymentReceiver` (potentially the attacker’s contract) before updating `availableKWh` or clearing `purchaseCommitments`.
    3. The attacker’s `receive` function re-calls `revealPurchase` or `withdrawRefunds`, attempting to drain `pendingRefunds` or bypass energy deductions.
- **Mitigation in Contract**: The `nonReentrant` modifier (from `ReentrancyGuard`) prevents reentrancy by locking the function during execution. The contract also uses a pull-based payment system (`withdrawRefunds`) to minimize direct ETH transfers.
- **Testing Strategy**:
    - Deploy `MaliciousContract.sol` and simulate reentrancy via `attackRevealPurchase` and `attackWithdrawRefunds` in `test/security/SecurityTests.test.js`.
    - Verify that `nonReentrant` reverts reentrant calls with `ReentrancyGuard: reentrant call`.
    - Test edge cases: multiple rapid calls to `withdrawRefunds`, large overpayments to inflate `pendingRefunds`.
    - Use Remix’s static analysis to confirm reentrancy protection.

### 3. How do you ensure price feed reliability?

Price feed reliability is critical for accurate payment calculations in `revealPurchase`. The contract uses Chainlink’s `AggregatorV3Interface` with the following mechanisms to ensure reliability:

- **Chainlink Price Validation**: The `getLatestEthPrice` function checks:
    - Price is positive (`price > 0`).
    - Data is not stale (`updatedAt > block.timestamp - STALENESS_THRESHOLD`).
    - Round is complete (`answeredInRound >= roundId`).
    - Price is within bounds (`100 * 10^8 <= price <= 10000 * 10^8`).
- **Cached Price Fallback**: If Chainlink data is invalid, the contract uses `cachedEthPrice` (updated by `getLatestEthPrice`) unless it’s stale (`block.timestamp > priceLastUpdated + STALENESS_THRESHOLD`), reverting with `PriceFeedStale`.
- **Event Emission**: `PriceCacheUpdated` logs price updates for transparency.

**Testing Strategy**:

- **Unit Tests**: Test `getLatestEthPrice` with valid, stale, negative, and out-of-bounds prices using `MockV3Aggregator.sol`. Verify fallback to `cachedEthPrice` and `PriceFeedStale` reverts.
- **Integration Tests**: Simulate Chainlink failures in `revealPurchase` and confirm correct use of `cachedEthPrice`.
- **Security Tests**: Attempt price manipulation by updating `MockV3Aggregator` with invalid prices and verify `InvalidPriceBounds` reverts.
- **Remix Analysis**: Use AI-driven analysis to check for price feed dependency issues. Run static analysis to detect unchecked external calls.
- **Monitoring**: In production, monitor `lastChainlinkFailure` and `PriceCacheUpdated` events to detect price feed issues. Consider multi-oracle integration for enhanced reliability in future updates.

### 4. What happens during network congestion?

Network congestion (e.g., high gas prices, delayed transactions) can impact `EnergyContract` operations, particularly time-sensitive functions like `confirmAddEnergy` and `revealPurchase`. The contract’s design mitigates some risks:

- **Time-Sensitive Operations**:
    - `confirmAddEnergy`: Requires `ADD_ENERGY_DELAY` (2 minutes) to elapse. Congestion may delay confirmation, but the delay ensures security without breaking functionality.
    - `revealPurchase`: Must be called within `COMMIT_REVEAL_WINDOW` (5 minutes). Congestion could cause commitments to expire, reverting with `CommitmentExpired`.
- **Gas Limits**: External calls (e.g., ETH transfers to `paymentReceiver`) use `MAX_GAS_FOR_CALL` (5,000,000), reducing the risk of out-of-gas errors during congestion.
- **Pausable**: The owner can pause the contract (`pause`) during extreme congestion to prevent failed transactions or unsafe operations.

**Testing Strategy**:

- **Simulate Congestion**: Use Hardhat’s `hardhat-network-helpers` to increase block times (`evm_increaseTime`) and test `CommitmentExpired` and `DelayNotElapsed` reverts.
- **Gas Tests**: Deploy on a testnet (e.g., Sepolia) with simulated high gas prices to verify `MAX_GAS_FOR_CALL` sufficiency. Test with low gas limits to trigger `PaymentFailed`.
- **Integration Tests**: Test full flows under delayed conditions, ensuring state consistency (e.g., `availableKWh`, `pendingRefunds`).
- **Remix Testing**: Use JavaScript VM to simulate delayed transactions by advancing block timestamps.
- **Mitigation**: Document the need for users to set appropriate gas prices during congestion. Consider adding a `clearExpiredCommitment` test to handle expired commitments gracefully.

### 5. How do you handle partial payments or overpayments?

The `EnergyContract` handles partial payments and overpayments in `revealPurchase` as follows:

- **Partial Payments**: If `msg.value < totalCostWei` (calculated via `calculateRequiredPayment`), the transaction reverts with `PaymentAmountTooSmall`. This ensures no energy is allocated without full payment.
- **Overpayments**: If `msg.value > totalCostWei`, the excess ETH is stored in `pendingRefunds[msg.sender]`. Users can retrieve overpayments via `withdrawRefunds`, which is secured by `nonReentrant` and reverts with `NoRefundsAvailable` if no funds are available.
- **Security Measures**:
    - The contract clears `purchaseCommitments` after a successful `revealPurchase` to prevent double-spending.
    - ETH transfers to `paymentReceiver` and refunds use `MAX_GAS_FOR_CALL` to mitigate out-of-gas risks.
    - The `PriceCacheUpdated` event logs price changes to ensure transparency in payment calculations.

**Testing Strategy**:

- **Unit Tests**: Test `revealPurchase` with `msg.value` below, equal to, and above `totalCostWei`. Verify `PaymentAmountTooSmall` reverts and `pendingRefunds` updates for overpayments.
- **Security Tests**: Use `MaliciousContract.sol` to attempt reentrancy on `withdrawRefunds` with large overpayments. Verify `nonReentrant` protection.
- **Integration Tests**: Simulate a full purchase flow with overpayments, followed by `withdrawRefunds`, and check `RefundWithdrawn` events.
- **Remix Analysis**: Run static analysis to verify safe ETH transfers and AI-driven checks for refund logic errors.
- **Edge Cases**: Test zero `msg.value`, maximum `msg.value`, and multiple overpayment withdrawals to ensure state consistency.

## Common Troubleshooting Issues

### 1. Compilation Errors

- **Issue**: "Compiler version mismatch" or "Unknown pragma".
    - **Solution**: Ensure `hardhat.config.js` (Hardhat) or Remix's "Solidity Compiler" plugin specifies `solidity: "0.8.30"`. Update `package.json` dependencies if mismatched.
- **Issue**: Missing dependencies (e.g., `@openzeppelin/contracts`).
    - **Solution**: Run `npm install` for Hardhat. In Remix, ensure contract imports (e.g., OpenZeppelin) are accessible via npm or GitHub.

### 2. Test Failures

- **Issue**: Tests fail due to invalid Chainlink price feed data.
    - **Solution**: Ensure `MockV3Aggregator` is deployed with valid parameters (e.g., 8 decimals, positive price). Update `latestPrice` or `updatedAt` in tests for staleness scenarios.
- **Issue**: Gas limit exceeded in tests.
    - **Solution**: Increase `blockGasLimit` in `hardhat.config.js` or specify higher `gasLimit` in test transactions (e.g., `revealPurchase`). In Remix, adjust gas limits in the "Deploy & Run Transactions" plugin.
- **Issue**: `InvalidCommitment` or `CommitmentExpired` errors.
    - **Solution**: Verify commitment hashes match (`getHashedCommitment`) and `COMMIT_REVEAL_WINDOW` has not expired. Use `hardhat-network-helpers` (`evm_increaseTime`) or Remix's JavaScript VM correctly.
- **Issue**: Reentrancy tests fail unexpectedly.
    - **Solution**: Ensure `MaliciousContract.sol` is deployed and correctly interacts with `EnergyContract`. Check gas limits for `attackRevealPurchase` and `attackWithdrawRefunds`.

### 3. Deployment Issues

- **Issue**: "Invalid RPC URL" or "Network error".
    - **Solution**: Verify `SEPOLIA_RPC_URL` in `.env` (Hardhat) or MetaMask settings (Remix). Test connectivity with `curl <RPC_URL>`.
- **Issue**: "Insufficient funds" error.
    - **Solution**: Fund the deployer account with ETH on Sepolia using a faucet (e.g., [Infura Sepolia Faucet](https://www.infura.io/faucet)).
- **Issue**: "Contract verification failed".
    - **Solution**: Confirm `ETHERSCAN_API_KEY` is correct (Hardhat) or entered correctly in Remix's "Contract Verification" plugin. Ensure constructor arguments match the deployment script.

### 4. Runtime Errors

- **Issue**: `PriceFeedStale` or `InvalidEthPrice` during `revealPurchase`.
    - **Solution**: Update `MockV3Aggregator` with a valid price and recent `updatedAt`. Ensure the cache is initialized via `getLatestEthPrice`. In Remix, test price feed interactions in the JavaScript VM.
- **Issue**: `PaymentFailed` during `revealPurchase` or `withdrawRefunds`.
    - **Solution**: Verify `paymentReceiver` is a valid EOA (checked in `updatePaymentReceiver`). Check `MAX_GAS_FOR_CALL` is sufficient in the contract.
- **Issue**: Tests fail due to mismatched constants.
    - **Solution**: Fetch constants (`MAX_KWH_PER_PURCHASE`, `PRICE_PER_KWH_USD_CENTS`) from the contract instead of hardcoding.

### 5. Environment Issues

- **Issue**: `.env` file not loading (Hardhat).
    - **Solution**: Ensure `dotenv` is installed and `require("dotenv").config()` is in `hardhat.config.js`. Check `.env` file permissions.
- **Issue**: Node.js version conflicts (Hardhat).
    - **Solution**: Use `nvm` to switch to Node.js v18.x (`nvm install 18 && nvm use 18`).
- **Issue**: Remix AI analysis fails to detect issues.
    - **Solution**: Ensure the latest Remix version is used. Run "Solidity Static Analysis" alongside AI features for comprehensive checks. Cross-reference with Hardhat security tests.

### 6. Remix-Specific Issues

- **Issue**: Remix fails to connect to Hardhat node.
    - **Solution**: Ensure the Hardhat node is running (`npx hardhat node`) and Remix is set to "Web3 Provider" with the correct URL (`http://127.0.0.1:8545`).
- **Issue**: AI features unavailable or outdated.
    - **Solution**: Check for Remix plugin updates or use an alternative browser. Fall back to static analysis or Hardhat security tests if AI features are unstable.

## Conclusion

This setup guide provides a complete environment for developing, testing, and deploying the `EnergyContract` smart contract using Hardhat with `@nomicfoundation/hardhat-toolbox` and Remix Solidity IDE with AI-powered security features. It includes instructions for configuring VS Code and Remix, installing dependencies, setting up a local Hardhat blockchain, running unit, integration, and security tests, and deploying to local and testnet environments. The professional QA process ensures robustness by addressing critical functions, potential attacks, price feed reliability, network congestion, and payment handling. Troubleshooting tips address common issues to minimize downtime.
