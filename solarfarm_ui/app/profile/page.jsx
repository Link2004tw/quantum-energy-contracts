"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PrimaryButton from "../components/UI/PrimaryButton";
import { ethers } from "ethers";
import Card from "../components/Layout/Card";
import { truncateEthereumAddress } from "@/utils/tools";
import UnderlineButton from "../components/UI/UnderlineButton";
import User from "@/models/user";
import { auth } from "@/config/firebase";
import AuthorizationRequest from "@/models/request";
import { checkIfAuthorizedAction, saveRequest, updateUser } from "../actions/usersContractActions";
import { onAuthStateChanged } from "firebase/auth";

export default function ProfilePage() {
    const router = useRouter();
    const [currUser, setCurrUser] = useState(null);
    const [balance, setBalance] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [csrfToken, setCsrfToken] = useState(null);

    const fetchEthBalance = async (user) => {
        try {
            let balanceEth = null;
            const token = await auth.currentUser?.getIdToken();
            if (user.ethereumAddress) {
                const response = await fetch("/api/get-eth-balance?address=" + user.ethereumAddress, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("Failed to fetch Ethereum balance");
                }
                const balanceData = await response.json();
                balanceEth = balanceData.balance;
                return balanceEth;
            }
        } catch (error) {
            console.error("Error fetching Ethereum balance:", error);
            setErrorMessage(error.message || "Failed to fetch Ethereum balance");
            return null;
        }
    };
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // Redirect to login if no user is authenticated
                router.push("/login");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                // Fetch user data from Realtime Database
                const response = await fetch("/api/get-user" + `?uid=${user.uid}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${await user.getIdToken()}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("Failed to fetch user data");
                }
                const data = await response.json();
                console.log("Fetched user data:", data);
                const userData = data.user;
                // Create User model instance
                const userModel = new User({ ...userData });

                setCurrUser(userModel);

                // Fetch Ethereum balance if address exists
                const balanceEth = await fetchEthBalance(userModel);
                // Fetch CSRF token and check authorization
                const tokenResponse = await fetch("/api/generate-token", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${await user.getIdToken()}`,
                    },
                });
                const { token } = await tokenResponse.json();
                setCsrfToken(token);
                setIsAuthorized(await checkIfAuthorizedAction(userModel.toJSON(), token));
                setBalance(balanceEth);
            } catch (error) {
                console.error("Error fetching user data or balance:", error);
                setErrorMessage(error.message || "Failed to load profile data");
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const checkAndRegisterAddress = async (ethAddress) => {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
            throw new Error("No authenticated user");
        }
        const response = await fetch("/api/check-registered", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ address: ethAddress }),
        });
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            throw new Error(data.error || "Failed to check Ethereum address");
        }
    };

    const connectWalletHandler = async () => {
        if (!window.ethereum) {
            setErrorMessage("MetaMask is not installed. Please install it to continue.");
            return;
        }
        setIsConnecting(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];
            const updatedUser = new User({
                email: currUser?.email || "",
                username: currUser?.username || "",
                uid: currUser?.uid,
                energy: currUser?.energy || 0,
                ethereumAddress: address,
                isAdmin: currUser?.isAdmin || false,
            });

            const addressCheck = await checkAndRegisterAddress(updatedUser.ethereumAddress);
            await updateUser(updatedUser.toJSON(), csrfToken);

            if (!addressCheck.exists) {
                const authRequest = new AuthorizationRequest(currUser.uid, updatedUser.ethereumAddress, {
                    name: updatedUser.username || "",
                    email: updatedUser.email || "",
                    reason: "New user signup requesting access to EnergyContract",
                    timestamp: new Date().toISOString(),
                });
                await saveRequest(authRequest.toJSON(), csrfToken);
            }

            setCurrUser(updatedUser);
            const balanceEth = await fetchEthBalance(updatedUser);
            setBalance(balanceEth);
            alert("Wallet changed successfully");
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
            setErrorMessage(error.message || "Failed to connect to MetaMask");
        } finally {
            setIsConnecting(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-4">Loading profile...</div>;
    }

    if (!currUser) {
        return null; // Prevent rendering if currUser is null (redirect handled in useEffect)
    }

    return (
        <div className="items-center flex justify-self-center">
            <Card title="User Profile" maxHeight="max-h-[600px]">
                {errorMessage && <div className="text-red-500 p-4 bg-red-100 rounded-lg mb-4">{errorMessage}</div>}
                <div className="grid grid-cols-1 gap-4">
                    <p>
                        <span className="font-medium text-primary-600">Username:</span>{" "}
                        <span className="text-secondary-900">{currUser.username || "N/A"}</span>
                    </p>
                    <p>
                        <span className="font-medium text-primary-600">Email:</span>{" "}
                        <span className="text-secondary-900">{currUser.email || "N/A"}</span>
                    </p>
                    <p>
                        <span className="font-medium text-primary-600">Ethereum Address:</span>{" "}
                        <span className="font-mono break-all">
                            <span className="text-secondary-900">
                                {currUser.ethereumAddress
                                    ? truncateEthereumAddress(currUser.ethereumAddress)
                                    : "Not connected"}
                            </span>
                        </span>
                    </p>
                    <p>
                        <span className="font-medium text-primary-600">Ethereum Balance:</span>{" "}
                        <span className="text-secondary-900">
                            {balance ? `${Number(balance).toFixed(4)} ETH` : "N/A"}
                        </span>
                    </p>
                    <p>
                        <span className="font-medium text-primary-600">Energy:</span>{" "}
                        <span className="text-secondary-900">
                            {currUser.energy ? `${currUser.energy} kWh` : "0 kWh"}
                        </span>
                    </p>
                    <p>
                        <span className="font-medium text-primary-600">Authorized:</span>{" "}
                        <span className="text-secondary-900">{isAuthorized ? "Yes" : "No"}</span>
                    </p>
                    <div className="text-center flex flex-row justify-self-center items-center pt-4">
                        <PrimaryButton
                            title={isConnecting ? "Connecting..." : "Change Wallet"}
                            onClick={connectWalletHandler}
                            disabled={isConnecting}
                            className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-2 rounded-lg"
                        />
                        <UnderlineButton
                            title="Edit Profile"
                            onClick={() => {
                                router.push("updateProfile");
                            }}
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}
