"use client";
import React, { useEffect, useState } from "react";
import PrimaryButton from "../components/UI/PrimaryButton";
import Card from "../components/Layout/Card";
import { commitPurchase, revealPurchase } from "../../utils/userContract";

// Import server actions
import {
    checkIfAuthorizedAction,
    convertEthToUsdAction,
    estimateCommitmentGas,
    estimateRevealGas,
    saveOrderToFirebase,
} from "@/app/actions/usersContractActions"; // Update this path

import { useAuth } from "../store";
import { useRouter } from "next/navigation";
import Modal from "../components/Layout/Model";
import CommittedOrders from "@/models/commitedOrders";
import { ethers } from "ethers";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import { truncateTransactionHash } from "@/utils/tools";
import CooldownTimer from "./Timer";

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
    const [loading, setLoading] = useState(false);
    const [csrfToken, setCsrfToken] = useState(null);
    const [commitCooldownTimestamp, setCommitCooldownTimestamp] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/login");
            }
            try {
                const idToken = await user.getIdToken();
                const response = await fetch("/api/generate-token", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`, // Pass the token if needed
                    },
                });
                const { token } = await response.json();
                setCsrfToken(token);
            } catch (error) {
                console.error("Error fetching CSRF token:", error);
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Added: Check if cooldown is active
    const isCooldownActive = () => {
        if (!commitCooldownTimestamp) return false;
        const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
        return Date.now() < commitCooldownTimestamp + COOLDOWN_PERIOD_MS;
    };

    const handleCancelPurchase = () => {
        setModalOpen(false);
        setPendingPurchase(null);
        setCommitCooldownTimestamp(null); // Added: Clear cooldown on cancel
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
        setLoading(true);

        try {
            // Check if commitment has expired (5 minutes = 300,000 ms)
            const currentTime = Date.now();
            const COMMIT_REVEAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
            if (currentTime > commitTimestamp + COMMIT_REVEAL_WINDOW_MS) {
                throw new Error("Purchase commitment has expired (5-minute window exceeded)");
            }

            // Use server action to estimate gas for reveal purchase
            const formData = new FormData();
            formData.append("amount", parsedAmount.toString());
            formData.append("userUid", user._uid);
            formData.append("userEthereumAddress", user._ethereumAddress);
            formData.append("csrfToken", csrfToken); // Added: Include CSRF token

            const gasEstimationResult = await estimateRevealGas(formData);

            if (!gasEstimationResult.success) {
                throw new Error(`Gas estimation failed: ${gasEstimationResult.error}`);
            }

            const { gasCostInEth, energyCostInEth, totalCostInEth } = gasEstimationResult.data;
            const { ethAmount, usdAmount } = await convertEthToUsdAction(gasCostInEth);

            const confirmation = window.confirm(
                `Energy Cost: ${energyCostInEth} ETH\n` +
                    `Estimated Gas Cost: ${gasCostInEth} ETH\n` +
                    `Total Estimated Cost: ${totalCostInEth} ETH\n` +
                    `Proceed with transaction? (As of ${new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" })})`,
            );

            if (!confirmation) {
                setLoading(false);
                return;
            }

            // Call revealPurchase (still using client-side for actual transaction)
            const { txHash, nonce } = await revealPurchase(parsedAmount, {
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
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch("/api/send-energy-data", {
                method: "POST",
                headers: {
                    authorization: `Bearer ${idToken}`,
                    applicationType: "application/json",
                },
            });
            const data = await res.json();
            //console.log("send energy data response: ", data);
            setAvailableEnergy(data.energy);
            setEthUsdPrice(data.ethPrice);
            await saveOrderToFirebase(order.toFirebase(), user.toJSON(), csrfToken);

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
        } catch (err) {
            console.error("Error revealing purchase:", err);
            setError(err.message);
            setSuccessModalOpen(true);
            setCommitingModalOpen(false);
            setSuccessDetails({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    const commitPurchaseHandler = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!window.ethereum) {
            alert("Metamask is not installed please install it ");
            setLoading(false);
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];
            if (address.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
                alert("Please use your registered wallet!");
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
            setLoading(false);
            return;
        }

        try {
            const isAuthorized = await checkIfAuthorizedAction(user.toJSON(), csrfToken);

            if (!isAuthorized) {
                alert("You are not Authorized please wait till the admin authorizes your wallet");
                setLoading(false);
                return;
            }

            const parsedAmount = parseInt(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000) {
                throw new Error("Amount must be a number between 1 and 1000 kWh");
            }

            // Use server action to estimate gas for commitment
            console.log("token", csrfToken);
            const formData = new FormData();
            formData.append("amount", parsedAmount.toString());
            formData.append("userUid", user._uid);
            formData.append("userEthereumAddress", user._ethereumAddress);
            formData.append("csrfToken", csrfToken); // Added: Include CSRF token
            const gasEstimationResult = await estimateCommitmentGas(formData);

            if (!gasEstimationResult.success) {
                throw new Error(`Gas estimation failed: ${gasEstimationResult.error}`);
            }

            const { gasCostInEth, energyCostInEth, totalCostInEth } = gasEstimationResult.data;
            console.log("Gas estimation result:", gasEstimationResult.data);

            const gasCostForCommitmentUsd = await convertEthToUsdAction(gasCostInEth);
            const usdCost = gasCostForCommitmentUsd.usdAmount;
            const ethCost = gasCostForCommitmentUsd.ethAmount;

            //1
            // Store commitment details with timestamp
            setPendingPurchase({
                parsedAmount,
                priceEth: energyCostInEth,
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
        } finally {
            setLoading(false);
        }
    };

    const confirmCommitHandler = async () => {
        setLoading(true);
        try {
            setModalOpen(false);
            const parsedAmount = parseInt(amount);
            console.log("Committing purchase with amount:", parsedAmount);
            console.log({
                _uid: user._uid,
                _ethereumAddress: user._ethereumAddress,
            });
            const hash = await commitPurchase(parsedAmount, {
                _uid: user._uid,
                _ethereumAddress: user._ethereumAddress,
            });
            setCommitCooldownTimestamp(Date.now());
            setCommitingHash(hash);
            setCommitingModalOpen(true);
        } catch (err) {
            console.error("Error preparing purchase:", err);
            setCommitingModalOpen(false);
            setError(err.message);
            setSuccessModalOpen(true);
            setSuccessDetails({ error: err.message });
        } finally {
            setLoading(false);
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
                            disabled={loading || isCooldownActive()}
                            className="block mt-2 my-4 px-2 py-1 text-center rounded-sm w-full disabled:opacity-50"
                        />
                    </label>
                    <div className="flex justify-center">
                        <PrimaryButton
                            title={loading ? "Processing..." : "Buy Solar Energy"}
                            type="submit"
                            onClick={commitPurchaseHandler}
                            disabled={loading}
                        />
                    </div>
                </form>
                <CooldownTimer commitTimestamp={commitCooldownTimestamp} />
            </Card>

            {/* Loading indicator */}
            {loading && (
                <div className="mt-4 text-center text-gray-600">
                    <p>Processing transaction... Please wait.</p>
                </div>
            )}

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
