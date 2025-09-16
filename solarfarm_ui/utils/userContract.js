// Modified userContract.js to handle uranium in pounds instead of energy in kWh, compatible with UraniumPriceConsumer smart contract
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  getContract,
  handleContractError,
  getHashedCommitment,
  getNonceFromUid,
} from "./contractUtils";

// Updated ABI import to reference uranium contract
import CONTRACT_ABI from "../config/UraniumContractABI.json";

// Updated commitPurchase to handle uraniumLbs instead of kWh
export const commitPurchase = async (uraniumLbs, user, secret) => {
  try {
    console.log(2);
    // Updated validation to check uraniumLbs
    if (uraniumLbs > 1000) {
      throw new Error("Uranium amount cannot be bigger than 1000 lbs");
    }

    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
    const nonce = getNonceFromUid(user._uid);
    // Updated to use uraniumLbs in hash calculation
    const hash = getHashedCommitment(
      uraniumLbs,
      nonce,
      user._ethereumAddress,
      secret
    );

    console.log("Committing purchase with hash:", hash);
    const tx = await contract.commitPurchase(hash);
    await tx.wait();
    return hash;
  } catch (error) {
    const errorMessage = handleContractError(
      error,
      "uranium purchase commitment"
    );
    throw new Error(errorMessage);
  }
};

// Updated revealPurchase to handle uraniumLbs instead of kWh
export const revealPurchase = async (uraniumLbs, user, secret) => {
  try {
    console.log(1);
    // Updated validation to check uraniumLbs
    if (!uraniumLbs || uraniumLbs <= 0 || uraniumLbs > 1000) {
      throw new Error("Uranium amount must be between 1 and 1000 lbs");
    }
    if (!user || !user._ethereumAddress) {
      throw new Error("User Ethereum address is required");
    }
    const contract = await getContract(CONTRACT_ADDRESS, CONTRACT_ABI, true);
    const signer = await contract.runner.provider.getSigner();
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
      throw new Error(
        "Signer address does not match provided Ethereum address"
      );
    }
    const ethPrice = await contract.getLatestEthPriceWithoutCaching();
    // Updated to use uraniumLbs in cost calculation
    const totalCostWei = await contract.calculateRequiredPayment(
      uraniumLbs,
      ethPrice / BigInt(10 ** 10)
    );

    console.log("totalCostWei in ETH:", ethers.formatEther(totalCostWei));
    // Updated log message to reference uraniumLbs
    console.log(`Executing revealPurchase for ${uraniumLbs} lbs...`);
    console.log(secret);
    console.log(getNonceFromUid(user._uid));
    const revealTx = await contract.revealPurchase(
      uraniumLbs,
      getNonceFromUid(user._uid),
      secret,
      {
        value: totalCostWei,
      }
    );

    const receipt = await revealTx.wait();
    console.log(`revealPurchase transaction confirmed: ${receipt.hash}`);

    try {
      await contract.withdrawRefunds();
      alert("Pending refunds withdrawn successfully");
    } catch (withdrawError) {
      const withdrawMessage = handleContractError(
        withdrawError,
        "refund withdrawal"
      );
      console.log(withdrawMessage);
      // Updated alert message to reference uranium purchase
      alert(`Uranium purchase succeeded, ${withdrawMessage}`);
    }
    return {
      txHash: receipt.hash,
      nonce: getNonceFromUid(user._uid),
    };
  } catch (error) {
    const errorMessage = handleContractError(error, "uranium purchase reveal");
    throw new Error(errorMessage);
  }
};

export default {
  commitPurchase,
  revealPurchase,
};
