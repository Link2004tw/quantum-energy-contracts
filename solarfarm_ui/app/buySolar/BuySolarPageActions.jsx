"use client";
// "use client" directive for client-side rendering
import React, { useEffect, useState } from "react";
import PrimaryButton from "../components/UI/PrimaryButton";
import Card from "../components/Layout/Card";
import { commitPurchase, revealPurchase } from "../../utils/userContract";
import { convertUraniumUnits } from "@/utils/tools"; // Updated import path
import {
  checkIfAuthorizedAction,
  convertEthToUsdAction,
  estimateCommitmentGas,
  estimateRevealGas,
  saveOrderToFirebase,
} from "@/app/actions/usersContractActions";
import { useAuth } from "../store";
import { useRouter } from "next/navigation";
import Modal from "../components/Layout/Model";
import CommittedOrders from "@/models/commitedOrders";
import { ethers } from "ethers";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import { truncateTransactionHash } from "@/utils/tools";
import CooldownTimer from "./Timer";

// Prompt: Fix number handling in modals and ensure secret/nonce are correctly managed
export default function BuyUraniumPage({
  initialEthPrice,
  initialAvailableUraniumLbs,
  initialError,
  initialUraniumPrice,
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [unitMode, setUnitMode] = useState("lbs");
  const [error, setError] = useState(initialError);
  const [availableUraniumLbs, setAvailableUraniumLbs] = useState(
    initialAvailableUraniumLbs
  );
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

  const convertUnit = (amount, unitMode) => {
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Amount must be a valid number greater than zero");
      }

      if (!["kg", "lbs"].includes(unitMode)) {
        throw new Error("Invalid unit mode: must be 'kg' or 'lbs'");
      }

      const convertedAmount = convertUraniumUnits(
        parsedAmount,
        unitMode,
        "lbs"
      );
      if (!convertedAmount || isNaN(parseFloat(convertedAmount))) {
        throw new Error("Unit conversion failed: invalid result");
      }

      // Round to nearest integer for smart contract compatibility
      return Math.round(parseFloat(convertedAmount));
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

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
            Authorization: `Bearer ${idToken}`,
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

  const isCooldownActive = () => {
    if (!commitCooldownTimestamp) return false;
    const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
    return Date.now() < commitCooldownTimestamp + COOLDOWN_PERIOD_MS;
  };

  const handleCancelPurchase = () => {
    setModalOpen(false);
    setPendingPurchase(null);
    setCommitCooldownTimestamp(null);
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
    const {
      parsedAmount,
      priceEth,
      commitTimestamp,
      inputAmount,
      inputUnit,
      nonce,
      secret,
    } = pendingPurchase;

    setError(null);
    setLoading(true);
    console.log("secret:", secret);
    try {
      const currentTime = Date.now();
      const COMMIT_REVEAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
      if (currentTime > commitTimestamp + COMMIT_REVEAL_WINDOW_MS) {
        throw new Error(
          "Purchase commitment has expired (5-minute window exceeded)"
        );
      }

      const formData = new FormData();
      formData.append("amount", parsedAmount.toString());
      formData.append("userUid", user._uid);
      formData.append("userEthereumAddress", user._ethereumAddress);
      formData.append("csrfToken", csrfToken);
      formData.append("secret", secret);

      const gasEstimationResult = await estimateRevealGas(formData);

      if (!gasEstimationResult.success) {
        throw new Error(`Gas estimation failed: ${gasEstimationResult.error}`);
      }

      const { gasCostInEth, energyCostInEth, totalCostInEth } =
        gasEstimationResult.data;
      const { ethAmount, usdAmount } = await convertEthToUsdAction(
        gasCostInEth
      );

      const confirmation = window.confirm(
        `Uranium Cost: ${energyCostInEth} ETH\n` +
          `Estimated Gas Cost: ${gasCostInEth} ETH\n` +
          `Total Estimated Cost: ${totalCostInEth} ETH\n` +
          `Proceed with transaction? (As of ${new Date().toLocaleString(
            "en-US",
            { timeZone: "Europe/Bucharest" }
          )})`
      );

      if (!confirmation) {
        setLoading(false);
        return;
      }
      console.log(secret);
      const { txHash } = await revealPurchase(parsedAmount, user, secret);

      const order = new CommittedOrders({
        uraniumAmountLbs: parsedAmount,
        transactionHash: txHash,
        uid: user._uid,
        ethereumAddress: user._ethereumAddress,
        nonce,
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
      console.log("Uranium and ETH data:", data);
      console.log(data.energy);
      setAvailableUraniumLbs(convertUraniumUnits(data.energy, "lbs", unitMode));
      setEthUsdPrice(data.ethPrice);

      await saveOrderToFirebase(
        order.toFirebase(),
        user.toJSON(),
        csrfToken,
        user._uid
      );

      setSuccessDetails({
        parsedAmount,
        inputAmount,
        inputUnit,
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
      const isAuthorized = await checkIfAuthorizedAction(
        user.toJSON(),
        csrfToken
      );

      if (!isAuthorized) {
        alert("You are not authorized. Please wait for admin authorization.");
        setLoading(false);
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000) {
        throw new Error(
          `Amount must be a number between 1 and 1000 ${unitMode}`
        );
      }

      const amountInLbs = convertUnit(parsedAmount, unitMode);

      const formData = new FormData();
      formData.append("amount", amountInLbs.toString());
      formData.append("userUid", user._uid);
      formData.append("userEthereumAddress", user._ethereumAddress);
      formData.append("csrfToken", csrfToken);

      const gasEstimationResult = await estimateCommitmentGas(formData);

      if (!gasEstimationResult.success) {
        throw new Error(`Gas estimation failed: ${gasEstimationResult.error}`);
      }

      const { gasCostInEth, energyCostInEth, totalCostInEth, secret } =
        gasEstimationResult.data;
      console.log("Gas estimation result:", gasEstimationResult.data);

      const gasCostForCommitmentUsd = await convertEthToUsdAction(gasCostInEth);
      const usdCost = gasCostForCommitmentUsd.usdAmount;
      const ethCost = gasCostForCommitmentUsd.ethAmount;

      setPendingPurchase({
        parsedAmount: amountInLbs,
        inputAmount: parsedAmount,
        inputUnit: unitMode,
        priceEth: energyCostInEth,
        commitGasCostUsd: usdCost,
        commitGasCostEth: ethCost,
        secret,
      });
      setCommitCooldownTimestamp(Date.now());
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
      setCommitingModalOpen(true);
      const amountInLbs = pendingPurchase.parsedAmount;
      const secret = pendingPurchase.secret;
      const { txHash, nonce, commitTimestamp } = await commitPurchase(
        amountInLbs,
        user,
        secret
      );
      console.log("nonce: ", nonce);
      setCommitingHash(txHash);
    } catch (err) {
      console.error("Error preparing commit confirmation:", err);
      setCommitingModalOpen(false);
      setError(err.message);
      setSuccessModalOpen(true);
      setSuccessDetails({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const changeModeHandler = () => {
    const newMode = unitMode === "lbs" ? "kg" : "lbs";
    const currMode = unitMode;
    setUnitMode(newMode);
    setAvailableUraniumLbs(
      Number(
        convertUraniumUnits(availableUraniumLbs, currMode, newMode)
      ).toFixed(2)
    );
    setAmount("");
  };

  return (
    <main className="max-w-5xl my-12 mx-auto px-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-primary-600 mb-8 text-center">
        Buy Uranium
      </h1>
      <Card title="Purchase Uranium">
        <form className="py-4 px-7 bg-primary/5 rounded-md block min-w-fit w-full">
          <label className="block label-text mb-4 text-primary text-center">
            Amount ({unitMode}){" "}
            {availableUraniumLbs !== null
              ? `(${availableUraniumLbs} ${unitMode} available)`
              : ""}
            <br />
            {ethUsdPrice
              ? `${ethUsdPrice.toFixed(2)} USD/ETH`
              : "Loading ETH price..."}
            <input
              type="number"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
              max="1000"
              step="0.0001"
              disabled={loading || isCooldownActive()}
              className="block mt-2 my-4 px-2 py-1 text-center rounded-sm w-full disabled:opacity-50 border border-gray-300"
            />
          </label>
          <div className="flex justify-center mb-4">
            <label className="switch">
              <input
                type="checkbox"
                checked={unitMode === "kg"}
                onChange={changeModeHandler}
              />
              <span className="slider round"></span>
            </label>
            <span className="ml-3 text-sm font-medium text-gray-600">
              {unitMode}
            </span>
          </div>
          <div className="flex justify-center">
            <PrimaryButton
              title={loading ? "Processing..." : "Buy Uranium"}
              type="submit"
              onClick={commitPurchaseHandler}
              disabled={loading}
            />
          </div>
        </form>
        <CooldownTimer commitTimestamp={commitCooldownTimestamp} />
      </Card>

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
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Confirm Purchase
        </h2>
        <p className="text-gray-600">
          Purchase {pendingPurchase?.inputAmount} {pendingPurchase?.inputUnit} (
          {pendingPurchase?.parsedAmount} lbs) for{" "}
          {Number(pendingPurchase?.priceEth).toFixed(6)} ETH +{" "}
          {Number(pendingPurchase?.commitGasCostEth).toFixed(6)} ETH gas cost ={" "}
          {(
            Number(pendingPurchase?.priceEth) +
            Number(pendingPurchase?.commitGasCostEth)
          ).toFixed(6)}{" "}
          ETH
          <br />
          Approx. USD: $
          {(pendingPurchase?.parsedAmount * initialUraniumPrice).toFixed(
            2
          )}{" "}
          (uranium) + {Number(pendingPurchase?.commitGasCostUsd).toFixed(2)}{" "}
          (gas) ={" "}
          {(
            pendingPurchase?.parsedAmount * initialUraniumPrice +
            Number(pendingPurchase?.commitGasCostUsd)
          ).toFixed(2)}
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
        <p>
          Transaction Hash:{" "}
          {committingHash ? truncateTransactionHash(committingHash) : null}
        </p>
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
          {successDetails?.error
            ? "Transaction Failed"
            : "Transaction Successful"}
        </h2>
        {successDetails?.error ? (
          <p className="text-red-600">Error: {successDetails.error}</p>
        ) : (
          <div className="text-gray-600">
            <p>
              You have successfully purchased {successDetails?.inputAmount}{" "}
              {successDetails?.inputUnit} ({successDetails?.parsedAmount} lbs)
              for {Number(successDetails?.priceEth).toFixed(6)} ETH +{" "}
              {Number(successDetails?.costEth).toFixed(6)} ETH ={" "}
              {(
                Number(successDetails?.priceEth) +
                Number(successDetails?.costEth)
              ).toFixed(6)}{" "}
              ETH
              <br />
              Approx. USD: $
              {(successDetails?.parsedAmount * initialUraniumPrice).toFixed(
                2
              )}{" "}
              (uranium) + {Number(successDetails?.costUsd).toFixed(2)} (gas) ={" "}
              {(
                successDetails?.parsedAmount * initialUraniumPrice +
                Number(successDetails?.costUsd)
              ).toFixed(2)}
            </p>
          </div>
        )}
      </Modal>
    </main>
  );
}
