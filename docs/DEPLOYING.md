# EnergyContract Deployment Documentation

This document outlines the steps to deploy the `EnergyContract` smart contract to the Sepolia testnet using Hardhat. The deployment uses the live Sepolia network to interact with the Chainlink ETH/USD price feed (`0x694AA1769357215DE4FAC081bf1f309aDC325306`) and a custom uranium price consumer contract, avoiding errors like `PriceFeedStale` encountered in forked environments. It also addresses the `HH605: Unsupported network for JSON-RPC server` error by ensuring the correct network configuration.

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
        npm install @nomicfoundation/hardhat-toolbox @chainlink/contracts dotenv
        ```
        
2. **Environment Variables**:
    
    - Create a `.env` file in the project root with:
        
        ```
        ALCHEMY_APIKEY=your-alchemy-api-key
        PRIVATE_KEY=your-64-character-hex-private-key
        ETHERSCAN_APIKEY=your-etherscan-api-key
        URANIUM_PRICE_CONSUMER=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        URANIUM_SUBSCRIPTION_ID=123456
        URANIUM_DON_ID=0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000
        ```
        
    - **ALCHEMY_APIKEY**: Obtain from [https://www.alchemy.com/](https://www.alchemy.com/) for Sepolia RPC access.
    - **PRIVATE_KEY**: A 64-character hexadecimal private key (without `0x`) for an account with Sepolia ETH. Generate a new key for testing if needed:
        
        ```javascript
        const { ethers } = require("ethers");
        const wallet = ethers.Wallet.createRandom();
        console.log("Private Key:", wallet.privateKey.slice(2));
        ```
        
    - **ETHERSCAN_APIKEY**: Obtain from [https://etherscan.io/apis](https://etherscan.io/apis) for contract verification.
    - **URANIUM_PRICE_CONSUMER**: Example address `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` (replace with your deployed `IUraniumPriceConsumer` contract address on Sepolia).
    - **URANIUM_SUBSCRIPTION_ID**: Example Chainlink subscription ID `123456` (replace with your actual Chainlink subscription ID).
    - **URANIUM_DON_ID**: Example Chainlink DON ID `0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000` (for Sepolia, replace with your actual DON ID from Chainlink).
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
    
    - Ensure `EnergyContract.sol` is in the `contracts/` directory, integrating the Chainlink ETH/USD price feed and uranium price consumer. Example (simplified for brevity):
        
        ```solidity
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.30;
        
        import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
        import "./IUraniumPriceConsumer.sol";
        
        contract EnergyContract {
            AggregatorV3Interface internal priceFeed;
            IUraniumPriceConsumer internal uraniumPriceConsumer;
            address public solarFarm;
            uint256 private cachedEthPrice;
            uint256 private uraniumPriceUSDCents;
            uint256 private constant MAX_AGE = 900; // 15 minutes
            uint256 public constant MAX_URANIUM_POUNDS_PER_PURCHASE = 100;
        
            constructor(
                address _priceFeed,
                address _solarFarm,
                address _uraniumPriceConsumer,
                uint64 _uraniumSubscriptionId,
                bytes32 _uraniumDonID
            ) {
                priceFeed = AggregatorV3Interface(_priceFeed);
                uraniumPriceConsumer = IUraniumPriceConsumer(_uraniumPriceConsumer);
                solarFarm = _solarFarm;
                cachedEthPrice = 0;
                uraniumPriceUSDCents = 0;
            }
        
            function getLatestEthPrice() public returns (uint256) {
                (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
                require(price > 0, "InvalidEthPrice");
                require(block.timestamp <= updatedAt + MAX_AGE, "PriceFeedStale");
                cachedEthPrice = uint256(price) * 10**10; // Adjust to 18 decimals
                return cachedEthPrice;
            }
        
            function requestAddUranium(uint256 pounds) public {
                // Add logic for uranium request
            }
        
            function confirmAddUranium(uint256 pounds) public {
                // Add logic for uranium confirmation
            }
        
            function authorizeParty(address party) public {
                // Add authorization logic
            }
        
            function checkAuthState(address party) public view returns (bool) {
                // Return authorization state
                return true;
            }
        
            function calculateRequiredPayment(uint256 pounds) public view returns (uint256) {
                // Simplified cost calculation
                return (pounds * uraniumPriceUSDCents * 1e18) / (cachedEthPrice / 1e6);
            }
        
            function requestUraniumPriceUpdate() public {
                // Request uranium price update
            }
        
            function updateUraniumPrice() public {
                // Update uranium price
            }
        
            function getUraniumPriceInfo() public view returns (uint256, uint256) {
                return (uraniumPriceUSDCents, block.timestamp);
            }
        }
        ```
        
6. **Uranium Price Consumer Contract**:
    
    - Deploy an `IUraniumPriceConsumer` contract on Sepolia (or use the existing one at `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`). Example interface:
        
        ```solidity
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.30;
        
        interface IUraniumPriceConsumer {
            function lastPrice() external view returns (uint256);
        }
        ```
        
    - Ensure the contract is funded with LINK tokens for Chainlink requests (use the Chainlink Sepolia faucet: [https://faucets.chain.link/sepolia](https://faucets.chain.link/sepolia)).

## Configuration

### Hardhat Configuration

The `hardhat.config.js` file configures Hardhat for Sepolia deployment, including gas settings and Etherscan verification to avoid errors like `HH605`.

// hardhat.config.js  
// Hardhat configuration for EnergyContract deployment on Sepolia

require("@nomicfoundation/hardhat-toolbox");  
require("dotenv").config();

// Debug: Log environment variables to verify loading  
console.log("ALCHEMY_APIKEY:", process.env.ALCHEMY_APIKEY ? "Loaded" : "Undefined");  
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Loaded" : "Undefined");  
console.log("ETHERSCAN_APIKEY:", process.env.ETHERSCAN_APIKEY ? "Loaded" : "Undefined");  
console.log("URANIUM_PRICE_CONSUMER:", process.env.URANIUM_PRICE_CONSUMER ? "Loaded" : "Undefined");  
console.log("URANIUM_SUBSCRIPTION_ID:", process.env.URANIUM_SUBSCRIPTION_ID ? "Loaded" : "Undefined");  
console.log("URANIUM_DON_ID:", process.env.URANIUM_DON_ID ? "Loaded" : "Undefined");

// Validate environment variables  
if (!process.env.PRIVATE_KEY) {  
throw new Error("PRIVATE_KEY is not defined in .env file");  
}  
if (!/^[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY)) {  
throw new Error("PRIVATE_KEY is invalid: must be a 64-character hexadecimal string without 0x");  
}  
if (!process.env.URANIUM_PRICE_CONSUMER || !ethers.isAddress(process.env.URANIUM_PRICE_CONSUMER)) {  
throw new Error("URANIUM_PRICE_CONSUMER is invalid or not defined in .env file");  
}  
if (!process.env.URANIUM_SUBSCRIPTION_ID || isNaN(process.env.URANIUM_SUBSCRIPTION_ID)) {  
throw new Error("URANIUM_SUBSCRIPTION_ID is invalid or not defined in .env file");  
}  
if (!process.env.URANIUM_DON_ID || !/^(0x)?[0-9a-fA-F]+$/.test(process.env.URANIUM_DON_ID)) {  
throw new Error("URANIUM_DON_ID is invalid or not defined in .env file");  
}

module.exports = {  
solidity: {  
version: "0.8.30",  
settings: {  
optimizer: {  
enabled: true,  
runs: 200,  
},  
},  
},  
networks: {  
hardhat: {  
chainId: 31337,  
forking: {  
url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,  
},  
},  
localhost: {  
url: "[http://127.0.0.1:8545](http://127.0.0.1:8545/)",  
chainId: 31337,  
},  
sepolia: {  
url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,  
accounts: [process.env.PRIVATE_KEY],  
gasPrice: 2000000000, // 2 gwei  
gas: 8000000, // Max gas limit  
chainId: 11155111,  
},  
},  
etherscan: {  
apiKey: process.env.ETHERSCAN_APIKEY,  
},  
};