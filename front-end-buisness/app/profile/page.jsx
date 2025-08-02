"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../store/index";
import { checkIfAuthorized, getEthBalance } from "@/utils/contract";
import { useRouter } from "next/navigation";
import PrimaryButton from "../components/UI/PrimaryButton";
import { ethers } from "ethers";
import Card from "../components/Layout/Card";
import { truncateEthereumAddress } from "@/utils/tools";
import UnderlineButton from "../components/UI/UnderlineButton";
import { saveData } from "@/utils/databaseUtils";
import User from "@/models/user";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currUser, setCurrUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
    console.log(user);
    setCurrUser(user);
  }, [user, router]);

  useEffect(() => {
    //console.log(user);
    const fetchBalance = async () => {
      if (user && user.ethereumAddress) {
        try {
          setIsLoading(true);
          const balance = await getEthBalance(user.ethereumAddress, "hardhat");
          setBalance(balance);
        } catch (error) {
          console.error("Error fetching balance:", error);
          setErrorMessage("Failed to fetch Ethereum balance");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchBalance();
  }, [user]);

  const connectWalletHandler = async () => {
    if (!window.ethereum) {
      setErrorMessage(
        "MetaMask is not installed. Please install it to continue."
      );
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      const updatedUser = new User({
        email: user.email,
        username: user.username,
        birthday: user.birthday,
        uid: user.uid,
        energy: user.energy,
        password: user.password,
        ethereumAddress: address 
      });
      //console.log("Updated user:", updatedUser);
      await saveData(updatedUser.toJSON(), `/users/${user._uid}`);
      
      alert("Wallet changed successfully");
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      setErrorMessage(error.message || "Failed to connect to MetaMask");
    } finally {
      setIsConnecting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return <div className="text-center p-4">Loading profile...</div>;
  }

  return (
    <div className="items-center flex justify-self-center">
      <Card title="User Profile" maxHeight="max-h-[600px]">
        {errorMessage && (
          <div className="text-red-500 p-4 bg-red-100 rounded-lg mb-4">
            {errorMessage}
          </div>
        )}
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
            <span className="font-medium text-primary-600">Birthday:</span>{" "}
            <span className="text-secondary-900">
              {currUser.birthday ? currUser.birthday.toLocaleDateString() : "N/A"}
            </span>
          </p>
          <p>
            <span className="font-medium text-primary-600">
              Ethereum Address:
            </span>{" "}
            <span className="font-mono break-all">
              <span className="text-secondary-900">
                {currUser._ethereumAddress
                  ? truncateEthereumAddress(currUser._ethereumAddress)
                  : "Not connected"}
              </span>
            </span>
          </p>
          <p>
            <span className="font-medium text-primary-600">
              Ethereum Balance:
            </span>{" "}
            <span className="text-secondary-900">
              {balance ? `${balance} ETH` : "N/A"}
            </span>
          </p>
          <p>
            <span className="font-medium text-primary-600">Energy:</span>{" "}
            <span className="text-secondary-900">
              {user.energy ? `${user.energy} kWh` : "0 kWh"}
            </span>
          </p>
          <p>
            <span className="font-medium text-primary-600">Authorized:</span>{" "}
            <span className="text-secondary-900">
              {checkIfAuthorized(currUser) ? `Yes` : "No"}
            </span>
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
