"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PrimaryButton from "../components/UI/PrimaryButton";
import Card from "../components/Layout/Card";
import { useAuth } from "../store";
import Modal from "../components/Layout/Model";
import Transaction from "@/models/transaction";
import { dummyTransactions } from "@/models/dummyData";

export default function BuySolarPage() {
  const router = useRouter();
  const {
    user,
    status,
    isPaused,
    userRole,
    availableEnergy,
    setAvailableEnergy,
    ethUsdPrice,
  } = useAuth();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  useEffect(() => {
    // Redirect to /maintenance if system is paused
    if (isPaused) {
      router.push("/maintenance");
      return;
    }

    // Log user and status for debugging
    console.log(
      "Current user:",
      user
        ? {
            uid: user.uid,
            ethereumAddress: user.ethereumAddress,
            status,
            role: userRole,
            availableEnergy,
            ethUsdPrice,
          }
        : "No user"
    );

    // Redirect if user is null or unauthenticated
    if (!user || status === "Unauthenticated") {
      router.push("/unauthorized");
      return;
    }
  }, [user, status, isPaused, userRole, availableEnergy, ethUsdPrice, router]);

  const handleCancelPurchase = () => {
    setModalOpen(false);
    setPendingPurchase(null);
    setAmount("");
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false);
    setSuccessDetails(null);
  };

  const handleConfirmPurchase = async () => {
    if (!pendingPurchase) return;

    const { parsedAmount, priceEth, commitTimestamp, commitTxHash } =
      pendingPurchase;
    setError(null);
    setModalOpen(false);

    try {
      // Simulate commitment expiration check
      const currentTime = Date.now();
      const COMMIT_REVEAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
      if (currentTime > commitTimestamp + COMMIT_REVEAL_WINDOW_MS) {
        throw new Error(
          "Purchase commitment has expired (5-minute window exceeded)"
        );
      }

      // Simulate gas and cost calculations
      const gasCostInEth = 0.001; // Mock gas cost
      const energyCostInEth = priceEth;
      const totalCostInEth = Number(energyCostInEth) + Number(gasCostInEth);
      const usdAmount = (totalCostInEth * ethUsdPrice) / 1e8; // Use ethUsdPrice from context

      const confirmation = window.confirm(
        `Energy Cost: ${energyCostInEth} ETH\n` +
          `Estimated Gas Cost: ${gasCostInEth} ETH\n` +
          `Total Estimated Cost: ${totalCostInEth} ETH\n` +
          `Proceed with transaction? (As of 06:11 AM EEST, August 02, 2025)`
      );

      if (!confirmation) return;

      // Simulate revealPurchase
      const txHash = `0x${Math.random().toString(16).slice(2, 66)}`; // Mock transaction hash
      const nonce = Math.floor(Math.random() * 1000000); // Mock nonce

      // Create new Transaction instance
      const newTransaction = new Transaction({
        index: Math.max(...dummyTransactions.map((tx) => tx.index)) + 1,
        buyer: user.ethereumAddress,
        kWh: parsedAmount.toString(),
        pricePerKWhUSD: "1200", // 12 cents/kWh
        ethPriceUSD: ethUsdPrice.toString(), // Use ethUsdPrice from context
        timestamp: Math.floor(Date.now() / 1000),
        error: null,
      });

      console.log("New transaction:", newTransaction.toJSON());
      dummyTransactions.push(newTransaction); // Persist transaction

      // Show success modal
      setSuccessDetails({
        parsedAmount,
        priceEth,
        txHash,
        costUsd: usdAmount / 1e10,
        costEth: totalCostInEth,
      });
      console.log({
        parsedAmount,
        priceEth,
        txHash,
        costUsd: usdAmount / 1e10,
        costEth: totalCostInEth,
      });
      setSuccessModalOpen(true);

      // Update available energy
      setAvailableEnergy((prev) => prev - parsedAmount);
    } catch (err) {
      console.error("Error simulating purchase:", err);
      setError(err.message);
      setSuccessModalOpen(true);
      setSuccessDetails({ error: err.message });
    }
  };

  const commitPurchaseHandler = async (e) => {
    e.preventDefault();
    setError(null);

    // Simulate MetaMask availability check
    if (!window.ethereum) {
      alert("MetaMask is not installed, please install it.");
      return;
    }

    try {
      // Simulate MetaMask account retrieval
      console.log("Checking user.ethereumAddress:", user.ethereumAddress);
      if (!user.ethereumAddress) {
        console.log("User object:", user);
        throw new Error("User Ethereum address is not available.");
      }

      // Simulate MetaMask address check
      const mockAddress = user.ethereumAddress;
      if (mockAddress.toLowerCase() !== user.ethereumAddress.toLowerCase()) {
        alert("Please use your registered wallet!");
        return;
      }
    } catch (error) {
      console.error("Error simulating MetaMask connection:", error);
      alert(
        error.message || "Failed to connect to MetaMask. Please try again."
      );
      return;
    }

    try {
      // Check user status from context
      if (status === "Authenticated Wallet Not Authenticated") {
        alert(
          "Your wallet is not authorized. Please wait until the admin authorizes your wallet."
        );
        return;
      }

      // Check role-based authorization
      const isAuthorized = userRole === "admin" || userRole === "user";
      if (!isAuthorized) {
        alert(
          "You are not authorized to make purchases. Please contact support."
        );
        return;
      }

      const parsedAmount = parseInt(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000) {
        throw new Error("Amount must be a number between 1 and 1000 kWh");
      }

      if (parsedAmount > availableEnergy) {
        throw new Error("Requested amount exceeds available energy");
      }

      // Simulate cost calculation
      const priceEth = (parsedAmount * 0.0001).toFixed(6); // Mock price: 0.0001 ETH/kWh
      const gasCostInEth = 0.0005; // Mock gas cost
      const totalCostInEth = parseFloat(priceEth) + gasCostInEth;
      const usdCost = (totalCostInEth * ethUsdPrice) / 1e8; // Use ethUsdPrice from context

      // Simulate commitPurchase
      const hash = `0x${Math.random().toString(16).slice(2, 66)}`; // Mock transaction hash

      // Store commitment details with timestamp
      setPendingPurchase({
        parsedAmount,
        priceEth,
        commitTimestamp: Date.now(),
        commitTxHash: hash,
        commitGasCostUsd: usdCost / 1e10,
        commitGasCostEth: gasCostInEth,
      });
      setModalOpen(true);
    } catch (err) {
      console.error("Error preparing simulated purchase:", err);
      setError(err.message);
      setSuccessModalOpen(true);
      setSuccessDetails({ error: err.message });
    }
  };

  return (
    <main className="max-w-5xl my-12 mx-auto px-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-primary-600 mb-8 text-center">
        Buy Solar Energy
      </h1>
      <Card title="Purchase Solar Energy">
        <form className="py-4 px-7 bg-primary/5 rounded-md block min-w-fit w-full">
          <label className="block label-text mb-4 text-primary text-center">
            Amount (kWh){" "}
            {availableEnergy !== null
              ? `(${availableEnergy} kWh available)`
              : ""}
            <br />
            {ethUsdPrice ? `${ethUsdPrice / 1e18} USD/ETH` : "Loading price..."}
            <input
              type="number"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
              max="1000"
              step="1"
              className="block mt-2 my-4 px-2 py-1 text-center rounded-sm w-full"
            />
          </label>
          <div className="flex justify-center">
            <PrimaryButton
              title="Buy Solar Energy"
              type="submit"
              onClick={commitPurchaseHandler}
            />
          </div>
        </form>
      </Card>
      <Modal
        isOpen={modalOpen}
        onClose={handleCancelPurchase}
        onConfirm={handleConfirmPurchase}
        isCancel={true}
        isConfirm={true}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Confirm Purchase
        </h2>
        <p className="text-gray-600">
          Purchase {pendingPurchase?.parsedAmount} kWh for{" "}
          {Number(pendingPurchase?.priceEth) +
            Number(pendingPurchase?.commitGasCostEth)}{" "}
          ETH = {pendingPurchase?.parsedAmount * 0.12}$ +{" "}
          {pendingPurchase?.commitGasCostUsd}$ gas cost ={" "}
          {pendingPurchase?.parsedAmount * 0.12 +
            pendingPurchase?.commitGasCostUsd}
          $
        </p>
        <br />
        <p>Revealing fees may apply</p>
      </Modal>
      <Modal
        isOpen={successModalOpen}
        onClose={handleCloseSuccessModal}
        onConfirm={handleCloseSuccessModal}
        isCancel={false}
        isConfirm={true}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {successDetails?.error
            ? "Transaction Failed"
            : "Transaction Successful"}
        </h2>
        {successDetails?.error ? (
          <p className="text-red-600">Error: {successDetails.error}</p>
        ) : (
          <div className="text-gray-600">
            <p>
              You have successfully purchased {successDetails?.parsedAmount} kWh
              for {successDetails?.priceEth} + {successDetails?.costEth} ={" "}
              {Number(successDetails?.priceEth) +
                Number(successDetails?.costEth)}{" "}
              ETH = {successDetails?.parsedAmount * 0.12}$ (energy cost) +{" "}
              {successDetails?.costUsd} ={" "}
              {Number(successDetails?.parsedAmount * 0.12) +
                Number(successDetails?.costUsd)}
              $
            </p>
          </div>
        )}
      </Modal>
    </main>
  );
}
