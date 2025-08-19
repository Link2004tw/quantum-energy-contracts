"use client";
import { pauseContract, unpauseContract } from "@/utils/adminContact";
import PrimaryButton from "../components/UI/PrimaryButton";
import { useState } from "react";

export default function ClientPrimaryButton({ paused }) {
    const [currState, setCurrState] = useState(paused);

    const toggleSystem = async () => {
        try {
            const response = await fetch("/api/check-paused");
            if (!response.ok) {
                throw new Error("Failed to fetch pause state");
            }
            const data = await response.json();
            const state = data.isPaused;
            if (state) {
                await unpauseContract();
                alert("System Unpaused Successfully");
            } else {
                await pauseContract();
                alert("System Paused Successfully");
            }
            setCurrState(!state);
        } catch (error) {
            alert(error);
        }
    };

    return (
        <>
            <div>State: {currState ? "System Paused" : "System Working"} </div>
            <PrimaryButton title={currState ? "Unpause System" : "Pause System"} onClick={toggleSystem} />
        </>
    );
}
