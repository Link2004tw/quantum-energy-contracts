require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.30",
  networks: {
    hardhat: {
      hainId: 31337,
      rpcUrl: "http://192.168.1.13:8545",
      chainName: "Hardhat",
      currency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: [],
    },
    sepholia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
    localhost: {
      url: "http://192.168.1.13:8545",
      chainId: 31337,
      rpcUrl: "http://192.168.1.13:8545",
      chainName: "Hardhat",
      currency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: [],
    },
  },
};
