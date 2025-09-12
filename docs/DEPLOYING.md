# EnergyContract Deployment Documentation

This document outlines the steps to deploy the `EnergyContract` smart contract to the Sepolia testnet using Hardhat. The deployment uses the live Sepolia network to interact with the Chainlink ETH/USD price feed (`0x694AA1769357215DE4FAC081bf1f309aDC325306`), avoiding the `PriceFeedStale(0, 900)` error encountered in the forked environment. It also addresses the `HH605: Unsupported network for JSON-RPC server` error by ensuring the correct network is used for deployment.

## Prerequisites

Before deploying, ensure the following requirements are met:

1. **Node.js and Hardhat**:
    
    - Install Node.js (v14 or later).
    - Initialize a Hardhat project:
        
        ```bash
        npm init -y
        npm install --save-dev hardhat
        npx hardhat init
        ```
        
    - Install required dependencies:
        
        ```bash
        npm install @nomicfoundation/hardhat-toolbox dotenv
        ```
        
2. **Environment Variables**:
    
    - Create a `.env` file in the project root with:
        
        ```
        ALCHEMY_APIKEY=your-alchemy-api-key
        PRIVATE_KEY=your-64-character-hex-private-key
        ETHERSCAN_APIKEY=your-etherscan-api-key
        ```
        
    - **ALCHEMY_APIKEY**: Obtain from [https://www.alchemy.com/](https://www.alchemy.com/) for Sepolia RPC access.
    - **PRIVATE_KEY**: A 64-character hexadecimal private key (without `0x`) for an account with Sepolia ETH. Generate a new key for testing if needed:
        
        ```javascript
        const { ethers } = require("ethers");
        const wallet = ethers.Wallet.createRandom();
        console.log("Private Key:", wallet.privateKey.slice(2));
        ```
        
    - **ETHERSCAN_APIKEY**: Obtain from [https://etherscan.io/apis](https://etherscan.io/apis) for contract verification.
    - Ensure `.env` is in `.gitignore` to protect sensitive data.
3. **Sepolia ETH**:
    
    - Fund the account associated with `PRIVATE_KEY` with Sepolia ETH using faucets:
        - [https://www.ethereumsepoliafaucet.com/](https://www.ethereumsepoliafaucet.com/)
        - [https://www.alchemy.com/faucets/ethereum-sepolia](https://www.alchemy.com/faucets/ethereum-sepolia)
    - Verify the balance in MetaMask or via script (see deployment script).
4. **MetaMask**:
    
    - Install MetaMask in your browser (e.g., Chrome, Firefox).
    - Import the `PRIVATE_KEY` account:
        - Click **Import Account** > **Private Key** > Paste the 64-character `PRIVATE_KEY` from `.env`.
    - Connect to Sepolia testnet:
        - Network Name: Sepolia Test Network
        - RPC URL: `https://eth-sepolia.g.alchemy.com/v2/your-alchemy-api-key`
        - Chain ID: `11155111`
        - Currency Symbol: ETH
        - Block Explorer: `https://sepolia.etherscan.io`
5. **Contract Code**:
    
    - Ensure `EnergyContract.sol` is in the `contracts/` directory, using the Chainlink price feed and functions like `getLatestEthPrice`. Example:
        
        ```solidity
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.30;
        
        import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
        
        contract EnergyContract {
            AggregatorV3Interface internal priceFeed;
            address public owner;
            int256 private cachedPrice;
            uint256 private constant MAX_AGE = 900; // 15 minutes
        
            constructor(address _priceFeed, address _owner) {
                priceFeed = AggregatorV3Interface(_priceFeed);
                owner = _owner;
            }
        
            function getLatestEthPrice() public returns (int256) {
                (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
                require(updatedAt > 0, "Invalid timestamp");
                require(block.timestamp <= updatedAt + MAX_AGE, "PriceFeedStale");
                cachedPrice = price;
                return price;
            }
        
            function getCachedEthPrice() public view returns (int256) {
                return cachedPrice;
            }
        
            function requestAddEnergy(uint256 energy) public {
                // Add logic for energy request
            }
        
            function confirmAddEnergy(uint256 energy) public {
                // Add logic for energy confirmation
            }
        
            function authorizeParty(address party) public {
                // Add authorization logic
            }
        
            function checkAuthState(address party) public view returns (bool) {
                // Return authorization state
                return true;
            }
        
            function calculateRequiredPayment(uint256 months, uint256 energy) public view returns (uint256) {
                // Return calculated cost
                return 0;
            }
        }
        ```
        

## Configuration

### Hardhat Configuration

The `hardhat.config.js` file configures Hardhat for Sepolia deployment, including gas settings and Etherscan verification to avoid errors like `HH605`.

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Debug: Log environment variables to verify loading
console.log("ALCHEMY_APIKEY:", process.env.ALCHEMY_APIKEY ? "Loaded" : "Undefined");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Loaded" : "Undefined");
console.log("ETHERSCAN_APIKEY:", process.env.ETHERSCAN_APIKEY ? "Loaded" : "Undefined");

// Validate PRIVATE_KEY format
if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is not defined in .env file");
}
if (!/^[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY)) {
  throw new Error("PRIVATE_KEY is invalid: must be a 64-character hexadecimal string without 0x");
}

module.exports = {
  solidity: "0.8.30",
  networks: {
    hardhat: {
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
      chainName: "Hardhat",
      currency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: [],
      forking: {
        url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,
      },
      accounts: undefined, // Use default accounts for forking
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      chainName: "Hardhat",
      currency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: [],
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 2000000000, // 2 gwei, adjust based on https://sepolia.etherscan.io/gastracker
      gas: 8000000, // Max gas limit for deployment
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_APIKEY,
  },
};
```

**Key Settings**:

- **Sepolia Network**: Configured with Alchemy RPC URL, `PRIVATE_KEY`, and gas settings (`gasPrice: 2 gwei`, `gas: 8000000`).
- **Etherscan**: Set up for contract verification.
- **Debugging**: Logs environment variables to ensure correct loading.

**Action**:

1. Save `hardhat.config.js` in the project root.
2. Ensure `.env` includes valid `ALCHEMY_APIKEY`, `PRIVATE_KEY`, and `ETHERSCAN_APIKEY`.

## Deployment Process

### Deployment Script

The `deploy.js` script deploys `EnergyContract` to Sepolia, verifies it on Etherscan, and tests key functions, avoiding the `PriceFeedStale` error by using the live price feed.

```javascript
// scripts/deploy.js
const { ethers, run } = require("hardhat");

const addEnergy = async (energyContract, signer, energy) => {
  const contractWithSigner = energyContract.connect(signer);
  console.log("Requesting addEnergy...");
  const tx = await contractWithSigner.requestAddEnergy(energy);
  await tx.wait();
  console.log("addEnergy requested:", tx.hash);
  console.log("Confirming addEnergy...");
  const confirmTx = await contractWithSigner.confirmAddEnergy(energy);
  await confirmTx.wait();
  console.log("addEnergy confirmed:", confirmTx.hash);
};

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log("Network chainId:", network.chainId);
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has 0 ETH. Fund the account with Sepolia ETH from a faucet.");
  }

  const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const EnergyContract = await ethers.getContractFactory("EnergyContract");
  console.log("Deploying EnergyContract to Sepolia...");
  const energyContract = await EnergyContract.deploy(
    priceFeedAddress,
    deployer.address,
    { gasLimit: 7000000 }
  );
  await energyContract.waitForDeployment();
  const contractAddress = await energyContract.getAddress();
  console.log("EnergyContract deployed to:", contractAddress);

  console.log("Verifying contract on Etherscan...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [priceFeedAddress, deployer.address],
    });
    console.log("Contract verified successfully! View at:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  } catch (error) {
    console.error("Verification failed:", error.message);
  }

  const solarFarm = await energyContract.solarFarm();
  console.log("SolarFarm:", solarFarm);

  await addEnergy(energyContract, deployer, 1000);
  await addEnergy(energyContract, deployer, 1000);

  try {
    console.log("Calling getLatestEthPrice...");
    const tx = await energyContract.getLatestEthPrice();
    await tx.wait();
    const ethPrice = await energyContract.getCachedEthPrice();
    console.log("ETH/USD price from contract:", ethers.formatUnits(ethPrice, 8));
  } catch (error) {
    console.error("Error calling getLatestEthPrice:", error.message);
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
  }

  const cost = await energyContract.calculateRequiredPayment(12, 2000 * 10 ** 8);
  console.log("Calculated cost:", ethers.formatEther(cost), "ETH");

  const testAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  console.log("Authorizing test address...");
  const authTx = await energyContract.connect(deployer).authorizeParty(testAddress);
  await authTx.wait();
  const answer = await energyContract.checkAuthState(testAddress);
  console.log("Authorization state for", testAddress, ":", answer);

  console.log("Price Feed Address:", priceFeedAddress);
  console.log("EnergyContract Address:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Key Features**:

- **Balance Check**: Ensures the deployer has Sepolia ETH.
- **Transaction Confirmation**: Uses `tx.wait()` for reliable transaction confirmation on Sepolia.
- **Etherscan Verification**: Verifies the contract with constructor arguments.
- **Live Price Feed**: Uses the live Sepolia price feed to avoid `PriceFeedStale`.

### Steps to Deploy

1. **Compile Contracts**:
    
    ```bash
    npx hardhat compile
    ```
    
    Ensure no compilation errors.
    
2. **Fund Deployer Account**:
    
    - Send Sepolia ETH to the `PRIVATE_KEY` account using a faucet.
    - Check balance in MetaMask or via:
        
        ```javascript
        const { ethers } = require("ethers");
        const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/your-alchemy-api-key");
        console.log("Balance:", ethers.formatEther(await provider.getBalance("your-deployer-address")));
        ```
        
3. **Deploy to Sepolia**:
    
    - Run:
        
        ```bash
        npx hardhat run scripts/deploy.js --network sepolia
        ```
        
    - **Note**: Do not run `npx hardhat node` for live Sepolia deployment, as it only supports the `hardhat` network (avoiding `HH605` error).
    - Expected output:
        
        ```
        Network chainId: 11155111
        Deployer address: 0x...
        Deployer balance: X.XX ETH
        Deploying EnergyContract to Sepolia...
        EnergyContract deployed to: 0x...
        Verifying contract on Etherscan...
        Contract verified successfully! View at: https://sepolia.etherscan.io/address/0x...
        ```
        
4. **Troubleshooting**:
    
    - **Insufficient Funds**: If `Deployer has 0 ETH`, use a faucet to fund the account.
    - **Verification Fails**: Ensure `ETHERSCAN_APIKEY` is valid. Retry manually:
        
        ```bash
        npx hardhat verify --network sepolia <contract-address> <price-feed-address> <deployer-address>
        ```
        
    - **PriceFeedStale**: If `getLatestEthPrice` fails, verify the price feed data:
        
        ```javascript
        const priceFeed = new ethers.Contract("0x694AA1769357215DE4FAC081bf1f309aDC325306", ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"], ethers.provider);
        const [roundId, price, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();
        console.log({ roundId, price: ethers.formatUnits(price, 8), updatedAt });
        ```
        

## Post-Deployment

### Interacting via MetaMask

1. **Connect MetaMask**:
    
    - Ensure MetaMask is on Sepolia (Chain ID: 11155111).
    - Verify the `PRIVATE_KEY` account has Sepolia ETH.
2. **Use Remix**:
    
    - Open [https://remix.ethereum.org](https://remix.ethereum.org/).
    - Set environment to **Injected Provider - MetaMask**.
    - Load `EnergyContract.sol`.
    - Enter the deployed contract address (from `deploy.js` output) in **At Address**.
    - Call functions like `getLatestEthPrice`, `requestAddEnergy`, `confirmAddEnergy`. MetaMask will prompt for transaction signatures.
3. **View on Etherscan**:
    
    - Visit the contract’s Etherscan page (e.g., `https://sepolia.etherscan.io/address/0x...`).
    - Verify the contract’s code and check transaction history.

### Testing and Validation

- **getLatestEthPrice**: Should return a fresh ETH/USD price without `PriceFeedStale`, as Sepolia’s price feed is updated regularly.
- **addEnergy**: Test `requestAddEnergy` and `confirmAddEnergy`, ensuring transactions confirm on the network.
- **Gas Costs**: Monitor gas usage on Etherscan. Adjust `gasPrice` in `hardhat.config.js` if costs are high.

## Common Issues and Solutions

- **HH605 Error**: Caused by running `npx hardhat node --network sepolia`. Use `npx hardhat run scripts/deploy.js --network sepolia` instead.
- **Insufficient Funds**: Fund the deployer account with Sepolia ETH.
- **PriceFeedStale**: Unlikely on live Sepolia. If it occurs, verify the price feed’s `updatedAt` timestamp (see troubleshooting script).
- **Verification Fails**: Check `ETHERSCAN_APIKEY` and retry verification manually.
- **Alchemy Errors**: Ensure `ALCHEMY_APIKEY` is valid and has sufficient request limits.

## Security Notes

- **Private Key Safety**: Never use a mainnet private key for testing. Keep `.env` in `.gitignore`.
- **Gas Optimization**: Adjust `gasPrice` based on Sepolia gas tracker to minimize costs.
- **Contract Testing**: Thoroughly test `EnergyContract` in a forked environment before deploying to Sepolia.