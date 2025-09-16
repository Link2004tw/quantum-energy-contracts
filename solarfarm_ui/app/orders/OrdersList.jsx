"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../store";
import CommittedOrders from "@/models/commitedOrders";
import OrderItem from "./OrderItem";
import { auth } from "@/config/firebase";

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
            const response = await fetch(`/api/get-orders?uid=${user._uid}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, // Assuming user.token contains the auth token
                },
            });
            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch orders");
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to fetch orders");
            }
            const ordersArray = data.orders.map((order) => new CommittedOrders({ ...order }));
            setOrders(ordersArray);
        } catch (err) {
            console.error("Error fetching orders:", err.message);
            setError(`Failed to fetch orders: ${err.message}`);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

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
