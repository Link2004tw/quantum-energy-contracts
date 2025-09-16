// Modified contract.js to use global NETWORK_NAME constant instead of networkName parameter
import { ethers } from "ethers";
import CONTRACT_ABI from "../config/SolarFarmABI.json";
import MOCKPRICE_ABI from "../config/MockPriceABI.json";
import { Transaction } from "@/models/transaction";

// Global network name constant
const NETWORK_NAME = "sepolia";

// Contract addresses
const CONTRACT_ADDRESS = "0xF399661F462324D8f3d5726Ab3C7d743a85412f0";
const MOCKP_RICE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Network configuration
const NETWORK_CONFIG = {
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
        rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/9HRFmzrQc9Mw5J5u1BW4bMJq2B-6ktFL",
        chainName: "Sepolia",
        currency: { name: "ETH", symbol: "ETH", decimals: 18 },
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },
};

// Custom error decoder utility
const decodeCustomError = (error) => {
    try {
        const iface = new ethers.Interface(CONTRACT_ABI);
        const errorData = error.data || (error.error && error.error.data) || error.reason;

        if (!errorData) return null;

        // Try to parse the error
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

// Enhanced error handler with custom error support
const handleContractError = (error, operation = "contract operation") => {
    if (operation != "refund withdrawal") {
        console.error(`Error during ${operation}:`, error);
    }

    // Added: Check for insufficient funds error
    if (error.code === -32000 || (error.message && error.message.includes("insufficient funds"))) {
        return "Insufficient funds: Your wallet does not have enough ETH to cover the transaction and gas costs.";
    }

    const decodedError = decodeCustomError(error);

    if (decodedError) {
        switch (decodedError.name) {
            case "InsufficientEnergyAvailable":
                return `Insufficient energy available. Requested: ${decodedError.args[0]} kWh, Available: ${decodedError.args[1]} kWh`;

            case "PaymentAmountTooSmall":
                const providedEth = Number(ethers.formatEther(decodedError.args[0])).toFixed(6);
                const requiredEth = Number(ethers.formatEther(decodedError.args[1])).toFixed(6);
                return `Payment too small. Provided: ${providedEth} ETH, Required: ${requiredEth} ETH`;

            case "PriceFeedStale":
                const lastUpdate = new Date(Number(decodedError.args[0]) * 1000).toLocaleString();
                const threshold = Number(decodedError.args[1]) / 60; // Convert to minutes
                return `Price feed is stale. Last update: ${lastUpdate}`;

            case "CommitmentExpired":
                const commitTime = Number(decodedError.args[0]);
                const currentTime = Number(decodedError.args[1]);
                if (commitTime === 0) {
                    return "No commitment found. Please commit to a purchase first.";
                }
                return `Commitment expired. Committed at: ${new Date(
                    commitTime * 1000,
                ).toLocaleString()}, Current: ${new Date(currentTime * 1000).toLocaleString()}`;

            case "CommitmentCooldownActive":
                const lastCommit = new Date(Number(decodedError.args[0]) * 1000).toLocaleString();
                return `Commitment cooldown active. Last commit: ${lastCommit}. Please wait before committing again.`;

            case "DelayNotElapsed":
                const requestTime = new Date(Number(decodedError.args[0]) * 1000).toLocaleString();
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
                return `Contract error: ${decodedError.name} - ${JSON.stringify(decodedError.args)}`;
        }
    }

    // Fallback to original error message
    return error.reason || error.message || `Failed to perform ${operation}`;
};

// Initialize contract with enhanced error handling
const getContract = async (address, abi, useSigner = false) => {
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
            const targetConfig = NETWORK_CONFIG[NETWORK_NAME];
            provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
            return new ethers.Contract(address, abi, provider);
        }
    } catch (error) {
        const errorMessage = handleContractError(error, "contract initialization");
        throw new Error(`Failed to initialize contract: ${errorMessage}`);
    }
};

// Enhanced getCost function with better error handling
export const getCost = async (amount) => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const energy = Number(amount);

        if (isNaN(energy) || energy <= 0) {
            throw new Error("Energy amount must be a valid number greater than zero");
        }

        const ethPriceInUsd = await getLatestEthPriceWC();
        console.log(ethPriceInUsd);

        // Convert to the format expected by the contract (USD cents with proper scaling)
        const ethPriceForContract = BigInt(Math.round(ethPriceInUsd * 1e8)); // Chainlink 8 decimal format

        const priceInWei = await contract.calculateRequiredPayment(energy, ethPriceForContract);
        console.log(priceInWei);
        const priceInEth = ethers.formatUnits(priceInWei, 18);
        console.log(priceInEth);
        return Number(priceInEth).toFixed(6);
    } catch (error) {
        const errorMessage = handleContractError(error, "cost calculation");
        throw new Error(errorMessage);
    }
};

// Enhanced getLatestEthPriceWC with custom error handling
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

// Enhanced commitPurchase with custom error handling
export const commitPurchase = async (amount, user) => {
    try {
        if (amount > 1000) {
            throw new Error("Amount cannot be bigger than 1000 kWh");
        }

        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const nonce = getNonceFromUid(user._uid);
        const hash = getHashedCommitment(amount, nonce, user._ethereumAddress);

        const tx = await contract.commitPurchase(hash);
        await tx.wait();
        return hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "purchase commitment");
        throw new Error(errorMessage);
    }
};

export const revealPurchase = async (amount, user) => {
    try {
        // Validate inputs
        if (!amount || amount <= 0 || amount > 1000) {
            throw new Error("Amount must be between 1 and 1000 kWh");
        }
        if (!user || !user._ethereumAddress) {
            throw new Error("User Ethereum address is required");
        }

        // Initialize contract and signer
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();

        if (signerAddress.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
            throw new Error("Signer address does not match provided Ethereum address");
        }

        // Start listeners for relevant events
        const ethPrice = await contract.getLatestEthPriceWithoutCaching();
        // CHANGED: Fixed division to BigInt(10 ** 10) to match 8-decimal input for calculateRequiredPayment
        const totalCostWei = await contract.calculateRequiredPayment(amount, ethPrice / BigInt(10 ** 10));
        // Estimate gas
        const gasEstimate = await contract.revealPurchase.estimateGas(amount, getNonceFromUid(user._uid), {
            value: totalCostWei,
        });

        // Execute revealPurchase
        console.log("totalCostWei in ETH:", ethers.formatEther(totalCostWei));
        console.log(`Executing revealPurchase for ${amount} kWh...`);
        const revealTx = await contract.revealPurchase(amount, getNonceFromUid(user._uid), {
            value: totalCostWei,
            gasLimit: gasEstimate,
        });

        // Wait for transaction confirmation
        const receipt = await revealTx.wait();
        console.log(`revealPurchase transaction confirmed: ${receipt.hash}`);

        // Wait for events

        try {
            await contract.withdrawRefunds();
            alert("Pending refunds withdrawn successfully");
        } catch (withdrawError) {
            const withdrawMessage = handleContractError(withdrawError, "refund withdrawal");
            console.log(withdrawMessage);
            alert(`Purchase succeeded, ${withdrawMessage}`);
        }
        return receipt.hash;

        // Return transaction hash and event data
    } catch (error) {
        const errorMessage = handleContractError(error, "purchase reveal");
        throw new Error(errorMessage);
    }
};

// Enhanced addEnergy with custom error handling
export const addEnergy = async (kwh) => {
    try {
        if (!kwh || kwh <= 0 || kwh > 1000) {
            alert("kWh must be between 1 and 1000");
            throw new Error("kWh must be between 1 and 1000");
        }

        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();
        const ownerAddress = await getSolarFarm();

        if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            alert("Only the contract owner (solar farm) can add energy");
            throw new Error("Only the contract owner can add energy");
        }

        // Step 1: Request to add energy
        const requestTx = await contract.requestAddEnergy(kwh);
        await requestTx.wait();

        // Step 2: Wait for ADD_ENERGY_DELAY (2 minutes = 120,000 ms)
        const ADD_ENERGY_DELAY = 2 * 60 * 1000; // 2 minutes in milliseconds
        alert(`Please wait 2 minutes before confirming the energy addition. Transaction hash: ${requestTx.hash}`);
        await new Promise((resolve) => setTimeout(resolve, ADD_ENERGY_DELAY));

        // Step 3: Confirm adding energy
        const confirmTx = await contract.confirmAddEnergy(kwh);
        await confirmTx.wait();
        alert(`Energy added successfully! ${kwh} kWh added to the pool. Transaction hash: ${confirmTx.hash}`);

        return {
            requestTxHash: requestTx.hash,
            confirmTxHash: confirmTx.hash,
        };
    } catch (error) {
        console.error("Error adding energy:", error);
        const errorMessage = handleContractError(error, "energy addition");
        alert(`Error adding energy: ${errorMessage}`);
        throw new Error(`Error adding energy: ${errorMessage}`);
    }
};

// Enhanced authorization functions with custom error handling
export const authorizeParty = async (address) => {
    try {
        if (!ethers.isAddress(address)) {
            throw new Error("Invalid Ethereum address");
        }

        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.authorizeParty(address);
        const receipt = await tx.wait();
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "party authorization");
        throw new Error(errorMessage);
    }
};

export const unauthorizeParty = async (address) => {
    try {
        if (!ethers.isAddress(address)) {
            throw new Error("Invalid Ethereum address");
        }

        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.unAuthorizeParty(address);
        const receipt = await tx.wait();
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "party deauthorization");
        throw new Error(errorMessage);
    }
};

// Enhanced pause/unpause functions
export const pauseContract = async () => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.pause();
        const receipt = await tx.wait();
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "contract pause");
        throw new Error(errorMessage);
    }
};

export const unpauseContract = async () => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const tx = await contract.unpause();
        const receipt = await tx.wait();
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "contract unpause");
        throw new Error(errorMessage);
    }
};

// Keep all other existing functions with enhanced error handling applied
export const checkContractConnection = async () => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const provider = contract.runner.provider;

        const network = await provider.getNetwork();
        const targetConfig = NETWORK_CONFIG[NETWORK_NAME];
        if (network.chainId.toString() !== targetConfig.chainId) {
            throw new Error(`Wrong network: expected chainId ${targetConfig.chainId}, got ${network.chainId}`);
        }

        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === "0x") {
            throw new Error(`No contract deployed at address ${CONTRACT_ADDRESS}`);
        }

        const solarFarmAddress = await contract.solarFarm();
        if (!ethers.isAddress(solarFarmAddress)) {
            throw new Error(`Invalid solarFarm address returned: ${solarFarmAddress}`);
        }

        return {
            isConnected: true,
            message: `Successfully connected to EnergyContract at ${CONTRACT_ADDRESS} on ${targetConfig.chainName}`,
            chainId: network.chainId.toString(),
            solarFarmAddress,
        };
    } catch (error) {
        return {
            isConnected: false,
            message: `Connection failed: ${error.message}`,
            chainId: null,
            solarFarmAddress: null,
        };
    }
};

// Utility functions (keep existing implementations)
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

// Export all existing functions with enhanced error handling
export const getSolarFarm = async () => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return await contract.solarFarm();
    } catch (error) {
        const errorMessage = handleContractError(error, "solar farm address retrieval");
        throw new Error(errorMessage);
    }
};

export const getAvailableEnergy = async () => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return await contract.availableKWh();
    } catch (error) {
        const errorMessage = handleContractError(error, "available energy fetch");
        throw new Error(errorMessage);
    }
};

export const checkIfAuthorized = async (user) => {
    try {
        if (!user || !user.ethereumAddress) {
            throw new Error("User is not authenticated or does not have an Ethereum address.");
        }
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        return await contract.checkAuthState(user.ethereumAddress);
    } catch (error) {
        const errorMessage = handleContractError(error, "authorization check");
        throw new Error(errorMessage);
    }
};

// Add other existing functions with enhanced error handling...
export const getTransactions = async () => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
        const transactionCount = await contract.transactionCount();
        const transactionCountNum = Number(transactionCount);
        const transactions = [];

        for (let i = 0; i < transactionCountNum; i++) {
            try {
                const tx = await contract.transactions(i);
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
                console.error(`Error fetching transaction at index ${i}:`, error);
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

// Gas estimation functions with enhanced error handling
export const estimateGasForCommitPurchase = async (amount, user) => {
    try {
        if (amount > 1000) {
            throw new Error("Amount cannot be bigger than 1000 kWh");
        }

        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const nonce = getNonceFromUid(user._uid);
        const hash = getHashedCommitment(amount, nonce, user._ethereumAddress);

        const gasEstimate = await contract.commitPurchase.estimateGas(hash);
        console.log("gas ", gasEstimate);
        const gasPrice = (await contract.runner.provider.getFeeData()).gasPrice;
        console.log("gas 1", gasPrice);

        const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
        console.log("gas 2", gasCostInWei);
        const gasCostInEth = ethers.formatEther(gasCostInWei);
        console.log("gas 3", gasCostInEth);

        const energyCostInEth = await getCost(amount);
        console.log(4, energyCostInEth);
        const energyCostInWei = ethers.parseEther(energyCostInEth);
        console.log(5, energyCostInWei);
        const totalCostInWei = BigInt(energyCostInWei) + BigInt(gasCostInWei);
        console.log(6, totalCostInWei);

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

export const estimateGasForRevealPurchase = async (amount, user) => {
    try {
        if (!amount || amount <= 0 || amount > 1000) {
            throw new Error("Amount must be between 1 and 1000 kWh");
        }
        if (!user || !user._ethereumAddress) {
            throw new Error("User Ethereum address is required");
        }

        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const signer = await contract.runner.provider.getSigner();
        const signerAddress = await signer.getAddress();

        if (signerAddress.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
            throw new Error("Signer address does not match provided Ethereum address");
        }

        const ethPrice = await getLatestEthPriceWC();
        const totalCostWei = await contract.calculateRequiredPayment(amount, BigInt(parseInt(ethPrice * 1e8)));
        const nonce = getNonceFromUid(user._uid);

        const gasEstimate = await contract.revealPurchase.estimateGas(amount, nonce, {
            value: totalCostWei,
        });

        const feeData = await contract.runner.provider.getFeeData();
        let gasPrice = Number(feeData.gasPrice);
        if (!gasPrice || gasPrice === 0) {
            gasPrice = ethers.parseUnits("10", "gwei");
        }

        const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
        const gasCostInEth = Number(ethers.formatEther(gasCostInWei)).toFixed(6);
        const energyCostInEth = Number(ethers.formatEther(totalCostWei)).toFixed(6);
        const totalCostInWei = totalCostWei + gasCostInWei;
        const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(6);

        return {
            gasCostInEth,
            energyCostInEth,
            totalCostInEth,
            gasEstimate: gasEstimate,
        };
    } catch (error) {
        const errorMessage = handleContractError(error, "gas estimation for reveal purchase");
        throw new Error(errorMessage);
    }
};

// Keep existing utility functions
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

export const isPaused = async () => {
    try {
        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, false);
        return await contract.paused();
    } catch (error) {
        const errorMessage = handleContractError(error, "pause status check");
        throw new Error(errorMessage);
    }
};

// Mock price functions for testing
export const getMockPrice = async () => {
    try {
        const mockPriceContract = await getContract(MOCKP_RICE_ADDRESS, MOCKPRICE_ABI, false);
        return (await mockPriceContract.latestRoundData()).answer;
    } catch (error) {
        const errorMessage = handleContractError(error, "mock price fetch");
        throw new Error(errorMessage);
    }
};

export const updateAnswer = async (price) => {
    try {
        const mockPriceContract = await getContract(MOCKP_RICE_ADDRESS, MOCKPRICE_ABI, true);
        await mockPriceContract.updateAnswer(price);
    } catch (error) {
        const errorMessage = handleContractError(error, "mock price update");
        throw new Error(errorMessage);
    }
};

export default {
    // Export all functions
    checkContractConnection,
    getSolarFarm,
    getLatestEthPriceWC,
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
    getMockPrice,
    updateAnswer,
    getNonceFromUid,
};
