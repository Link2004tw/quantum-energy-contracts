"use client";
import React, { useEffect, useState } from "react";
import EnergyTransactionItem from "./EnergyTransactionItem";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import { getData } from "@/utils/databaseUtils";
import EnergyTransaction from "@/models/energyTransaction";
import { UpIcon, DownIcon } from "@/utils/icons";

export default function EnergyTransactionsList() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [icon, setIcon] = useState(UpIcon);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async () => {
      const answer = await getData("/energyTransactions");
      const data = Object.keys(answer).map((tx) => {
        return new EnergyTransaction({
          energyAmountKwh: answer[tx].energyAmountKwh,
          transactionId: tx,
          timestamp: answer[tx].timestamp,
          reqHash: answer[tx].requestHash,
          conHash: answer[tx].confirmHash,
        });
      });
      setTransactions(data);
    });

    return () => unsubscribe();
  }, []);
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
      {isExpanded && transactions.length > 0 ? (
        <ul className="list-none p-0 max-h-96 overflow-y-auto">
          {transactions.map((tx, index) => (
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
