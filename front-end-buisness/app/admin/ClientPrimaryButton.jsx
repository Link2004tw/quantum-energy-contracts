"use client";
import { useAuth } from "@/app/store";
import { setIsPaused } from "@/utils/dummyState"; //from "@/data/dummyState";
import PrimaryButton from "../components/UI/PrimaryButton";

export default function ClientPrimaryButton() {
  const { isPaused, setIsPaused: setContextIsPaused } = useAuth();

  const toggleSystem = async () => {
    try {
      // Toggle both context and dummy state
      const newState = !isPaused;
      setContextIsPaused(newState);
      setIsPaused(newState);
      alert(
        newState ? "System Paused Successfully" : "System Unpaused Successfully"
      );
    } catch (error) {
      console.error("Error toggling system state:", error);
      alert("Failed to toggle system state");
    }
  };

  return (
    <>
      <div>State: {isPaused ? "System Paused" : "System Working"}</div>
      <PrimaryButton
        title={isPaused ? "Unpause System" : "Pause System"}
        onClick={toggleSystem}
      />
    </>
  );
}
