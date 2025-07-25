"use client";

import { useState} from "react";
import { useAuth } from "@/app/store";
import PrimaryButton from "@/app/components/UI/PrimaryButton"; //'@/components/UI/PrimaryButton';
import { updateAnswer } from "@/utils/contract";
import Card from "@/app/components/Layout/Card";

export default function UpdatePricePage() {
  const { user, isLoggedIn } = useAuth();
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!price || isNaN(price) || Number(price) <= 0) {
      alert("Please enter a valid positive price.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAnswer(Number(price) * 10 ** 8);
      alert("Price updated successfully!");
      setPrice("");
    } catch (error) {
      console.error("Error updating price:", error);
      alert("Failed to update price. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn || !user) {
    return null; // Render nothing while redirecting
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card title="Update Price">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="price"
                className="block text-gray-700 font-medium mb-1"
              >
                New Price
              </label>
              <input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full placeholder-yellow-400 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Enter price (e.g., 100)"
                min="0"
                step="any"
                disabled={isSubmitting}
              />
            </div>
            <PrimaryButton
              title={isSubmitting ? "Updating..." : "Update Price"}
              type="submit"
              disabled={isSubmitting}
            />
          </form>
        </Card>
      </div>
    </>
  );
}
