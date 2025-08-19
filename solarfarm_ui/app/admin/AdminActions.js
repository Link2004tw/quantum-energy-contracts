"use server";

import EnergyTransaction from "@/models/energyTransaction";
import { saveData } from "@/utils/adminDatabaseUtils";

export const saveEnergy = async (kwh, requestTxHash, confirmTxHash) => {
    if (!kwh || isNaN(kwh) || Number(kwh) <= 0 || Number(kwh) > 1000) {
        throw new Error("Please enter a valid kWh between 1 and 1000.");
    }

    try {
        const energyAmount = Number(kwh);

        const transaction = new EnergyTransaction({
            energyAmountKwh: energyAmount,
            reqHash: requestTxHash,
            conHash: confirmTxHash,
        });

        await saveData(transaction, `/energyTransactions/${transaction.transactionId}`);

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
