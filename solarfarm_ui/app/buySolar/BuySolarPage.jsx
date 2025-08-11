// Prompt: Update BuySolarPage to receive ethPrice and availableEnergy as props
"use client";
import React, { useEffect, useState } from "react";
import PrimaryButton from "../components/UI/PrimaryButton";
import Card from "../components/Layout/Card";
import {
    convertEthToUsd,
    getCost,
    commitPurchase,
    revealPurchase,
    estimateGasForRevealPurchase,
    estimateGasForCommitPurchase,
} from "../../utils/userContract";
import { checkIfAuthorized, getAvailableEnergy, getNonceFromUid } from "@/utils/contractUtils";

import { useAuth } from "../store";
import { useRouter } from "next/navigation";
import Modal from "../components/Layout/Model";
import CommittedOrders from "@/models/commitedOrders";
import { saveData } from "@/utils/databaseUtils";
import { ethers } from "ethers";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import { truncateTransactionHash } from "@/utils/tools";

export default function BuySolarPage({ initialEthPrice, initialAvailableEnergy, initialError }) {
    const router = useRouter();
    const [amount, setAmount] = useState("");
    const [error, setError] = useState(initialError);
    const [availableEnergy, setAvailableEnergy] = useState(initialAvailableEnergy);
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingPurchase, setPendingPurchase] = useState(null);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successDetails, setSuccessDetails] = useState(null);
    const [ethUsdPrice, setEthUsdPrice] = useState(initialEthPrice);
    const [commitingModalOpen, setCommitingModalOpen] = useState(false);
    const [committingHash, setCommitingHash] = useState(null);

    const { user } = useAuth();
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [user]);

    const handleCancelPurchase = () => {
        setModalOpen(false);
        setPendingPurchase(null);
        setAmount("");
    };

    const handleCancelCommitPurchase = () => {
        setCommitingModalOpen(false);
        setPendingPurchase(null);
        setAmount("");
    };

    const handleCloseSuccessModal = () => {
        setSuccessModalOpen(false);
        setSuccessDetails(null);
    };

    const handleConfirmPurchase = async () => {
        if (!pendingPurchase) return;
        setCommitingModalOpen(false);
        const { parsedAmount, priceEth, commitTimestamp, commitGasCost } = pendingPurchase;
        setError(null);

        try {
            // Check if commitment has expired (5 minutes = 300,000 ms)
            const currentTime = Date.now();
            const COMMIT_REVEAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
            if (currentTime > commitTimestamp + COMMIT_REVEAL_WINDOW_MS) {
                throw new Error("Purchase commitment has expired (5-minute window exceeded)");
            }

            // Use nonce from getNonceFromUid
            const nonce = getNonceFromUid(user._uid);

            const gasCostForReveal = await estimateGasForRevealPurchase(parsedAmount, user);
            const { gasCostInEth, energyCostInEth, totalCostInEth } = gasCostForReveal;
            const { ethAmount, usdAmount } = await convertEthToUsd(gasCostInEth);

            const confirmation = window.confirm(
                `Energy Cost: ${energyCostInEth} ETH\n` +
                    `Estimated Gas Cost: ${gasCostInEth} ETH\n` +
                    `Total Estimated Cost: ${totalCostInEth} ETH\n` +
                    `Proceed with transaction? (As of ${new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" })})`,
            );

            if (!confirmation) return;

            // Call revealPurchase
            const txHash = await revealPurchase(parsedAmount, {
                _uid: user._uid,
                _ethereumAddress: user._ethereumAddress,
            });
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
            await saveData(user.toJSON(), `users/${user._uid}`);

            // Show success modal
            setSuccessDetails({
                parsedAmount,
                priceEth,
                txHash,
                costUsd: usdAmount,
                costEth: ethAmount,
            });
            setSuccessModalOpen(true);

            setAmount("");
            setPendingPurchase(null);

            // Update available energy (client-side fetch after purchase)
            try {
                const energy = await getAvailableEnergy();
                console.log("energy: ", energy);
                setAvailableEnergy(energy);
            } catch (error) {
                console.error("Error fetching available energy:", error.message);
            }
        } catch (err) {
            console.error("Error revealing purchase:", err);
            setError(err.message);
            setSuccessModalOpen(true);
            setCommitingModalOpen(false);
            setSuccessDetails({ error: err.message });
        }
    };

    const commitPurchaseHandler = async (e) => {
        e.preventDefault();
        setError(null);
        if (!window.ethereum) {
            alert("Metamask is not installed please install it ");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];
            if (address.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
                alert("Please use your registered wallet!");
                return;
            }
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
        }
        try {
            // Check authorization
            console.log("checking is authorized");
            const isAuthorized = await checkIfAuthorized(user);

            if (!isAuthorized) {
                alert("You are not Authorized please wait till the admin authorizes your wallet");
                return;
            }

            const parsedAmount = parseInt(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000) {
                throw new Error("Amount must be a number between 1 and 1000 kWh");
            }

            const priceEth = await getCost(parsedAmount);
            console.log(priceEth);
            const gasCostForCommitment = await estimateGasForCommitPurchase(parsedAmount, user);
            console.log(gasCostForCommitment);
            const { gasCostInEth, energyCostInEth, totalCostInEth } = gasCostForCommitment;
            console.log(gasCostInEth);
            const gasCostForCommitmentUsd = await convertEthToUsd(gasCostInEth);
            const usdCost = gasCostForCommitmentUsd.usdAmount;
            const ethCost = gasCostForCommitmentUsd.ethAmount;

            // Store commitment details with timestamp
            setPendingPurchase({
                parsedAmount,
                priceEth,
                commitTimestamp: Date.now(),
                commitGasCostUsd: usdCost,
                commitGasCostEth: ethCost,
            });
            setModalOpen(true);
        } catch (err) {
            console.error("Error preparing purchase:", err);
            setError(err.message);
            setSuccessModalOpen(true);
            setSuccessDetails({ error: err.message });
        }
    };

    const confirmCommitHandler = async () => {
        try {
            setModalOpen(false);
            const parsedAmount = parseInt(amount);
            const hash = await commitPurchase(parsedAmount, {
                _uid: user._uid,
                _ethereumAddress: user._ethereumAddress,
            });
            setCommitingHash(hash);
            setCommitingModalOpen(true);
        } catch (err) {
            console.error("Error preparing purchase:", err);
            setCommitingModalOpen(false);
            setError(err.message);
            setSuccessModalOpen(true);
            setSuccessDetails({ error: err.message });
        }
    };

    return (
        <main className="max-w-5xl my-12 mx-auto px-8 flex flex-col items-center">
            <h1 className="text-4xl font-bold text-primary-600 mb-8 text-center">Buy Solar Energy</h1>
            <Card title="Purchase Solar Energy">
                <form className="py-4 px-7 bg-primary/5 rounded-md block min-w-fit w-full">
                    <label className="block label-text mb-4 text-primary text-center">
                        Amount (kWh) {availableEnergy !== null ? `(${availableEnergy} kWh available)` : ""}
                        <br />
                        {ethUsdPrice ? `${ethUsdPrice.toFixed(2)} USD/ETH` : "Loading ETH price..."}
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
                        <PrimaryButton title="Buy Solar Energy" type="submit" onClick={commitPurchaseHandler} />
                    </div>
                </form>
            </Card>
            <Modal
                isOpen={modalOpen}
                onClose={handleCancelPurchase}
                onConfirm={confirmCommitHandler}
                isCancel={true}
                isConfirm={true}
            >
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Purchase</h2>
                <p className="text-gray-600">
                    Purchase {pendingPurchase?.parsedAmount} kWh for {Number(pendingPurchase?.priceEth)} +
                    {Number(pendingPurchase?.commitGasCostEth)} ETH? = {pendingPurchase?.parsedAmount * 0.12}$ +{" "}
                    {pendingPurchase?.commitGasCostUsd}$ gas cost ={" "}
                    {pendingPurchase?.parsedAmount * 0.12 + Number(pendingPurchase?.commitGasCostUsd)}
                </p>
                <br />
                <p>Revealing fees may apply</p>
            </Modal>
            <Modal
                isOpen={commitingModalOpen}
                isCancel={true}
                isConfirm={true}
                onClose={handleCancelCommitPurchase}
                onConfirm={handleConfirmPurchase}
            >
                <h2>Order Commitment Confirmation</h2>
                <p>Transaction Hash: {committingHash ? truncateTransactionHash(committingHash) : null}</p>
                <p>Please press the Confirm button to finalize your order.</p>
                <p>The commitment will expire in 5 minutes.</p>
            </Modal>
            <Modal
                isOpen={successModalOpen}
                onClose={handleCloseSuccessModal}
                onConfirm={handleCloseSuccessModal}
                isCancel={false}
                isConfirm={true}
            >
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    {successDetails?.error ? "Transaction Failed" : "Transaction Successful"}
                </h2>
                {successDetails?.error ? (
                    <p className="text-red-600">Error: {successDetails.error}</p>
                ) : (
                    <div className="text-gray-600">
                        <p>
                            You have successfully purchased {successDetails?.parsedAmount} kWh for{" "}
                            {successDetails?.priceEth} + {successDetails?.costEth} ={" "}
                            {Number(successDetails?.priceEth) + Number(successDetails?.costEth)} ETH ={" "}
                            {successDetails?.parsedAmount * 0.12}$ (energy cost) + {successDetails?.costUsd} ={" "}
                            {Number(successDetails?.parsedAmount * 0.12) + Number(successDetails?.costUsd)}$
                        </p>
                    </div>
                )}
            </Modal>
        </main>
    );
}
