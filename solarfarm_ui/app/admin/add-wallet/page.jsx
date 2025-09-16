"use client";
import React from "react";
import WalletForm from "../../components/UI/WalletForm";
import { authorizeParty } from "@/utils/adminContact";

export default function AddWalletPage() {
    const submitHandler = async (address) => {
        try {
            const hash = await authorizeParty(address);
            alert(`Wallet authorized successfully! Transaction hash: ${hash}`);
        } catch (error) {
            alert(error);
            console.error("Error authorizing wallet:", error);
        }
    };
    return (
        <WalletForm
            onSubmit={submitHandler}
            isAdd={true} // Set to true for adding a wallet
        />
    );
}
