# EnergyContract

## Project Overview and Goals

`EnergyContract` is a Solidity smart contract designed to facilitate secure and transparent energy trading between a solar farm and authorized buyers on the Ethereum blockchain. The contract enables buyers to purchase energy (in kWh) from a solar farm using a commit-reveal scheme to ensure fairness and security. Key features include:

- **Energy Management**: Allows the solar farm owner to add energy to the available pool with a delay (`ADD_ENERGY_DELAY`) for security.
- **Commit-Reveal Purchases**: Buyers commit to purchases with a hashed commitment (`commitPurchase`) and reveal details (`revealPurchase`) within a time window (`COMMIT_REVEAL_WINDOW`), preventing front-running.
- **Price Oracle Integration**: Uses Chainlink’s ETH/USD price feed (`AggregatorV3Interface`) with a cached fallback (`cachedEthPrice`) to handle price feed failures and ensure accurate payment calculations.
- **Security Features**: Incorporates OpenZeppelin’s `Ownable`, `Pausable`, and `ReentrancyGuard` to protect against unauthorized access, reentrancy attacks, and emergency pauses.
- **Refund Mechanism**: Supports overpayment refunds via `withdrawRefunds`, secured by `nonReentrant`.
- **Visual Documentation**: Includes Mermaid diagrams (`docs/diagrams/`) to visualize contract flows and state transitions.

### Goals

- Provide a secure, gas-efficient platform for energy trading.
- Ensure transparency through event emissions (`EnergyPurchased`, `RefundWithdrawn`, etc.).
- Mitigate risks using security best practices (e.g., commit-reveal, reentrancy guards, price feed validation).
- Facilitate development and testing with Hardhat, Remix, and AI-driven security analysis.

## Quick Start Guide

### Prerequisites

- **Node.js**: v18.x (LTS, e.g., v18.20.4). Install via [nodejs.org](https://nodejs.org/) or `nvm`:
    
    ```bash
    nvm install 18
    nvm use 18
    ```
    
- **npm**: v9.x or later (bundled with Node.js).
- **MetaMask**: For Sepolia testnet deployment (optional).
- **Infura/Alchemy**: For Sepolia RPC URL (optional).
- **VS Code**: Recommended for Hardhat and Mermaid diagram rendering. Install extensions:
    - Solidity (`juanblanco.solidity`)
    - Prettier (`esbenp.prettier-vscode`)
    - ESLint (`dbaeumer.vscode-eslint`)
    - Hardhat (`nomicfoundation.hardhat-vscode`)
    - DotENV (`mikestead.dotenv`)
    - Mermaid Preview (`bierner.markdown-mermaid`)
- **Remix**: Access at [remix.ethereum.org](https://remix.ethereum.org/) for browser-based development.

### Setup

1. **Clone the Repository**:
    
    ```bash
    git clone <repository-url>
    cd energy-contract
    ```
    
2. **Install Dependencies** (Hardhat users):
    
    ```bash
    npm install
    ```
    
    This installs `hardhat@2.22.10`, `@nomicfoundation/hardhat-toolbox@5.0.0`, `@openzeppelin/contracts@5.0.2`, `@chainlink/contracts@0.8.0`, `dotenv@16.4.5`, and `chai@4.5.0`.
    
3. **Configure Environment** (Hardhat users):  
    Create a `.env` file in the project root:
    
    ```plaintext
    SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
    PRIVATE_KEY=your_private_key_here
    ETHERSCAN_API_KEY=your_etherscan_api_key_here
    ```
    
    - Replace placeholders with your Infura/Alchemy URL, wallet private key, and Etherscan API key.
    - Ensure `.env` is added to `.gitignore`.
4. **Remix Setup**:
    
    - Open [remix.ethereum.org](https://remix.ethereum.org/).
    - Upload `contracts/EnergyContract.sol`, `contracts/MockV3Aggregator.sol`, `contracts/MaliciousContract.sol`, and `docs/diagrams/*.mmd`.
    - Set Solidity compiler to `0.8.30` in the "Solidity Compiler" plugin.
5. **Visualize Diagrams**:
    
    - Open `docs/diagrams/*.mmd` in VS Code with the Mermaid Preview extension or paste into [mermaid.live](https://mermaid.live/) to render flowcharts and state diagrams.

## Testing Instructions

### Directory Structure

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
├── docs/
│   └── diagrams/
│       ├── contract-flow.mmd
│       ├── contract-flow-security.mmd
│       ├── commit-reveal-state.mmd
├── .env
├── hardhat.config.js
├── package.json
```

### Test Suites

- **Unit Tests** (`test/unit/EnergyContract.test.js`): Tests individual functions (`authorizeParty`, `commitPurchase`, `revealPurchase`, `withdrawRefunds`) and edge cases (e.g., invalid commitments, price feed failures).
- **Integration Tests** (`test/integration/FullFlow.test.js`): Tests the full purchase flow (`requestAddEnergy` → `confirmAddEnergy` → `commitPurchase` → `revealPurchase`) and pause functionality.
- **Security Tests** (`test/security/SecurityTests.test.js`): Tests reentrancy attacks (via `MaliciousContract.sol`), unauthorized access, and price manipulation.

### Running Tests

1. **Hardhat**:
    
    - Compile contracts:
        
        ```bash
        npx hardhat compile
        ```
        
    - Run all tests:
        
        ```bash
        npx hardhat test
        ```
        
    - Run specific suites:
        
        ```bash
        npx hardhat test test/unit/EnergyContract.test.js
        npx hardhat test test/integration/FullFlow.test.js
        npx hardhat test test/security/SecurityTests.test.js
        ```
        
2. **Remix**:
    
    - Use the "Solidity Unit Testing" plugin to write and run tests.
    - Deploy contracts to the JavaScript VM or Hardhat node (`http://127.0.0.1:8545`).
    - Run "Solidity Static Analysis" and AI-driven analysis (via "Code Analysis" plugin) to detect vulnerabilities (e.g., reentrancy, access control issues).

### Notes

- Use `hardhat-network-helpers` for time manipulation (`evm_increaseTime`) in time-dependent tests.
- The unit test suite references a `maxEthPriceUSD` parameter in `revealPurchase`, which is not in `EnergyContract.sol`. Update tests or contract as needed.
- Cross-reference security findings with Remix’s AI analysis and static analysis reports.

## Deployment Guide

### Local Deployment

1. **Start Hardhat Node** (Hardhat users):
    
    ```bash
    npx hardhat node
    ```
    
    This starts a local blockchain at `http://127.0.0.1:8545`.
    
2. **Deploy Contracts**:
    
    - Hardhat: Run the deployment script:
        
        ```bash
        npx hardhat run scripts/deploy.js --network hardhat
        ```
        
        This deploys `MockV3Aggregator`, `EnergyContract`, and optionally `MaliciousContract`.
    - Remix: Deploy to JavaScript VM or Hardhat node via "Deploy & Run Transactions" plugin, using `0.8.30` compiler.
3. **Verify Deployment**:
    
    - Check console output for contract addresses.
    - Test interactions using Hardhat console or Remix’s interface.

### Sepolia Testnet Deployment

1. **Configure Environment** (Hardhat users):
    
    - Update `.env` with `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.
    - Modify `scripts/deploy.js` to use the Sepolia Chainlink ETH/USD price feed (e.g., `0x694AA1769357215DE4FAC081bf1f309aDC325306`).
2. **Deploy**:
    
    - Hardhat:
        
        ```bash
        npx hardhat run scripts/deploy.js --network sepolia
        ```
        
    - Remix: Select "Injected Web3" in "Deploy & Run Transactions," connect MetaMask with a Sepolia-funded account, and deploy with the correct price feed address.
3. **Verify on Etherscan**:
    
    - Hardhat:
        
        ```bash
        npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <PRICE_FEED_ADDRESS> <SOLAR_FARM_ADDRESS>
        ```
        
    - Remix: Use the "Contract Verification" plugin, providing constructor arguments.

## Contributing Guidelines

### How to Contribute

1. **Fork the Repository**:
    
    ```bash
    git clone <your-forked-repo-url>
    cd energy-contract
    ```
    
2. **Create a Branch**:
    
    ```bash
    git checkout -b feature/your-feature-name
    ```
    
3. **Make Changes**:
    
    - Update contracts, tests, scripts, or diagrams in `docs/diagrams/`.
    - Ensure code follows Solidity style guidelines and is formatted with Prettier.
    - Update tests to cover new functionality or bug fixes.
    - Update Mermaid diagrams if contract logic changes.
4. **Test Changes**:
    
    - Run all tests (`npx hardhat test`) and ensure 100% coverage.
    - Use Remix’s AI and static analysis to verify security.
    - Validate diagrams render correctly using [mermaid.live](https://mermaid.live/).
5. **Commit and Push**:
    
    ```bash
    git commit -m "Add feature: your-feature-name"
    git push origin feature/your-feature-name
    ```
    
6. **Submit a Pull Request**:
    
    - Open a PR against the main repository’s `main` branch.
    - Include a clear description of changes, referencing relevant issues.
    - Ensure tests pass and diagrams are updated.

### Code Standards

- Use Solidity `0.8.30` and follow OpenZeppelin best practices.
- Write clear, modular tests using Mocha/Chai.
- Include custom errors for gas efficiency (e.g., `InvalidCommitmentHash`).
- Update `contract-flow.mmd`, `contract-flow-security.mmd`, and `commit-reveal-state.mmd` for any contract changes.

### Issues and Bugs

- Report issues via GitHub Issues, including steps to reproduce and logs.
- For security vulnerabilities, use Remix’s AI analysis or tools like Slither to verify before submitting.

### Community

- Join discussions on the project’s GitHub Discussions page.
- Contact maintainers for guidance on complex contributions.
