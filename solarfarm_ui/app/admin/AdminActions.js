"use server";

import EnergyTransaction from "@/models/UraniumTransaction";
import { saveData } from "@/utils/adminDatabaseUtils";
import { getUraniumPricePerLb } from "@/utils/contractUtils";
import { serverTimestamp } from "@firebase/database";

export const saveEnergy = async (kwh, requestTxHash, confirmTxHash) => {
  if (!kwh || isNaN(kwh) || Number(kwh) <= 0 || Number(kwh) > 1000) {
    throw new Error("Please enter a valid kWh between 1 and 1000.");
  }

  try {
    const energyAmount = Number(kwh);
    const uraniumPrice = await getUraniumPricePerLb();
    console.log("Uranium Price per lb:", uraniumPrice);

    const transaction = new EnergyTransaction({
      uraniumAmountLbs: energyAmount,
      reqHash: requestTxHash,
      conHash: confirmTxHash,
      timestamp: serverTimestamp(),
    });

    await saveData(
      transaction,
      `/energyTransactions/${transaction.transactionId}`
    );

    return { success: true, message: "Energy transaction saved successfully!" };
  } catch (error) {
    console.error("Error adding energy:", error);
    throw new Error("Failed to add energy transaction.");
  }
};

export const saveRequest = async (authRequest) => {
  try {
    await saveData(authRequest, `requests/${request.userId}`);
    return { success: true, message: "Request saved successfully!" };
  } catch (error) {
    console.error("Error saving request:", error);
    throw new Error("Failed to save request.");
  }
};
