"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../store";
import OrderItem from "./OrderItem";
import { useRouter } from "next/navigation";
import { dummyOrders } from "@/models/dummyData";

export default function OrdersList() {
  const user = useAuth().user;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  //const router = useRouter();

  useEffect(() => {
    if (!user || !user._uid) {
      setError("User not authenticated or UID mismatch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setOrders(dummyOrders.filter((o) => o.uid === user.uid));
      // const data = await getData(`committedOrders/${user._uid}`);
    } catch (err) {
      console.error("Error fetching orders:", err.message);
      setError(`Failed to fetch orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!user) {
    //router.push("/login");
    return;
  }
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
