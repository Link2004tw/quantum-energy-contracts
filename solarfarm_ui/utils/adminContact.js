// Modified adminContract.js to handle uranium in pounds instead of energy in kWh, compatible with UraniumPriceConsumer smart contract
import {
  CONTRACT_ADDRESS,
  getContract,
  handleContractError,
  // Updated import to use getUraniumContract
  getLatestEthPriceWC,
  isPaused,
  getNonceFromUid,
  checkContractConnection,
  getSolarFarm,
} from "./contractUtils";

// Updated ABI import to reference uranium contract
import CONTRACT_ABI from "../config/UraniumContractABI.json";
import { ethers } from "ethers";
import { Transaction } from "@/models/transaction";

// Updated addEnergy to addUraniumLbs to add uranium in pounds
export const addUraniumLbs = async (uraniumLbs) => {
  try {
    // Updated validation to check uraniumLbs
    if (!uraniumLbs || uraniumLbs <= 0 || uraniumLbs > 1000) {
      throw new Error("uraniumLbs must be between 1 and 1000");
    }

    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
    const signer = await contract.runner.provider.getSigner();
    const signerAddress = await signer.getAddress();
    // Updated to use getUraniumContract
    const ownerAddress = await getSolarFarm();

    if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      alert("Only the contract owner (uranium contract) can add uranium");
      throw new Error("Only the contract owner can add uranium");
    }

    // Updated contract calls to uranium-specific functions
    const requestTx = await contract.requestAddUranium(uraniumLbs);
    await requestTx.wait();

    const ADD_URANIUM_DELAY = 2 * 60 * 1000; // Renamed delay constant
    alert(
      `Please wait 2 minutes before confirming the uranium addition. Transaction hash: ${requestTx.hash}`
    );
    await new Promise((resolve) => setTimeout(resolve, ADD_URANIUM_DELAY));

    const confirmTx = await contract.confirmAddUranium(uraniumLbs);
    await confirmTx.wait();
    alert(
      `Uranium added successfully! ${uraniumLbs} lbs added to the pool. Transaction hash: ${confirmTx.hash}`
    );

    return {
      requestTxHash: requestTx.hash,
      confirmTxHash: confirmTx.hash,
    };
  } catch (error) {
    console.error("Error adding uranium:", error);
    const errorMessage = handleContractError(error, "uranium addition");
    alert(`Error adding uranium: ${errorMessage}`);
    throw new Error(`Error adding uranium: ${errorMessage}`);
  }
};

// Enhanced authorization functions with custom error handling (unchanged)
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

// Enhanced pause/unpause functions (unchanged)
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

// Mock price update function remains commented out
// export const updateAnswer = async (price) => {
//     try {
//         const mockPriceContract = await getContract(MOCKP_RICE_ADDRESS, MOCKPRICE_ABI, true);
//         await mockPriceContract.updateAnswer(price);
//     } catch (error) {
//         const errorMessage = handleContractError(error, "mock price update");
//         throw new Error(errorMessage);
//     }
// };

// Updated getTransactions to handle uranium-related fields
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
            // Updated to use uraniumPounds and renamed to uraniumAmountLbs for Transaction class
            uraniumAmountLbs: tx.uraniumPounds.toString(),
            // Updated to use pricePerPoundUSD
            uraniumPriceUSD: tx.uraniumPriceUSD.toString(),
            ethPriceUSD: tx.ethPriceUSD.toString(),
            timestamp: Number(tx.timestamp),
            // Added cost and seller fields from Transaction struct
            cost: tx.cost.toString(),
            seller: tx.seller,
          })
        );
      } catch (error) {
        console.error(`Error fetching transaction at index ${i}:`, error);
        transactions.push(
          new Transaction({
            index: i,
            error: `Failed to fetch transaction ${i}`,
          })
        );
      }
    }
    return transactions;
  } catch (error) {
    const errorMessage = handleContractError(error, "transaction fetch");
    throw new Error(errorMessage);
  }
};

export default {
  getTransactions,
  // Updated export to use addUraniumLbs
  addUraniumLbs,
  authorizeParty,
  unauthorizeParty,
  pauseContract,
  unpauseContract,
  checkContractConnection,
  // Updated export to use getUraniumContract
  getLatestEthPriceWC,
  isPaused,
  getNonceFromUid,
};
