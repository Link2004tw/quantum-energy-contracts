// Updated utility functions and configurations for adminContract.js and userContract.js to handle uranium in pounds instead of energy in kWh, compatible with UraniumPriceConsumer smart contract
import { ethers } from "ethers";
import CONTRACT_ABI from "../config/UraniumContractABI.json"; // Updated ABI reference to reflect uranium contract

// Global network name constant (unchanged)
export const NETWORK_NAME = "sepolia";

// Contract addresses (unchanged)
export const CONTRACT_ADDRESS = "0xeA3481ac1776A78c29E57D4469b3207518f87a21";

// Network configuration (unchanged)
export const NETWORK_CONFIG = {
  hardhat: {
    chainId: 31337,
    url: "http://127.0.0.1:8545",
    rpcUrl: "http://127.0.0.1:8545",
    chainName: "Hardhat",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: [],
  },
  sepolia: {
    chainId: "11155111",
    rpcUrl:
      "https://eth-sepolia.g.alchemy.com/v2/9HRFmzrQc9Mw5J5u1BW4bMJq2B-6ktFL",
    chainName: "Sepolia",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

// Custom error decoder utility (unchanged)
export const decodeCustomError = (error) => {
  try {
    const iface = new ethers.Interface(CONTRACT_ABI);
    const errorData =
      error.data || (error.error && error.error.data) || error.reason;

    if (!errorData) return null;

    const decodedError = iface.parseError(errorData);
    if (!decodedError) return null;

    return {
      name: decodedError.name,
      args: decodedError.args,
      signature: decodedError.signature,
    };
  } catch (decodeError) {
    console.warn("Could not decode custom error:", decodeError);
    return null;
  }
};

// Enhanced error handler with updated uranium-related errors
export const handleContractError = (
  error,
  operation = "contract operation"
) => {
  if (operation != "refund withdrawal") {
    console.error(`Error during ${operation}:`, error);
  }

  if (
    error.code === -32000 ||
    (error.message && error.message.includes("insufficient funds"))
  ) {
    return "Insufficient funds: Your wallet does not have enough ETH to cover the transaction and gas costs.";
  }

  const decodedError = decodeCustomError(error);

  if (decodedError) {
    switch (decodedError.name) {
      // Updated error name and message to reflect uranium in pounds
      case "InsufficientUraniumAvailable":
        return `Insufficient uranium available. Requested: ${decodedError.args[0]} lbs, Available: ${decodedError.args[1]} lbs`;
      case "PaymentAmountTooSmall":
        const providedEth = Number(
          ethers.formatEther(decodedError.args[0])
        ).toFixed(6);
        const requiredEth = Number(
          ethers.formatEther(decodedError.args[1])
        ).toFixed(6);
        return `Payment too small. Provided: ${providedEth} ETH, Required: ${requiredEth} ETH`;
      case "PriceFeedStale":
        const lastUpdate = new Date(
          Number(decodedError.args[0]) * 1000
        ).toLocaleString();
        const threshold = Number(decodedError.args[1]) / 60;
        return `Price feed is stale. Last update: ${lastUpdate}`;
      case "CommitmentExpired":
        const commitTime = Number(decodedError.args[0]);
        const currentTime = Number(decodedError.args[1]);
        if (commitTime === 0) {
          return "No commitment found. Please commit to a purchase first.";
        }
        return `Commitment expired. Committed at: ${new Date(
          commitTime * 1000
        ).toLocaleString()}, Current: ${new Date(
          currentTime * 1000
        ).toLocaleString()}`;
      case "CommitmentCooldownActive":
        const lastCommit = new Date(
          Number(decodedError.args[0]) * 1000
        ).toLocaleString();
        return `Commitment cooldown active. Last commit: ${lastCommit}. Please wait before committing again.`;
      case "DelayNotElapsed":
        const requestTime = new Date(
          Number(decodedError.args[0]) * 1000
        ).toLocaleString();
        return `Delay not elapsed. Request time: ${requestTime}. Please wait longer before confirming.`;
      case "InvalidPartyAddress":
        return "Invalid address provided. Please check the address and try again.";
      case "PartyAlreadyAuthorized":
        return "Party is already authorized.";
      case "PartyNotAuthorized":
        return "Party is not authorized to perform this action.";
      case "MaxAuthorizedPartiesReached":
        return "Maximum number of authorized parties reached.";
      case "NoPendingRequest":
        return "No pending request found.";
      case "InvalidCommitment":
        return "Invalid commitment. The provided parameters don't match the commitment hash.";
      case "InvalidCommitmentHash":
        return "Invalid commitment hash provided.";
      case "PaymentFailed":
        return "Payment transfer failed. Please try again.";
      case "NoRefundsAvailable":
        return "No refunds available for withdrawal.";
      case "InvalidTransactionID":
        return "Invalid transaction ID provided.";
      case "InvalidPriceBounds":
        return "ETH price is outside valid bounds. Please try again later.";
      case "InvalidBatchIndex":
        const startIdx = Number(decodedError.args[0]);
        const arrayLen = Number(decodedError.args[1]);
        return `Invalid batch index. Start: ${startIdx}, Array length: ${arrayLen}`;
      case "PartyNotFoundInList":
        return "Party not found in authorized list.";
      case "InvalidEthPrice":
        return "Invalid ETH price data. Please try again later.";
      case "EnforcedPause":
        return "Contract is currently paused. Please try again later.";
      case "ExpectedPause":
        return "Contract should be paused for this operation.";
      case "OwnableUnauthorizedAccount":
        return "Unauthorized: Only the contract owner can perform this action.";
      case "ReentrancyGuardReentrantCall":
        return "Reentrancy detected. Transaction rejected for security.";
      default:
        return `Contract error: ${decodedError.name} - ${JSON.stringify(
          decodedError.args
        )}`;
    }
  }

  return error.reason || error.message || `Failed to perform ${operation}`;
};

// Initialize contract with enhanced error handling (unchanged)
export const getContract = async (address, abi, useSigner = false) => {
  try {
    let provider;
    let signer;

    if (useSigner && typeof window.ethereum !== "undefined") {
      provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      signer = await provider.getSigner();

      const network = await provider.getNetwork();
      const targetConfig = NETWORK_CONFIG[NETWORK_NAME];

      if (network.chainId.toString() !== targetConfig.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [
              {
                chainId: `0x${parseInt(targetConfig.chainId, 10).toString(16)}`,
              },
            ],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${parseInt(targetConfig.chainId, 10).toString(
                    16
                  )}`,
                  chainName: targetConfig.chainName,
                  rpcUrls: [targetConfig.rpcUrl],
                  nativeCurrency: targetConfig.currency,
                  blockExplorerUrls: targetConfig.blockExplorerUrls,
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }
      return new ethers.Contract(address, abi, signer);
    } else {
      const targetConfig = NETWORK_CONFIG[NETWORK_NAME];
      provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
      return new ethers.Contract(address, abi, provider);
    }
  } catch (error) {
    const errorMessage = handleContractError(error, "contract initialization");
    throw new Error(`Failed to initialize contract: ${errorMessage}`);
  }
};

// Updated checkContractConnection to reference UraniumContract
export const checkContractConnection = async () => {
  try {
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    const provider = contract.runner.provider;

    const network = await provider.getNetwork();
    const targetConfig = NETWORK_CONFIG[NETWORK_NAME];
    if (network.chainId.toString() !== targetConfig.chainId) {
      throw new Error(
        `Wrong network: expected chainId ${targetConfig.chainId}, got ${network.chainId}`
      );
    }

    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      throw new Error(`No contract deployed at address ${CONTRACT_ADDRESS}`);
    }

    // Updated to reference uraniumContract instead of solarFarm
    const uraniumContractAddress = await contract.uraniumContract();
    if (!ethers.isAddress(uraniumContractAddress)) {
      throw new Error(
        `Invalid uraniumContract address returned: ${uraniumContractAddress}`
      );
    }

    return {
      isConnected: true,
      // Updated message to reference UraniumContract
      message: `Successfully connected to UraniumContract at ${CONTRACT_ADDRESS} on ${targetConfig.chainName}`,
      chainId: network.chainId.toString(),
      uraniumContractAddress,
    };
  } catch (error) {
    return {
      isConnected: false,
      message: `Connection failed: ${error.message}`,
      chainId: null,
      uraniumContractAddress: null,
    };
  }
};

// Updated getSolarFarm to getUraniumContract
// export const getUraniumContract = async () => {
//   try {
//     const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
//     return await contract.uraniumContract();
//   } catch (error) {
//     const errorMessage = handleContractError(
//       error,
//       "uranium contract address retrieval"
//     );
//     throw new Error(errorMessage);
//   }
// };

export const getSolarFarm = async () => {
  try {
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    return await contract.solarFarm();
  } catch (error) {
    const errorMessage = handleContractError(
      error,
      "solar farm address retrieval"
    );
    throw new Error(errorMessage);
  }
};

// getLatestEthPriceWC remains unchanged as it handles ETH/USD price
export const getLatestEthPriceWC = async () => {
  try {
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    const price = await contract.getLatestEthPriceWithoutCaching();
    return Number(price) / 1e18;
  } catch (error) {
    const errorMessage = handleContractError(error, "ETH price fetch");
    throw new Error(errorMessage);
  }
};

// Updated getAvailableEnergy to getAvailableUraniumLbs
export const getAvailableUraniumLbs = async () => {
  try {
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    return await contract.getAvailableUranium();
  } catch (error) {
    const errorMessage = handleContractError(error, "available uranium fetch");
    throw new Error(errorMessage);
  }
};

export const getUraniumPricePerLb = async () => {
  try {
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    const price = await contract.uraniumPriceUSDCents();
    return Number(price) / 1e2; // Assuming price is returned in cents
  } catch (error) {
    const errorMessage = handleContractError(error, "uranium price fetch");
    throw new Error(errorMessage);
  }
};

// checkIfAuthorized remains unchanged
export const checkIfAuthorized = async (user) => {
  try {
    if (!user || !user._ethereumAddress) {
      throw new Error(
        "User is not authenticated or does not have an Ethereum address."
      );
    }
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    console.log(user._ethereumAddress);
    return await contract.checkAuthState(user._ethereumAddress);
  } catch (error) {
    const errorMessage = handleContractError(error, "authorization check");
    throw new Error(errorMessage);
  }
};

// getEthBalance remains unchanged
export const getEthBalance = async (address) => {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }
    const targetConfig = NETWORK_CONFIG[NETWORK_NAME];
    const provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  } catch (error) {
    const errorMessage = handleContractError(error, "ETH balance fetch");
    throw new Error(errorMessage);
  }
};

// convertEthToUsd remains unchanged
export const convertEthToUsd = async (amount) => {
  try {
    const ethAmount = Number(amount);
    console.log(ethAmount);
    if (isNaN(ethAmount)) {
      throw new Error("ETH amount must be a valid number greater than zero");
    }

    const ethPriceInUsd = await getLatestEthPriceWC();
    const usdAmount = (ethAmount * ethPriceInUsd).toFixed(2);

    return {
      ethAmount: ethAmount.toFixed(6),
      usdAmount: usdAmount,
      ethPriceInUsd: ethPriceInUsd.toFixed(2),
    };
  } catch (error) {
    const errorMessage = handleContractError(error, "ETH to USD conversion");
    throw new Error(errorMessage);
  }
};

// Updated getCost to handle uraniumLbs instead of energy
export const getCost = async (amount) => {
  try {
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    // Updated to use uraniumLbs instead of energy
    const uraniumLbs = Number(amount);

    if (isNaN(uraniumLbs) || uraniumLbs <= 0) {
      throw new Error(
        "Uranium amount must be a valid number greater than zero"
      );
    }

    const ethPriceInUsd = await getLatestEthPriceWC();
    console.log(ethPriceInUsd);

    const ethPriceForContract = BigInt(Math.round(ethPriceInUsd * 1e8));
    // Updated to use uraniumLbs in contract call
    const priceInWei = await contract.calculateRequiredPayment(
      uraniumLbs,
      ethPriceForContract
    );
    console.log(priceInWei);
    const priceInEth = ethers.formatUnits(priceInWei, 18);
    console.log(priceInEth);
    return Number(priceInEth).toFixed(6);
  } catch (error) {
    const errorMessage = handleContractError(error, "cost calculation");
    throw new Error(errorMessage);
  }
};

// isPaused remains unchanged
export const isPaused = async () => {
  try {
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
    return await contract.paused();
  } catch (error) {
    const errorMessage = handleContractError(error, "pause status check");
    throw new Error(errorMessage);
  }
};

// Updated getHashedCommitment to use uraniumLbs instead of kWh

// export const getHashedCommitment = (uraniumLbs, nonce, sender, secret) => {
//   // Validate inputs
//   if (!ethers.isAddress(sender)) {
//     throw new Error("Invalid sender address");
//   }
//   if (!Number.isInteger(Number(uraniumLbs)) || Number(uraniumLbs) <= 0) {
//     throw new Error("Invalid uraniumLbs value");
//   }
//   if (!Number.isInteger(Number(nonce))) {
//     throw new Error("Invalid nonce value");
//   }
//   if (!ethers.isBytesLike(secret) || secret.length !== 66) {
//     // Expecting 0x-prefixed hex string of 32 bytes
//     throw new Error("Invalid secret: must be a 32-byte hex string");
//   }

//   // Updated: Calculate commitment hash including blockTimestamp and secret
//   return ethers.keccak256(
//     ethers.AbiCoder.defaultAbiCoder().encode(
//       ["address", "uint256", "uint256", "bytes32"],
//       [sender, uraniumLbs, nonce, secret]
//     )
//   );
// };
export const getHashedCommitment = (uraniumLbs, nonce, sender, secret) => {
  // Validate inputs
  if (!ethers.isAddress(sender)) {
    throw new Error("Invalid sender address");
  }
  if (!Number.isInteger(Number(uraniumLbs)) || Number(uraniumLbs) <= 0) {
    throw new Error("Invalid uraniumLbs value");
  }
  if (!Number.isInteger(Number(nonce))) {
    throw new Error("Invalid nonce value");
  }
  if (!ethers.isBytesLike(secret) || secret.length !== 66) {
    // Expecting 0x-prefixed hex string of 32 bytes
    throw new Error("Invalid secret: must be a 32-byte hex string");
  }

  // Updated: Use solidityPackedKeccak256 to match on-chain abi.encodePacked
  return ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint256", "bytes32"],
    [sender, uraniumLbs, nonce, secret]
  );
};

// getNonceFromUid remains unchanged
export const getNonceFromUid = (uid) => {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new Error("Invalid Firebase UID");
  }
  const hash = ethers.keccak256(ethers.toUtf8Bytes(uid));
  const hashNumber = Number(BigInt(hash.slice(0, 10)) & BigInt(0xffffffff));
  const nonce = 10000 + (hashNumber % 90000);
  return nonce; // Return as number
};
