"use client";
import { isPaused, pauseContract, unpauseContract } from "@/utils/contract";
import PrimaryButton from "../components/UI/PrimaryButton";
import { useState } from "react";

export default function ClientPrimaryButton({ paused }) {
  const [currState, setCurrState] = useState(paused);

  const toggleSystem = async () => {
    try {
      if (currState) {
        await unpauseContract();
        alert("System Unpaused Successfully");
      } else {
        await pauseContract();
        alert("System Paused Successfully");
      }
      setCurrState(await isPaused());
    } catch (error) {
      alert(error);
    }
  };

  return (
    <>
      <div>State: {currState ? "System Paused" : "System Working"} </div>
      <PrimaryButton
        title={currState ? "Unpause System" : "Pause System"}
        onClick={toggleSystem}
      />
    </>
  );
}
