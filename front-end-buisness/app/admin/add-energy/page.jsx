"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/store";
import PrimaryButton from "@/app/components/UI/PrimaryButton";
import Card from "@/app/components/Layout/Card";
import ProgressBar from "./ProgressBar";
import EnergyTransaction from "@/models/energyTransaction";
import { dummyEnergyTransactions } from "@/models/dummyData";

export default function AddEnergyPage() {
  const {
    user,
    isLoggedIn,
    isPaused,
    userRole,
    availableEnergy,
    setAvailableEnergy,
  } = useAuth();
  const router = useRouter();
  const [kwh, setKwh] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Redirect to /admin/maintenance if system is paused
    if (isPaused) {
      console.log("Redirecting to /admin/maintenance: system is paused");
      router.push("/admin/maintenance");
      return;
    }

    // Redirect to /unauthorized if not logged in or not admin
    if (!isLoggedIn || !user || userRole !== "admin") {
      console.log(
        `Redirecting to /unauthorized: isLoggedIn=${isLoggedIn}, userRole=${userRole}`
      );
      router.push("/unauthorized");
      return;
    }

    // Log user for debugging
    console.log("Current user:", {
      uid: user.uid,
      ethereumAddress: user.ethereumAddress,
      role: userRole,
      availableEnergy,
    });
  }, [isLoggedIn, user, isPaused, userRole, availableEnergy, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kwh || isNaN(kwh) || Number(kwh) <= 0 || Number(kwh) > 1000) {
      alert("Please enter a valid kWh between 1 and 1000.");
      return;
    }

    setIsSubmitting(true);
    try {
      const energyAmount = Number(kwh);

      // Simulate addEnergy
      const requestTxHash = `0x${Math.random().toString(16).slice(2, 66)}`; // Mock request hash
      const confirmTxHash = `0x${Math.random().toString(16).slice(2, 66)}`; // Mock confirm hash

      // Create new EnergyTransaction
      const transaction = new EnergyTransaction({
        transactionId: `tx_${Math.random().toString(36).slice(2, 9)}`,
        energyAmountKwh: energyAmount,
        reqHash: requestTxHash,
        conHash: confirmTxHash,
        timestamp: Math.floor(Date.now() / 1000),
      });

      // Append to dummyEnergyTransactions
      dummyEnergyTransactions.push(transaction);
      console.log("New energy transaction:", transaction.toJSON());

      // Update available energy in the system
      setAvailableEnergy((prev) => prev + energyAmount);

      setKwh("");
      alert("Energy transaction saved successfully!");
    } catch (error) {
      console.error("Error adding energy:", error);
      alert("Failed to add energy transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render nothing while redirecting
  if (!isLoggedIn || !user || userRole !== "admin" || isPaused) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card title="Add Energy">
        <form onSubmit={handleSubmit}>
          <p className="text-primary-700">
            Available Energy: {availableEnergy} kWh
          </p>
          <input
            type="number"
            id="kwh"
            value={kwh}
            onChange={(e) => setKwh(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Enter kWh (1-1000)"
            min="1"
            max="1000"
            step="1"
            disabled={isSubmitting}
          />
          <ProgressBar value={10} />
          {isSubmitting && (
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full animate-spin bg-[conic-gradient(#2563eb_0deg_90deg,transparent_90deg_360deg)] border-4 border-transparent relative">
                <div className="absolute inset-0 rounded-full bg-blue-200 border-2 border-blue-200"></div>
              </div>
            </div>
          )}
          <PrimaryButton
            title={isSubmitting ? "Adding..." : "Add Energy"}
            type="submit"
            disabled={isSubmitting}
          />
        </form>
      </Card>
    </div>
  );
}
