// Modified userContract.js to import common utilities from contractUtils.js
import { ethers } from "ethers";
import {
    CONTRACT_ADDRESS,
    getContract,
    handleContractError,
    getHashedCommitment,
    getNonceFromUid,
} from "./contractUtils";
import CONTRACT_ABI from "../config/SolarFarmABI.json";

// Enhanced commitPurchase with custom error handling
export const commitPurchase = async (amount, user) => {
    try {
        if (amount > 1000) {
            throw new Error("Amount cannot be bigger than 1000 kWh");
        }

        const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
        const nonce = getNonceFromUid(user._uid);
        const hash = getHashedCommitment(amount, nonce, user._ethereumAddress);
        console.log({
            amount,
            user,
            nonce,
        });
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
        return {
            txHash: receipt.hash,
            nonce: getNonceFromUid(user._uid),
        };
    } catch (error) {
        const errorMessage = handleContractError(error, "purchase reveal");
        throw new Error(errorMessage);
    }
};

export default {
    commitPurchase,
    revealPurchase,
};
