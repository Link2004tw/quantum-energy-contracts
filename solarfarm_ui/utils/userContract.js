// Modified userContract.js to import common utilities from contractUtils.js
import { ethers } from "ethers";
import {
    CONTRACT_ADDRESS,
    getContract,
    handleContractError,
    getHashedCommitment,
    getNonceFromUid,
    getLatestEthPriceWC,
    checkContractConnection,
    getSolarFarm,
    getAvailableEnergy,
    checkIfAuthorized,
    getEthBalance,
    isPaused,
    getMockPrice,
} from "./contractUtils";
import { Transaction } from "@/models/transaction";
import CONTRACT_ABI from "../config/SolarFarmABI.json";

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

        const ethPriceForContract = BigInt(Math.round(ethPriceInUsd * 1e8));
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

// Enhanced revealPurchase with custom error handling
export const revealPurchase = async (amount, user) => {
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

        const ethPrice = await contract.getLatestEthPriceWithoutCaching();
        const totalCostWei = await contract.calculateRequiredPayment(amount, ethPrice / BigInt(10 ** 10));
        const gasEstimate = await contract.revealPurchase.estimateGas(amount, getNonceFromUid(user._uid), {
            value: totalCostWei,
        });

        console.log("totalCostWei in ETH:", ethers.formatEther(totalCostWei));
        console.log(`Executing revealPurchase for ${amount} kWh...`);
        const revealTx = await contract.revealPurchase(amount, getNonceFromUid(user._uid), {
            value: totalCostWei,
            gasLimit: gasEstimate,
        });

        const receipt = await revealTx.wait();
        console.log(`revealPurchase transaction confirmed: ${receipt.hash}`);

        try {
            await contract.withdrawRefunds();
            alert("Pending refunds withdrawn successfully");
        } catch (withdrawError) {
            const withdrawMessage = handleContractError(withdrawError, "refund withdrawal");
            console.log(withdrawMessage);
            alert(`Purchase succeeded, ${withdrawMessage}`);
        }
        return receipt.hash;
    } catch (error) {
        const errorMessage = handleContractError(error, "purchase reveal");
        throw new Error(errorMessage);
    }
};

// Get transactions
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

// Convert ETH to USD
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

// Gas estimation functions
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

export default {
    getCost,
    commitPurchase,
    revealPurchase,
    getTransactions,
    convertEthToUsd,
    estimateGasForCommitPurchase,
    estimateGasForRevealPurchase,
    checkContractConnection,
    getSolarFarm,
    getLatestEthPriceWC,
    getAvailableEnergy,
    checkIfAuthorized,
    getEthBalance,
    isPaused,
    getMockPrice,
    getNonceFromUid,
};
