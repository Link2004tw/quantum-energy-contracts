import React from 'react';
import TransactionItem from './TransactionItem';

export default function TransactionList({ transactions }) {
  return (
    <div className="mt-6 p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Transactions</h2>
      {transactions.length > 0 ? (
        <ul className="list-none p-0">
          {transactions.map((tx, index) => (
            <TransactionItem key={index} transaction={tx} />
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">No transactions found.</p>
      )}
    </div>
  );
}