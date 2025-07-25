import React from 'react';

export default function TransactionItem({ transaction }) {
  // Handle error case
  if (transaction.hasError()) {
    return <li className="text-red-600 italic">{transaction.error}</li>;
  }

  return (
    <li className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
      <strong className="text-lg font-semibold">Transaction #{transaction.index}</strong>
      <ul className="list-none pl-4 mt-2 space-y-1">
        <li>Buyer: {transaction.getFormattedBuyer()}</li>
        <li>Seller: {transaction.getFormattedSeller()}</li>
        <li>Amount: {transaction.getFormattedKWh()}</li>
        <li>Price per kWh: {transaction.getFormattedPricePerKWh()}</li>
        <li>ETH Price: {transaction.getFormattedEthPrice()}</li>
        <li>Timestamp: {transaction.getFormattedTimestamp()}</li>
      </ul>
    </li>
  );
}