"use client";
import React, { useEffect, useState } from "react";
import TransactionItem from "./TransactionItem";
import { UpIcon, DownIcon } from "@/utils/icons";

export default function TransactionList({ transactions }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [icon, setIcon] = useState(UpIcon);

  useEffect(() => {
    console.log(transactions);
  }, [transactions]);
  const toggleList = () => {
    setIcon(isExpanded ? DownIcon : UpIcon);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mt-6 p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>
        <div onClick={toggleList}>{icon}</div>
      </div>
      {isExpanded && transactions.length > 0 ? (
        <ul className="list-none p-0 max-h-96 overflow-auto">
          {transactions.map((tx, index) => (
            <TransactionItem key={index} transaction={tx} />
          ))}
        </ul>
      ) : isExpanded ? (
        <p className="text-gray-500 italic">No transactions found.</p>
      ) : null}
    </div>
  );
}
