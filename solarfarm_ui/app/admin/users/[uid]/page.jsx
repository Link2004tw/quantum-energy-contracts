"use client";
import Card from "@/app/components/Layout/Card"; // from '@/components/UI/Card';
import { auth } from "@/config/firebase";
import { truncateEthereumAddress } from "@/utils/tools";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authorizeParty, unauthorizeParty } from "@/utils/adminContact";
import PrimaryButton from "@/app/components/UI/PrimaryButton";
import User from "@/models/user";
import { checkIfAuthorizedAction } from "@/app/actions/usersContractActions";

export default function DetailsPage() {
    const { uid } = useParams();
    const [currUser, setCurrUser] = useState(null);
    const [Authorized, setAuthorized] = useState(false);
    let error = null;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const res = await fetch("/api/get-user?uid=" + uid, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${user?.token}`,
                    },
                });
                if (!res.ok) {
                    error = "Failed to fetch user data.";
                    console.error("Error fetching user data:", res.statusText);
                    return;
                }
                const data = await res.json();
                if (!data.success) {
                    error = data.message || "Failed to fetch user data.";
                    return;
                }
                const userData = data.user ? new User({ ...data.user }) : null;

                if (!userData) {
                    alert("User data not found.");
                    return;
                }
                //console.log(userData);
                setCurrUser(userData);
                setAuthorized(await checkIfAuthorizedAction(userData));
            } else {
                setUsers(null);
            }
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    const toggleAuherization = async () => {
        const address = currUser.ethereumAddress;
        try {
            if (Authorized) {
                await unauthorizeParty(address);
                alert("Unautherized Successfully");
            } else {
                await authorizeParty(address);
                alert("Autherized Successfully");
            }
            setAuthorized(await checkIfAuthorizedAction(currUser));
        } catch (error) {
            console.log(error);
        }
    };

    if (!currUser) {
        return <div>Loading....</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-6" aria-label="Admin user details page">
            <div className="max-w-4xl mx-auto items-center justify-self-center w-md h-screen">
                {error ? (
                    <div className="bg-white shadow-md rounded-lg p-4 m-2 text-center">
                        <p className="text-red-600 text-lg">{error}</p>
                    </div>
                ) : (
                    <Card
                        title={currUser.username || currUser.email || "User Details"}
                        maxHeight="max-h-126"
                        maxWidth="max-w-120"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-600">Username</span>
                                <span className="text-gray-800">{currUser.username || "N/A"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-600">Email</span>
                                <span className="text-gray-800">{currUser.email || "N/A"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-600">Ethereum Address</span>
                                <span className="text-gray-800 truncate">
                                    {truncateEthereumAddress(currUser.ethereumAddress) || "N/A"}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-600">Energy (kWh)</span>
                                <span className="text-gray-800">{currUser.energy || 0}</span>
                            </div>
                            <div>
                                <span className="text-gray-800">Autherized</span>
                            </div>
                            <div>
                                <span className="text-gray-800">
                                    {currUser.ethereumAddress ? (Authorized ? "Yes" : "No") : "error"}
                                </span>
                            </div>
                        </div>
                        <div className="justify-self-center">
                            <PrimaryButton
                                title={Authorized ? "Unautherize" : "Autherize"}
                                onClick={toggleAuherization}
                            />
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
