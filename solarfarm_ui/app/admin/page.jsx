import { getAvailableEnergy, getTransactions, getEthBalance, getSolarFarm, isPaused } from "@/utils/adminContact";
import TransactionList from "./orders/TransactionList";
import ClientPrimaryButton from "./ClientPrimaryButton";
import EnergyTransactionsList from "./energy/EnergyTransactionsList";
import { Transaction } from "@/models/transaction";

export default async function AdminPage() {
    let availableEnergy = "N/A";
    let transactions = [];
    let balance = "N/A";
    let paused = false;

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
            <EnergyTransactionsList />
        </>
    );
}
