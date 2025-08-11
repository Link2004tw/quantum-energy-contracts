// Modified adminContract.js to import common utilities from contractUtils.js
import {
    CONTRACT_ADDRESS,
    MOCKP_RICE_ADDRESS,
    getContract,
    handleContractError,
    getSolarFarm,
    getLatestEthPriceWC,
    getAvailableEnergy,
    checkIfAuthorized,
    getEthBalance,
    isPaused,
    getMockPrice,
    getNonceFromUid,
    checkContractConnection,
} from "./contractUtils";

import CONTRACT_ABI from "../config/SolarFarmABI.json";
import MOCKPRICE_ABI from "../config/MockPriceABI.json";

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

        const requestTx = await contract.requestAddEnergy(kwh);
        await requestTx.wait();

        const ADD_ENERGY_DELAY = 2 * 60 * 1000;
        alert(`Please wait 2 minutes before confirming the energy addition. Transaction hash: ${requestTx.hash}`);
        await new Promise((resolve) => setTimeout(resolve, ADD_ENERGY_DELAY));

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

// Mock price update function for testing
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
    addEnergy,
    authorizeParty,
    unauthorizeParty,
    pauseContract,
    unpauseContract,
    updateAnswer,
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
