# Deploying Smart Contracts to the Sepolia Test Network

This guide outlines the steps to deploy a smart contract to the Sepolia test network using Hardhat. Sepolia is an Ethereum testnet ideal for testing decentralized applications (dApps) and smart contracts in a safe, cost-free environment.

## Prerequisites

Before proceeding, ensure you have the following:

- **Node.js and npm**: Install Node.js (version 14 or higher) and npm to manage dependencies.
- **Hardhat**: A development environment for Ethereum smart contracts.
- **MetaMask**: A browser extension or mobile app for interacting with the Sepolia network.
- **Sepolia Testnet ETH**: Test ETH to cover gas fees on Sepolia.
- **Infura or Alchemy Account**: For connecting to the Sepolia network via an RPC endpoint.
- **Basic Knowledge**: Familiarity with Solidity, JavaScript, and Ethereum concepts.

## Step 1: Set Up Your Development Environment

1. **Install Hardhat**:  
    Create a new project directory and initialize a Hardhat project:
    
    ```bash
    mkdir sepolia-deployment
    cd sepolia-deployment
    npm init -y
    npm install --save-dev hardhat
    npx hardhat init
    ```
    
    Follow the prompts to create a basic Hardhat project (select JavaScript or TypeScript).
    
2. **Install Dependencies**:  
    Install additional dependencies for environment configuration and network interaction:
    
    ```bash
    npm install dotenv @nomiclabs/hardhat-ethers ethers
    ```
    
3. **Configure Hardhat**:  
    Update the `hardhat.config.js` file to include Sepolia network details. Replace `<YOUR_PRIVATE_KEY>` and `<YOUR_INFURA_PROJECT_ID>` with your wallet’s private key and Infura/Alchemy project ID.
    
    ```javascript
    require("@nomiclabs/hardhat-ethers");
    require("dotenv").config();
    
    module.exports = {
      solidity: "0.8.20",
      networks: {
        sepolia: {
          url: `https://sepolia.infura.io/v3/<YOUR_INFURA_PROJECT_ID>`,
          accounts: [`0x${process.env.PRIVATE_KEY}`]
        }
      }
    };
    ```
    
4. **Set Up Environment Variables**:  
    Create a `.env` file in the project root to securely store sensitive information:
    
    ```env
    PRIVATE_KEY=<YOUR_PRIVATE_KEY>
    INFURA_PROJECT_ID=<YOUR_INFURA_PROJECT_ID>
    ```
    

## Step 2: Write a Smart Contract

Create a simple smart contract in the `contracts` directory. Below is an example Solidity contract:

// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.20;

contract SimpleStorage {  
uint256 private storedValue;

```
function set(uint256 _value) public {
    storedValue = _value;
}

function get() public view returns (uint256) {
    return storedValue;
}
```

}