import CommittedOrders from "@/models/commitedOrders";
import React from "react";
import Card from "../components/Layout/Card";
import { truncateTransactionHash } from "@/utils/tools";

export default function OrderItem({ order }) {
  // Validate that order is an instance of CommittedOrders
  if (!(order instanceof CommittedOrders)) {
    console.error("OrderItem: Invalid order prop", order);
    return <div>Error: Invalid order data</div>;
  }
  
  //className="border rounded-lg p-4 mb-4 shadow-sm bg-white"
  return (
    <Card title={truncateTransactionHash(order.transactionHash)} maxWidth="max-w-160">
      <div className="grid grid-cols-1 gap-2 text-secondary-800">
        <p>
          <span className="font-medium">Energy Requested:</span>{" "}
          {order.energyRequested} kWh
        </p>
        <p>
          <span className="font-medium">Created At:</span>{" "}
          {order.createdAt.toLocaleString()}
        </p>
      </div>
    </Card>
  );
}
