"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/store";
import { useRouter } from "next/navigation";
import TransactionList from "./orders/TransactionList";
import ClientPrimaryButton from "./ClientPrimaryButton";
import EnergyTransactionsList from "./energy/EnergyTransactionsList";
import { dummyEnergyTransactions } from "@/models/dummyData";
export default function AdminPage() {
  const { user, status, isPaused } = useAuth();
  const router = useRouter();
  const [availableEnergy, setAvailableEnergy] = useState("N/A");
  const [balance, setBalance] = useState("N/A");
  const [energyTransactions, setEnergyTransactions] = useState([]);

  useEffect(() => {
    // Redirect if user is not Admin or unauthenticated
    if (!user || status !== "Admin") {
      router.push("/");
    }

    // Mock data fetching
    const fetchDummyData = async () => {
      try {
        // Mock available energy and balance
        setAvailableEnergy("10000"); // 10,000 kWh
        setBalance("10.5"); // 10.5 ETH
        
        // Mock transactions

        const mappedEnergyTransactions = dummyEnergyTransactions.map((et) => ({
          id: et.transactionId,
          energyAmount: et.energyAmountKwh,
          timestamp: et.timestamp,
          reqHash: et.reqHash,
          conHash: et.conHash,
          status: et.conHash ? "success" : "failed",
          error: et.conHash ? undefined : "Not authorized on contract",
        }));

        setEnergyTransactions(mappedEnergyTransactions);
      } catch (error) {
        console.error("Error setting mock data:", error);
        setAvailableEnergy("Error fetching energy");
        setBalance("Error fetching balance");

        setEnergyTransactions([
          { id: 0, error: "Failed to fetch energy transactions" },
        ]);
      }
    };

    fetchDummyData();
  }, [user, status, router]);

  return (
    <main className="max-w-5xl my-12 mx-auto px-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-primary-600 mb-8 text-center">
        Admin Dashboard
      </h1>
      <div className="w-full space-y-4">
        <div className="text-lg text-gray-800">
          <strong>Available Energy:</strong> {availableEnergy} kWh
        </div>
        <div className="text-lg text-gray-800">
          <strong>Balance:</strong> {balance} ETH
        </div>
        <ClientPrimaryButton />
        <TransactionList />
        <EnergyTransactionsList transactions={energyTransactions} />
      </div>
    </main>
  );
}
