// utils/contract.js
// Prompt: Update contract.js to align with new EnergyContract.sol ABI, add all errors, include new functions, handle bypassStaleCheck, no ImageMessage/Firebase
import { ethers } from "ethers";
import CONTRACT_ABI from "../config/SolarFarmABI.json";
import { Transaction } from "@/models/transaction";

// Contract addresses
//const CONTRACT_ADDRESS = "0x57ff1764F8c32FEAc3A997D7911af39becb24cD1"; // Sepolia EnergyContract
//const MOCKPRICE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Mock for testing
const CONTRACT_ADDRESS = "0xF9939E6600047ab1d9883A25f5301f9FB49f4aAE";
//

// Network configuration
const NETWORK_CONFIG = {
    hardhat: {
        chainId: "31337", // Hardhat's chainId when forking Sepolia
        rpcUrl: "http://127.0.0.1:8545/",
        // chainName: "Hardhat Local",
        currency: { name: "ETH", symbol: "ETH", decimals: 18 },
        blockExplorerUrls: [],
    },
    localhost: {
        chainId: "31337",
        rpcUrl: "http://127.0.0.1:8545",
        chainName: "Localhost",
        currency: { name: "ETH", symbol: "ETH", decimals: 18 },
        blockExplorerUrls: [],
    },
    sepolia: {
        chainId: "11155111",
        rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/9HRFmzrQc9Mw5J5u1BW4bMJq2B-6ktFL",
        chainName: "Sepolia",
        currency: { name: "ETH", symbol: "ETH", decimals: 18 },
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },
};

export const NETWORK_NAME = "sepolia";
// Custom error decoder
const decodeCustomError = (error) => {
    try {
        const iface = new ethers.Interface(CONTRACT_ABI);
        const errorData = error.data || (error.error && error.error.data) || error.reason;
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

// Enhanced error handler
const handleContractError = (error, operation = "contract operation") => {
    console.error(`Error during ${operation}:`, error);
    const decodedError = decodeCustomError(error);
    if (decodedError) {
        switch (decodedError.name) {
            case "InsufficientEnergyAvailable":
                return `Insufficient energy available. Requested: ${decodedError.args[0]} kWh, Available: ${decodedError.args[1]} kWh`;
            case "PaymentAmountTooSmall":
                return `Payment too small. Provided: ${ethers.formatEther(decodedError.args[0])} ETH, Required: ${ethers.formatEther(decodedError.args[1])} ETH`;
            case "PriceFeedStale":
                return `Price feed is stale. Last update: ${new Date(Number(decodedError.args[0]) * 1000).toLocaleString()}, Threshold: ${Number(decodedError.args[1]) / 60} minutes`;
            case "CommitmentExpired":
                return decodedError.args[0] === 0
                    ? "No commitment found"
                    : `Commitment expired. Committed at: ${new Date(Number(decodedError.args[0]) * 1000).toLocaleString()}`;
            case "CommitmentCooldownActive":
                return `Commitment cooldown active. Last commit: ${new Date(Number(decodedError.args[0]) * 1000).toLocaleString()}`;
            case "DelayNotElapsed":
                return `Delay not elapsed. Request time: ${new Date(Number(decodedError.args[0]) * 1000).toLocaleString()}`;
            case "InvalidPartyAddress":
                return "Invalid address provided";
            case "PartyAlreadyAuthorized":
                return "Party is already authorized";
            case "PartyNotAuthorized":
                return "Party is not authorized";
            case "MaxAuthorizedPartiesReached":
                return "Maximum authorized parties reached";
            case "NoPendingRequest":
                return "No pending request found";
            case "InvalidCommitment":
                return "Invalid commitment parameters";
            case "InvalidCommitmentHash":
                return "Invalid commitment hash";
            case "PaymentFailed":
                return "Payment transfer failed";
            case "NoRefundsAvailable":
                return "No refunds available";
            case "InvalidTransactionID":
                return "Invalid transaction ID";
            case "InvalidPriceBounds":
                return "ETH price outside valid bounds (100-10,000 USD)";
            case "InvalidBatchIndex":
                return `Invalid batch index. Start: ${decodedError.args[0]}, Length: ${decodedError.args[1]}`;
            case "PartyNotFoundInList":
                return "Party not found in authorized list";
            case "InvalidEthPrice":
                return "Invalid ETH price data";
            case "EnforcedPause":
                return "Contract is paused";
            case "ExpectedPause":
                return "Contract should be paused for this operation";
            case "OwnableInvalidOwner":
                return `Invalid owner address: ${decodedError.args[0]}`;
            case "OwnableUnauthorizedAccount":
                return "Only contract owner can perform this action";
            case "ReentrancyGuardReentrantCall":
                return "Reentrancy detected";
            default:
                return `Contract error: ${decodedError.name} - ${JSON.stringify(decodedError.args)}`;
        }
    }
    return error.reason || error.message || `Failed to perform ${operation}`;
};

// Initialize contract
const getContract = async (networkName = NETWORK_NAME, address, abi, useSigner = false) => {
    try {
        let provider, signer;
        if (useSigner && typeof window.ethereum !== "undefined") {
            provider = new ethers.BrowserProvider(window.ethereum);
            await window.ethereum.request({ method: "eth_requestAccounts" });
            signer = await provider.getSigner();
            const network = await provider.getNetwork();
            const targetConfig = NETWORK_CONFIG[networkName];
            if (network.chainId.toString() !== targetConfig.chainId) {
                try {
                    await window.ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: `0x${parseInt(targetConfig.chainId, 10).toString(16)}` }],
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: "wallet_addEthereumChain",
                            params: [
                                {
                                    chainId: `0x${parseInt(targetConfig.chainId, 10).toString(16)}`,
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
            const targetConfig = NETWORK_CONFIG[networkName];
            provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
            return new ethers.Contract(address, abi, provider);
        }
    } catch (error) {
        throw new Error(`Failed to initialize contract: ${handleContractError(error, "contract initialization")}`);
    }
};

// Check contract connection
export const checkContractConnection = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const provider = contract.runner.provider;
        const network = await provider.getNetwork();
        const targetConfig = NETWORK_CONFIG[networkName];
        if (network.chainId.toString() !== targetConfig.chainId) {
            throw new Error(`Wrong network: expected chainId ${targetConfig.chainId}, got ${network.chainId}`);
        }
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === "0x") {
            throw new Error(`No contract deployed at ${CONTRACT_ADDRESS}`);
        }
        const solarFarmAddress = await contract.solarFarm();
        if (!ethers.isAddress(solarFarmAddress)) {
            throw new Error(`Invalid solarFarm address: ${solarFarmAddress}`);
        }
        return {
            isConnected: true,
            message: `Connected to EnergyContract at ${CONTRACT_ADDRESS} on ${targetConfig.chainName}`,
            chainId: network.chainId.toString(),
            solarFarmAddress,
        };
    } catch (error) {
        return {
            isConnected: false,
            message: `Connection failed: ${handleContractError(error, "contract connection")}`,
            chainId: null,
            solarFarmAddress: null,
        };
    }
};

// Get solar farm address
export const getSolarFarm = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return await contract.solarFarm();
    } catch (error) {
        throw new Error(`Error fetching solar farm: ${handleContractError(error, "solar farm fetch")}`);
    }
};

// Get latest ETH price without caching
export const getLatestEthPriceWC = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const price = await contract.getLatestEthPriceWithoutCaching();
        // Changed: Adjust for contract's 1e18 scaling
        return Number(price) / 1e18;
    } catch (error) {
        const errorMessage = handleContractError(error, "ETH price fetch without cache");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Get latest ETH price (updates cache)
export const getLatestEthPrice = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.getLatestEthPrice();
        await tx.wait();
        const price = await contract.getCachedEthPrice();
        // Changed: Adjust for contract's 1e18 scaling
        return (Number(price) / 1e18).toString();
    } catch (error) {
        const errorMessage = handleContractError(error, "ETH price fetch with cache");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Get cost for energy amount
export const getCost = async (amount, networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const energy = Number(amount);
        if (isNaN(energy) || energy <= 0 || energy > 1000) {
            throw new Error("Energy amount must be between 1 and 1000 kWh");
        }
        // Changed: Use getLatestEthPriceWC and scale correctly for contract
        const ethPriceInUsd = await getLatestEthPriceWC(networkName);
        const ethPriceScaled = BigInt(Math.round(ethPriceInUsd * 1e8));
        const priceInWei = await contract.calculateRequiredPayment(energy, ethPriceScaled);
        const priceInEth = ethers.formatUnits(priceInWei, 18);
        return Number(priceInEth).toFixed(6);
    } catch (error) {
        const errorMessage = handleContractError(error, "cost calculation");
        throw new Error(errorMessage);
    }
};

// Get available energy
export const getAvailableEnergy = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const energy = await contract.availableKWh();
        return Number(energy);
    } catch (error) {
        const errorMessage = handleContractError(error, "available energy fetch");
        throw new Error(errorMessage);
    }
};

// Commit purchase
export const commitPurchase = async (networkName = NETWORK_NAME, amount, user) => {
    try {
        if (!amount || amount <= 0 || amount > 1000) {
            throw new Error("Amount must be between 1 and 1000 kWh");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const nonce = getNonceFromUid(user._uid);
        const hash = getHashedCommitment(amount, nonce, user._ethereumAddress);
        const tx = await contract.commitPurchase(hash);
        await tx.wait();
        return hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "purchase commitment");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Reveal purchase
export const revealPurchase = async (networkName = NETWORK_NAME, amount, user) => {
    try {
        if (!amount || amount <= 0 || amount > 1000) {
            throw new Error("Amount must be between 1 and 1000 kWh");
        }
        if (!user || !user._ethereumAddress) {
            throw new Error("User Ethereum address is required");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        if (signerAddress.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
            throw new Error("Signer address does not match provided Ethereum address");
        }
        const ethPrice = await getLatestEthPriceWC(networkName);
        const totalCostWei = await contract.calculateRequiredPayment(amount, BigInt(ethPrice * 1e8));
        const gasEstimate = await contract.revealPurchase.estimateGas(amount, getNonceFromUid(user._uid), {
            value: totalCostWei,
        });
        const revealTx = await contract.revealPurchase(amount, getNonceFromUid(user._uid), {
            value: totalCostWei,
            gasLimit: gasEstimate,
        });
        const receipt = await revealTx.wait();
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "purchase reveal");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Add energy
export const addEnergy = async (kwh, networkName = NETWORK_NAME) => {
    try {
        if (!kwh || kwh <= 0 || kwh > 1000) {
            alert("kWh must be between 1 and 1000");
            throw new Error("kWh must be between 1 and 1000");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm(networkName);
        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner (solar farm) can add energy");
            throw new Error("Only the contract owner can add energy");
        }
        const requestTx = await contract.requestAddEnergy(kwh);
        const requestReceipt = await requestTx.wait();
        // Wait for ADD_ENERGY_DELAY
        const ADD_ENERGY_DELAY = await contract.ADD_ENERGY_DELAY(); // Changed: Query contract constant
        alert(`Please wait ${Number(ADD_ENERGY_DELAY) / 60} mins before confirming. Tx hash: ${requestTx.hash}`);
        await new Promise((resolve) => setTimeout(resolve, Number(ADD_ENERGY_DELAY) * 1000));
        const confirmTx = await contract.confirmAddEnergy(kwh);
        const confirmReceipt = await confirmTx.wait();
        alert(`Energy added: ${kwh} kWh. Tx hash: ${confirmTx.hash}`);
        return {
            requestTxHash: requestReceipt.hash,
            confirmTxHash: confirmReceipt.hash,
        };
    } catch (error) {
        const errorMessage = handleContractError(error, "energy addition");
        alert(`Error adding energy: ${errorMessage}`);
        throw new Error(errorMessage);
    }
};

// Pause contract
export const pauseContract = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm(networkName);
        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner can pause the contract");
            throw new Error("Only the contract owner can pause the contract");
        }
        const tx = await contract.pause();
        const receipt = await tx.wait();
        alert(`Contract paused. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "contract pause");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Unpause contract
export const unpauseContract = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm(networkName);
        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner can unpause the contract");
            throw new Error("Only the contract owner can unpause the contract");
        }
        const tx = await contract.unpause();
        const receipt = await tx.wait();
        alert(`Contract unpaused. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "contract unpause");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Check pause status
export const isPaused = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return await contract.paused();
    } catch (error) {
        const errorMessage = handleContractError(error, "pause status check");
        throw new Error(errorMessage);
    }
};

// Authorize party
export const authorizeParty = async (address, networkName = NETWORK_NAME) => {
    try {
        if (!ethers.isAddress(address)) {
            throw new Error("Invalid Ethereum address");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.authorizeParty(address);
        const receipt = await tx.wait();
        alert(`Party authorized. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "party authorization");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Unauthorize party
export const unauthorizeParty = async (address, networkName = NETWORK_NAME) => {
    try {
        if (!ethers.isAddress(address)) {
            throw new Error("Invalid Ethereum address");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.unAuthorizeParty(address);
        const receipt = await tx.wait();
        alert(`Party unauthorized. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "party deauthorization");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Get transactions
export const getTransactions = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const transactionCount = await contract.getTransactionsCount(); // Changed: Use getTransactionsCount
        const transactionCountNum = Number(transactionCount);
        const transactions = [];
        for (let i = 0; i < transactionCountNum; i++) {
            try {
                const tx = await contract.getTransaction(i); // Changed: Use getTransaction
                transactions.push(
                    new Transaction({
                        index: i,
                        buyer: tx.buyer,
                        kWh: tx.kWh.toString(),
                        pricePerKWhUSD: tx.pricePerKWhUSD.toString(),
                        ethPriceUSD: tx.ethPriceUSD.toString(),
                        timestamp: Number(tx.timestamp),
                    }),
                );
            } catch (error) {
                transactions.push(
                    new Transaction({
                        index: i,
                        error: `Failed to fetch transaction ${i}`,
                    }),
                );
            }
        }
        return transactions;
    } catch (error) {
        const errorMessage = handleContractError(error, "transaction fetch");
        throw new Error(errorMessage);
    }
};

// Check if authorized
export const checkIfAuthorized = async (user) => {
    try {
        if (!user || !user._ethereumAddress) {
            throw new Error("User is not authenticated or lacks Ethereum address");
        }
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return await contract.checkAuthState(user._ethereumAddress);
    } catch (error) {
        const errorMessage = handleContractError(error, "authorization check");
        throw new Error(errorMessage);
    }
};

// Convert ETH to USD
export const convertEthToUsd = async (amount, networkName = NETWORK_NAME) => {
    try {
        const ethAmount = Number(amount);
        if (isNaN(ethAmount) || ethAmount <= 0) {
            throw new Error("ETH amount must be a valid number greater than zero");
        }
        const ethPriceInUsd = await getLatestEthPriceWC(networkName);
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

// Estimate gas for commit purchase
export const estimateGasForCommitPurchase = async (networkName = NETWORK_NAME, amount, user) => {
    try {
        if (!amount || amount <= 0 || amount > 1000) {
            throw new Error("Amount must be between 1 and 1000 kWh");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const nonce = getNonceFromUid(user._uid);
        const hash = getHashedCommitment(amount, nonce, user._ethereumAddress);
        const gasEstimate = await contract.commitPurchase.estimateGas(hash);
        const gasPrice = (await contract.runner.provider.getFeeData()).gasPrice || ethers.parseUnits("10", "gwei");
        const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
        const gasCostInEth = Number(ethers.formatEther(gasCostInWei)).toFixed(6);
        const energyCostInEth = await getCost(amount, networkName);
        const energyCostInWei = ethers.parseEther(energyCostInEth);
        const totalCostInWei = BigInt(Number(energyCostInWei)) + BigInt(Number(gasCostInWei));
        const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(6);
        return {
            gasCostInEth,
            energyCostInEth,
            totalCostInEth,
            gasEstimate: gasEstimate.toString(),
        };
    } catch (error) {
        const errorMessage = handleContractError(error, "gas estimation for commit purchase");
        throw new Error(errorMessage);
    }
};

// Estimate gas for reveal purchase
export const estimateGasForRevealPurchase = async (networkName = NETWORK_NAME, amount, user) => {
    try {
        if (!amount || amount <= 0 || amount > 1000) {
            throw new Error("Amount must be between 1 and 1000 kWh");
        }
        if (!user || !user._ethereumAddress) {
            throw new Error("User Ethereum address is required");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        if (signerAddress.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
            throw new Error("Signer address does not match provided Ethereum address");
        }
        const ethPrice = await getLatestEthPriceWC(networkName);
        const totalCostWei = await contract.calculateRequiredPayment(amount, BigInt(ethPrice * 1e8));
        const nonce = getNonceFromUid(user._uid);
        const gasEstimate = await contract.revealPurchase.estimateGas(amount, nonce, { value: totalCostWei });
        const gasPrice = (await contract.runner.provider.getFeeData()).gasPrice || ethers.parseUnits("10", "gwei");
        const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
        const gasCostInEth = Number(ethers.formatEther(gasCostInWei)).toFixed(6);
        const energyCostInEth = Number(ethers.formatEther(totalCostWei)).toFixed(6);
        const totalCostInWei = totalCostWei + gasCostInWei;
        const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(6);
        return {
            gasCostInEth,
            energyCostInEth,
            totalCostInEth,
            gasEstimate: gasEstimate.toString(),
        };
    } catch (error) {
        const errorMessage = handleContractError(error, "gas estimation for reveal purchase");
        throw new Error(errorMessage);
    }
};

// Get ETH balance
export const getEthBalance = async (address, networkName = NETWORK_NAME) => {
    try {
        if (!ethers.isAddress(address)) {
            throw new Error("Invalid Ethereum address");
        }
        const targetConfig = NETWORK_CONFIG[networkName];
        const provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
        const balanceWei = await provider.getBalance(address);
        return ethers.formatEther(balanceWei);
    } catch (error) {
        const errorMessage = handleContractError(error, "ETH balance fetch");
        throw new Error(errorMessage);
    }
};

// Mock price functions
// export const getMockPrice = async (networkName = NETWORK_NAME) => {
//     try {
//         const mockPriceContract = await getContract(networkName, MOCKPRICE_ADDRESS, MOCKPRICE_ABI, false);
//         return (await mockPriceContract.latestRoundData()).answer;
//     } catch (error) {
//         const errorMessage = handleContractError(error, "mock price fetch");
//         throw new Error(errorMessage);
//     }
// };

// export const updateAnswer = async (price, networkName = NETWORK_NAME) => {
//     try {
//         const mockPriceContract = await getContract(networkName, MOCKPRICE_ADDRESS, MOCKPRICE_ABI, true);
//         await mockPriceContract.updateAnswer(price);
//     } catch (error) {
//         const errorMessage = handleContractError(error, "mock price update");
//         throw new Error(errorMessage);
//     }
// };

// Toggle bypassStaleCheck
export const setBypassStaleCheck = async (bypass, networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm(networkName);
        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner can set bypassStaleCheck");
            throw new Error("Only the contract owner can set bypassStaleCheck");
        }
        const tx = await contract.setBypassStaleCheck(bypass);
        const receipt = await tx.wait();
        alert(`Bypass stale check set to ${bypass}. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "bypass stale check update");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Added: Get price latest update timestamp
export const getPriceLatestUpdate = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const timestamp = await contract.getPriceLatestUpdate();
        return Number(timestamp);
    } catch (error) {
        const errorMessage = handleContractError(error, "price latest update fetch");
        throw new Error(errorMessage);
    }
};

// Added: Update payment receiver
export const updatePaymentReceiver = async (newReceiver, networkName = NETWORK_NAME) => {
    try {
        if (!ethers.isAddress(newReceiver)) {
            throw new Error("Invalid Ethereum address");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm(networkName);
        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner can update payment receiver");
            throw new Error("Only the contract owner can update payment receiver");
        }
        const tx = await contract.updatePaymentReceiver(newReceiver);
        const receipt = await tx.wait();
        alert(`Payment receiver updated to ${newReceiver}. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "payment receiver update");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Added: Withdraw refunds
export const withdrawRefunds = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.withdrawRefunds();
        const receipt = await tx.wait();
        alert(`Refunds withdrawn. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "refund withdrawal");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Added: Get authorized party list
export const getAuthorizedPartyList = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return await contract.getAuthorizedPartyList();
    } catch (error) {
        const errorMessage = handleContractError(error, "authorized party list fetch");
        throw new Error(errorMessage);
    }
};

// Added: Revoke all authorizations
export const revokeAllAuthorizations = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm(networkName);
        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner can revoke all authorizations");
            throw new Error("Only the contract owner can revoke all authorizations");
        }
        const tx = await contract.revokeAllAuthorizations();
        const receipt = await tx.wait();
        alert(`All authorizations revoked. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "revoke all authorizations");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Added: Revoke authorizations batch
export const revokeAuthorizationsBatch = async (startIndex, batchSize, networkName = NETWORK_NAME) => {
    try {
        if (startIndex < 0 || batchSize <= 0) {
            throw new Error("Invalid start index or batch size");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm(networkName);
        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner can revoke authorizations batch");
            throw new Error("Only the contract owner can revoke authorizations batch");
        }
        const tx = await contract.revokeAuthorizationsBatch(startIndex, batchSize);
        const receipt = await tx.wait();
        alert(`Batch authorizations revoked. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "batch authorization revocation");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Added: Get transaction by ID
export const getTransaction = async (id, networkName = NETWORK_NAME) => {
    try {
        if (id < 0) {
            throw new Error("Invalid transaction ID");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const tx = await contract.getTransaction(id);
        return new Transaction({
            index: id,
            buyer: tx.buyer,
            kWh: tx.kWh.toString(),
            pricePerKWhUSD: tx.pricePerKWhUSD.toString(),
            ethPriceUSD: tx.ethPriceUSD.toString(),
            timestamp: Number(tx.timestamp),
        });
    } catch (error) {
        const errorMessage = handleContractError(error, `transaction ${id} fetch`);
        throw new Error(errorMessage);
    }
};

// Added: Clear expired commitment
export const clearExpiredCommitment = async (buyer, networkName = NETWORK_NAME) => {
    try {
        if (!ethers.isAddress(buyer)) {
            throw new Error("Invalid buyer address");
        }
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.clearExpiredCommitment(buyer);
        const receipt = await tx.wait();
        alert(`Expired commitment cleared for ${buyer}. Tx hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "clear expired commitment");
        alert(errorMessage);
        throw new Error(errorMessage);
    }
};

// Added: Get transactions count
export const getTransactionsCount = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const count = await contract.getTransactionsCount();
        return Number(count);
    } catch (error) {
        const errorMessage = handleContractError(error, "transactions count fetch");
        throw new Error(errorMessage);
    }
};

// Added: Get contract constants
export const getContractConstants = async (networkName = NETWORK_NAME) => {
    try {
        const contract = await getContract(networkName, CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return {
            ADD_ENERGY_DELAY: Number(await contract.ADD_ENERGY_DELAY()),
            COMMIT_COOLDOWN: Number(await contract.COMMIT_COOLDOWN()),
            COMMIT_REVEAL_WINDOW: Number(await contract.COMMIT_REVEAL_WINDOW()),
            MAX_AUTHORIZED_PARTIES: Number(await contract.MAX_AUTHORIZED_PARTIES()),
            MAX_GAS_FOR_CALL: Number(await contract.MAX_GAS_FOR_CALL()),
            MAX_KWH_PER_PURCHASE: Number(await contract.MAX_KWH_PER_PURCHASE()),
            PRICE_PER_KWH_USD_CENTS: Number(await contract.PRICE_PER_KWH_USD_CENTS()),
            STALENESS_THRESHOLD: Number(await contract.STALENESS_THRESHOLD()),
        };
    } catch (error) {
        const errorMessage = handleContractError(error, "contract constants fetch");
        throw new Error(errorMessage);
    }
};

// Utility function
const getHashedCommitment = (kWh, nonce, sender) => {
    return ethers.keccak256(ethers.solidityPacked(["uint256", "uint256", "address"], [kWh, nonce, sender]));
};

export const getNonceFromUid = (uid) => {
    if (typeof uid !== "string" || uid.length === 0) {
        throw new Error("Invalid Firebase UID");
    }
    const hash = ethers.keccak256(ethers.toUtf8Bytes(uid));
    const hashNumber = Number(BigInt(hash.slice(0, 10)) & BigInt(0xffffffff));
    const nonce = 10000 + (hashNumber % 90000);
    return nonce.toString();
};

export default {
    checkContractConnection,
    getSolarFarm,
    getLatestEthPriceWC,
    getLatestEthPrice,
    getCost,
    getAvailableEnergy,
    commitPurchase,
    revealPurchase,
    getTransactions,
    checkIfAuthorized,
    addEnergy,
    pauseContract,
    unpauseContract,
    authorizeParty,
    unauthorizeParty,
    estimateGasForCommitPurchase,
    estimateGasForRevealPurchase,
    getEthBalance,
    convertEthToUsd,
    isPaused,
    setBypassStaleCheck,
    getPriceLatestUpdate,
    updatePaymentReceiver,
    withdrawRefunds,
    getAuthorizedPartyList,
    revokeAllAuthorizations,
    revokeAuthorizationsBatch,
    getTransaction,
    clearExpiredCommitment,
    getTransactionsCount,
    getContractConstants,
    getNonceFromUid,
};
