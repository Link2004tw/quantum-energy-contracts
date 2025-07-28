"use client";
import React, { useEffect, useState } from "react";
import PrimaryButton from "../components/UI/PrimaryButton";
import Card from "../components/Layout/Card";
import {
  getCost,
  getAvailableEnergy,
  commitPurchase,
  checkIfAuthorized,
  revealPurchase,
  getNonceFromUid,
  getMockPrice
} from "../../utils/contract";
import { useAuth } from "../store";
import { useRouter } from "next/navigation";
import Modal from "../components/Layout/Model";
import CommittedOrders from "@/models/commitedOrders";
import { saveData } from "@/utils/databaseUtils";

export default function BuySolarPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [availableEnergy, setAvailableEnergy] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    const fetchAvailableEnergy = async () => {
      try {
        const energy = await getAvailableEnergy("hardhat");
        setAvailableEnergy(energy);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchAvailableEnergy();
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user]);

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

  const { parsedAmount, priceEth, commitTimestamp, commitTxHash } = pendingPurchase;
  setError(null);
  setModalOpen(false);

  try {
    // Check if commitment has expired (5 minutes = 300,000 ms)
    const currentTime = Date.now();
    const COMMIT_REVEAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (currentTime > commitTimestamp + COMMIT_REVEAL_WINDOW_MS) {
      throw new Error("Purchase commitment has expired (5-minute window exceeded)");
    }

    // Use nonce from getNonceFromUid
    const nonce = getNonceFromUid(user._uid);

    // Call revealPurchase
    const txHash = await revealPurchase("hardhat", parsedAmount, {
      _uid: user._uid,
      _ethereumAddress: user._ethereumAddress,
    });
    // console.log(txHash);
    user.energy += parsedAmount;
    const order = new CommittedOrders({
      energyRequested: parsedAmount,
      transactionHash: txHash,
      uid: user._uid,
      ethereumAddress: user._ethereumAddress,
      nonce: nonce,
      createdAt: new Date().toISOString(),
    });
    
    // Save to Firebase using saveData
    await saveData(order.toFirebase(), `committedOrders/${user._uid}/${txHash}`);
    await saveData(user.toJSON(),`users/${user._uid}`);
    // Show success modal
    setSuccessDetails({
      parsedAmount,
      priceEth,
      txHash,
    });
    setSuccessModalOpen(true);
    
    setAmount("");
    setPendingPurchase(null);

    // Update available energy
    try {
      const energy = await getAvailableEnergy("hardhat");
      setAvailableEnergy(energy);
    } catch (error) {
      console.error("Error fetching available energy:", error.message);
    }
  } catch (err) {
    console.error("Error revealing purchase:", err);
    setError(err.message);
    setSuccessModalOpen(true);
    setSuccessDetails({ error: err.message });
  }
};
  const commitPurchaseHandler = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Check authorization
      const isAuthorized = await checkIfAuthorized(user);
      console.log(isAuthorized);
      if (!isAuthorized) {
        alert("You are not Authorized please wait till the admin authorizes your wallet");
        return;
        //throw new Error("You are not authorized to make purchases. Please contact support.");
      }

      const parsedAmount = parseInt(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000) {
        throw new Error("Amount must be a number between 1 and 1000 kWh");
      }

      // Calculate price
      await getMockPrice();
      //const priceEth = BigInt(1000);
      const priceEth = await getCost(parsedAmount, "hardhat");

      // Commit purchase
      const commitTxHash = await commitPurchase("hardhat", parsedAmount, {
        _uid: user._uid,
        _ethereumAddress: user._ethereumAddress,
      });

      // Store commitment details with timestamp
      setPendingPurchase({
        parsedAmount,
        priceEth,
        commitTimestamp: Date.now(),
        commitTxHash,
      });
      setModalOpen(true);
    } catch (err) {
      console.error("Error preparing purchase:", err);
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
          {pendingPurchase?.priceEth} ETH? = {pendingPurchase?.parsedAmount * 0.12}$?
        </p>
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
                You have successfully purchased {successDetails?.parsedAmount}{" "}
                kWh for {successDetails?.priceEth} ETH = {successDetails?.parsedAmount * 0.12}$.
              </p>
            </div>
          )}
        </Modal>
    
    </main>
  );
}
