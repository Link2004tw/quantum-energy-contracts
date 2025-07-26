"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/store";
import PrimaryButton from "@/app/components/UI/PrimaryButton"; //from '@/components/UI/PrimaryButton';
import { addEnergy } from "@/utils/contract";
import Card from "@/app/components/Layout/Card";
import ProgressBar from "./ProgressBar";

export default function AddEnergyPage() {
  const { user, isLoggedIn } = useAuth();
  const [kwh, setKwh] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kwh || isNaN(kwh) || Number(kwh) <= 0 || Number(kwh) > 1000) {
      alert("Please enter a valid kWh between 1 and 1000.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { requestTxHash, confirmTxHash } = await addEnergy(Number(kwh));
      setKwh("");
    } catch (error) {
      console.error("Error adding energy:", error);
      // Error alert is handled in addEnergy
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn || !user) {
    return null; // Render nothing while redirecting
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card title="add energy">
        <form onSubmit={handleSubmit}>
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
