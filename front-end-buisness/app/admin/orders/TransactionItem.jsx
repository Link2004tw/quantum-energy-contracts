import Transaction from "@/models/transaction";
import React from "react";

export default function TransactionItem({ transaction }) {
  //console.log(transaction);
  const t = new Transaction({
    index: transaction.index,
    buyer: transaction.buyer,
    kWh: transaction.kWh,
    ethPriceUSD: transaction.ethPriceUSD,
    pricePerKWhUSD: transaction.pricePerKWhUSD,
    timestamp: transaction.timestamp,
    error: transaction.error,
  });

  return (
    <li className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
      <strong className="text-lg font-semibold">Transaction #{t.index}</strong>
      <ul className="list-none pl-4 mt-2 space-y-1">
        <li>Buyer: {t.getFormattedBuyer()}</li>
        <li>Amount: {t.getFormattedKWh()}</li>
        <li>Price per kWh: {t.getFormattedPricePerKWh()}</li>
        <li>ETH Price: {transaction.getFormattedEthPrice()}</li>
        <li>Timestamp: {t.getFormattedTimestamp()}</li>
      </ul>
    </li>
  );
}
