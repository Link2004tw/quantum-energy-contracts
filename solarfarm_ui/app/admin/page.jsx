//import  from 'react';
import { getAvailableEnergy, getTransactions, getEthBalance, getSolarFarm } from '@/utils/contract';
import TransactionList from './TransactionList';

export default async function AdminPage() {
  let availableEnergy = 'N/A';
  let transactions = [];
  let balance = 'N/A';

  try {
    availableEnergy = (await getAvailableEnergy()).toString(); // Convert BigNumber to string
    const address = await getSolarFarm();
    balance = (await getEthBalance(address));
    //console.log(typeof(await getMockPrice()))
  } catch (error) {
    console.error('Error fetching available energy:', error);
    availableEnergy = 'Error fetching energy';
  }

  try {
    transactions = await getTransactions();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    transactions = [new Transaction({ index: 0, error: 'Failed to fetch transactions' })];
  }

  return (
    <>
      <div>Hello admin</div>
      <div>Available Energy: {availableEnergy} kWh</div>
      <div>Balance: {balance} eth</div>
      <TransactionList transactions={transactions} />
    </>
  );
}