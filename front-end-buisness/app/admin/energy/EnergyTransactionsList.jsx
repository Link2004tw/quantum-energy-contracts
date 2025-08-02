"use client";
import React, { useState } from "react";
import EnergyTransactionItem from "./EnergyTransactionItem";
import { UpIcon, DownIcon } from "@/utils/icons";
import EnergyTransaction from "@/models/energyTransaction";
export default function EnergyTransactionsList({ transactions }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [icon, setIcon] = useState(UpIcon);

  // Map prop transactions to EnergyTransaction instances if needed
  const mappedTransactions = transactions.map((tx) => {
    if (tx instanceof EnergyTransaction) return tx;
    return new EnergyTransaction({
      energyAmountKwh: tx.energyAmount,
      transactionId: tx.id,
      timestamp: tx.timestamp,
      reqHash: tx.reqHash,
      conHash: tx.conHash,
    });
  });

  const toggleList = () => {
    setIcon(isExpanded ? DownIcon : UpIcon);
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="mt-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Energy Transactions
        </h2>
        <div onClick={toggleList}>{icon}</div>
      </div>
      {isExpanded && mappedTransactions.length > 0 ? (
        <ul className="list-none p-0 max-h-96 overflow-y-auto">
          {mappedTransactions.map((tx, index) => (
            <EnergyTransactionItem
              key={tx.transactionId || index}
              transaction={tx}
            />
          ))}
        </ul>
      ) : isExpanded ? (
        <p className="text-gray-500 italic">No energy transactions found.</p>
      ) : null}
    </div>
  );
}
