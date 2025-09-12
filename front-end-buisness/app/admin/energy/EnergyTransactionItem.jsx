export default function EnergyTransactionItem({ transaction }) {
  return (
    <li className="border border-gray-300 rounded-md p-4 mb-2 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Transaction ID: {transaction.transactionId}
          </p>
          <p className="text-sm text-gray-600">
            Energy: {transaction.energyAmountKwh} kWh
          </p>
          <p className="text-sm text-gray-600">
            Date: {new Date(transaction.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </li>
  );
}
