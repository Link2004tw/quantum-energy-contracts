"use server";

import { ethers } from "ethers";
import CONTRACT_ABI from "@/config/SolarFarmABI.json";
import {
    checkIfAuthorized,
    CONTRACT_ADDRESS,
    getHashedCommitment,
    getLatestEthPriceWC,
    getNonceFromUid,
    handleContractError,
    NETWORK_CONFIG,
    NETWORK_NAME,
    getCost,
    convertEthToUsd,
} from "@/utils/contractUtils";

import { randomBytes } from "crypto";
import { saveData } from "@/utils/adminDatabaseUtils";
import { cookies } from "next/headers";
import User from "@/models/user";
// Your existing helper functions and constants would be imported here
// import { CONTRACT_ADDRESS, CONTRACT_ABI, NETWORK_CONFIG, NETWORK_NAME } from './your-config';
// import { getNonceFromUid, getHashedCommitment, getCost, handleContractError } from './your-helpers';

// Modified getContract function for server-side use
const getContractWithPrivateKey = async () => {
    try {
        const privateKey = process.env.TESTER_PRIVATE_KEY;

        if (!privateKey) {
            throw new Error("TESTER_PRIVATE_KEY environment variable is not set");
        }

        // Get the target network config (assuming Sepolia)
        const targetConfig = NETWORK_CONFIG[NETWORK_NAME];

        // Create provider
        const provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);

        // Create wallet from private key
        const wallet = new ethers.Wallet(privateKey, provider);

        // Verify we're connected to the right network
        const network = await provider.getNetwork();
        if (network.chainId.toString() !== targetConfig.chainId) {
            throw new Error(`Wrong network. Expected ${targetConfig.chainId}, got ${network.chainId}`);
        }
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
        // Return contract instance with signer
        return {
            contract,
            walletAddress: wallet.address, // Added wallet public address
        };
        //return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    } catch (error) {
        const errorMessage = handleContractError(error, "server-side contract initialization");
        throw new Error(`Failed to initialize contract with private key: ${errorMessage}`);
    }
};

// Modified gas estimation function for server-side use
export const estimateGasCostForCommitment = async (amount, user, csrfToken) => {
    try {
        validateCsrfToken(csrfToken);
        if (amount > 1000) {
            throw new Error("Amount cannot be bigger than 1000 kWh");
        }

        // Use the server-side contract connection
        const { contract, walletAddress } = await getContractWithPrivateKey();
        const nonce = getNonceFromUid(user._uid);
        const hash = getHashedCommitment(amount, nonce, walletAddress);

        // Estimate gas for the commit purchase
        const gasEstimate = await contract.commitPurchase.estimateGas(hash);
        console.log("Gas estimate:", gasEstimate);

        // Get current gas price
        const gasPrice = (await contract.runner.provider.getFeeData()).gasPrice;
        console.log("Gas price:", gasPrice);

        // Calculate gas cost
        const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
        console.log("Gas cost in Wei:", gasCostInWei);

        const gasCostInEth = ethers.formatEther(gasCostInWei);
        console.log("Gas cost in ETH:", gasCostInEth);

        // Get energy cost
        const energyCostInEth = await getCost(amount);
        console.log("Energy cost in ETH:", energyCostInEth);

        const energyCostInWei = ethers.parseEther(energyCostInEth);
        console.log("Energy cost in Wei:", energyCostInWei);

        // Calculate total cost
        const totalCostInWei = BigInt(energyCostInWei) + BigInt(gasCostInWei);
        console.log("Total cost in Wei:", totalCostInWei);

        const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(6);

        return {
            success: true,
            data: {
                gasCostInEth,
                energyCostInEth,
                totalCostInEth,
                gasEstimate: gasEstimate.toString(),
                walletAddress: contract.runner.address, // Include the wallet address used
            },
        };
    } catch (error) {
        console.error("Gas estimation error:", error);
        const errorMessage = handleContractError(error, "gas estimation for commit purchase");

        return {
            success: false,
            error: errorMessage,
        };
    }
};

// Alternative server action that you can call directly from your components
export async function estimateCommitmentGas(formData) {
    try {
        const amount = parseFloat(formData.get("amount"));
        const userUid = formData.get("userUid");
        const userEthereumAddress = formData.get("userEthereumAddress");
        const csrfToken = formData.get("csrfToken"); // Added: Get CSRF token from form

        if (!amount || !userUid || !userEthereumAddress) {
            throw new Error("Missing required parameters: amount, userUid, userEthereumAddress");
        }

        const user = {
            _uid: userUid,
            _ethereumAddress: userEthereumAddress,
        };

        const result = await estimateGasCostForCommitment(amount, user, csrfToken);
        return result;
    } catch (error) {
        console.error("Server action error:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

export const estimateGasCostForRevealPurchase = async (amount, user, csrfToken) => {
    validateCsrfToken(csrfToken);
    try {
        if (!amount || amount <= 0 || amount > 1000) {
            throw new Error("Amount must be between 1 and 1000 kWh");
        }
        if (!user || !user._ethereumAddress) {
            throw new Error("User Ethereum address is required");
        }

        // Use the server-side contract connection
        const { contract, walletAddress } = await getContractWithPrivateKey();

        // Note: For server-side, we're using the private key wallet address
        // If you need to validate against user's address, you might want to handle this differently
        console.log("Using wallet address:", walletAddress);
        console.log("User Ethereum address:", user._ethereumAddress);

        const ethPrice = await getLatestEthPriceWC();
        const totalCostWei = await contract.calculateRequiredPayment(amount, BigInt(parseInt(ethPrice * 1e8)));

        const nonce = getNonceFromUid(user._uid);

        // Estimate gas for the reveal purchase
        const gasEstimate = await contract.revealPurchase.estimateGas(amount, nonce, {
            value: totalCostWei,
        });

        // Get current gas price
        const feeData = await contract.runner.provider.getFeeData();
        let gasPrice = Number(feeData.gasPrice);
        if (!gasPrice || gasPrice === 0) {
            gasPrice = ethers.parseUnits("10", "gwei");
        }

        // Calculate costs
        const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
        const gasCostInEth = Number(ethers.formatEther(gasCostInWei)).toFixed(6);
        const energyCostInEth = Number(ethers.formatEther(totalCostWei)).toFixed(6);
        const totalCostInWei = totalCostWei + gasCostInWei;
        const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(6);

        return {
            success: true,
            data: {
                gasCostInEth,
                energyCostInEth,
                totalCostInEth,
                gasEstimate: gasEstimate.toString(),
                walletAddress: walletAddress,
                ethPrice: ethPrice,
                totalCostWei: totalCostWei.toString(),
            },
        };
    } catch (error) {
        console.error("Gas estimation error (reveal):", error);
        const errorMessage = handleContractError(error, "gas estimation for reveal purchase");

        return {
            success: false,
            error: errorMessage,
        };
    }
};

// Server action for reveal gas estimation
export async function estimateRevealGas(formData) {
    try {
        const amount = parseFloat(formData.get("amount"));
        const userUid = formData.get("userUid");
        const userEthereumAddress = formData.get("userEthereumAddress");
        const csrfToken = formData.get("csrfToken"); // Added: Get CSRF token

        if (!amount || !userUid || !userEthereumAddress) {
            throw new Error("Missing required parameters: amount, userUid, userEthereumAddress");
        }

        const user = {
            _uid: userUid,
            _ethereumAddress: userEthereumAddress,
        };

        const result = await estimateGasCostForRevealPurchase(amount, user, csrfToken);
        return result;
    } catch (error) {
        console.error("Server action error (reveal):", error);
        return {
            success: false,
            error: error.message,
        };
    }
}
const validateCsrfToken = (token) => {
    const storedToken = cookies().get("csrfToken")?.value;
    if (!token || token !== storedToken) {
        throw new Error("Invalid or missing CSRF token");
    }
};

export const generateCsrfToken = async () => {
    const token = randomBytes(32).toString("hex");
    await cookies().set("csrfToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60, // 24 hours
    });
    return token;
};

export const saveOrderToFirebase = async (order, user, csrfToken) => {
    validateCsrfToken(csrfToken);

    await saveData(order, `committedOrders/${user._uid}/${order.transactionHash}`);
    await saveData(user, `users/${user._uid}`);
};

export const checkIfAuthorizedAction = async (user, csrfToken) => {
    try {
        validateCsrfToken(csrfToken);
        const userData = new User({ ...user });
        return await checkIfAuthorized(userData);
    } catch (error) {
        console.error("Error checking authorization:", error);
        throw new Error("Failed to check authorization status.");
    }
};

export const convertEthToUsdAction = async (eth) => {
    const { ethAmount, usdAmount, ethPriceInUsd } = await convertEthToUsd(eth);
    return {
        ethAmount,
        usdAmount,
        ethPriceInUsd,
    };
};

export const updateUser = async (updatedUser, csrfToken) => {
    validateCsrfToken(csrfToken);

    try {
        await saveData(updatedUser, `/users/${user._uid}`);
    } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user.");
    }
};

export const saveRequest = async (authRequest, csrfToken) => {
    validateCsrfToken(csrfToken);

    try {
        await saveData(authRequest, `requests/${request.userId}`);
        return { success: true, message: "Request saved successfully!" };
    } catch (error) {
        console.error("Error saving request:", error);
        throw new Error("Failed to save request.");
    }
};
