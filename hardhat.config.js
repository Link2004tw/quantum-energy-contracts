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
