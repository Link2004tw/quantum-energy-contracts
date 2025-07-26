"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../store";
import { getData } from "@/utils/databaseUtils";
import CommittedOrders from "@/models/commitedOrders";
import OrderItem from "./OrderItem";

export default function OrdersList() {
  const user = useAuth().user;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!user || !user._uid) {
      setError("User not authenticated or UID mismatch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getData(`committedOrders/${user._uid}`);
      
      if (data) {
        // Convert Firebase data to CommittedOrders instances
        const ordersArray = Object.entries(data).map(([orderId, orderData]) =>
          new CommittedOrders({
            energyRequested: orderData.energyRequested,
            transactionHash: orderData.transactionHash,
            uid: orderData.uid,
            ethereumAddress: orderData.ethereumAddress,
            nonce: orderData.nonce,
            createdAt: orderData.createdAt,
          })
        );
        setOrders(ordersArray);
        //console.log("Fetched orders:", ordersArray);
      } else {
        //console.log("No orders found for user:", user._uid);
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err.message);
      setError(`Failed to fetch orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Orders for User: {user._uid}</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        <ul className="space-y-4 justify-self-center flex-col">
          {orders.map((order) => (
            <OrderItem key={order.transactionHash} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}