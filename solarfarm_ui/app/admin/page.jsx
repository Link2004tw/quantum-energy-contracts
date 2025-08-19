import { getTransactions } from "@/utils/adminContact";
import { getAvailableEnergy, getEthBalance, getSolarFarm, isPaused } from "@/utils/contractUtils";
import TransactionList from "./orders/TransactionList";
import ClientPrimaryButton from "./ClientPrimaryButton";
import EnergyTransactionsList from "./energy/EnergyTransactionsList";
import { Transaction } from "@/models/transaction";
import { getData } from "@/utils/adminDatabaseUtils";
import EnergyTransaction from "@/models/energyTransaction";

export default async function AdminPage() {
    let availableEnergy = "N/A";
    let transactions = [];
    let balance = "N/A";
    let paused = false;
    let energyTransactions = [];

    try {
        availableEnergy = (await getAvailableEnergy()).toString(); // Convert BigNumber to string
        const address = await getSolarFarm();
        balance = await getEthBalance(address);
        //console.log(typeof(await getMockPrice()))
    } catch (error) {
        console.error("Error fetching available energy:", error);
        availableEnergy = "Error fetching energy";
    }
    try {
        const answer = await getData("/energyTransactions");
        Object.keys(answer).map((tx) => {
            energyTransactions.push(
                new EnergyTransaction({
                    energyAmountKwh: answer[tx].energyAmountKwh,
                    transactionId: tx,
                    timestamp: answer[tx].timestamp,
                    reqHash: answer[tx].requestHash,
                    conHash: answer[tx].confirmHash,
                }).toJSON(),
            );
        });
    } catch (error) {
        console.error("Error fetching solar farm address:", error);
        availableEnergy = "Error fetching solar farm address";
    }

    try {
        transactions = (await getTransactions()).map((transaction) => transaction.toJSON());
    } catch (error) {
        console.error("Error fetching transactions:", error);
        transactions = [new Transaction({ index: 0, error: "Failed to fetch transactions" })];
    }

    try {
        paused = await isPaused();
    } catch (error) {
        console.log("cannot get paused");
        console.log(error);
    }

    return (
        <>
            <div>Hello admin</div>
            <div>Available Energy: {availableEnergy} kWh</div>
            <div>Balance: {balance} eth</div>
            <ClientPrimaryButton paused={paused} />
            <TransactionList transactions={transactions} />
            <EnergyTransactionsList transactions={energyTransactions} />
        </>
    );
}
