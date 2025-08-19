// Prompt: Update CooldownTimer to show 5-minute cooldown until next commitment
// Changes:
// - Updated to display time until user can commit again
// - Uses commitTimestamp to start 5-minute countdown
// - Returns null if no commitTimestamp or timeLeft <= 0
// - Kept className prop for flexible styling
// - Ensured compatibility with BuySolarPage

"use client";
import React, { useState, useEffect } from "react";

const CooldownTimer = ({ commitTimestamp, className = "text-gray-600 text-center" }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    // Update timer every second
    useEffect(() => {
        if (!commitTimestamp) {
            setTimeLeft(0);
            return;
        }

        const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
        const updateTimer = () => {
            const elapsed = Date.now() - commitTimestamp;
            const remaining = Math.max(0, COOLDOWN_PERIOD_MS - elapsed);
            setTimeLeft(Math.ceil(remaining / 1000)); // Convert to seconds
        };

        updateTimer(); // Initial update
        const interval = setInterval(updateTimer, 1000); // Update every second

        return () => clearInterval(interval); // Cleanup
    }, [commitTimestamp]);

    // Format time as MM:SS
    const formatTimeLeft = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };

    // Render nothing if no time left or no timestamp
    if (!commitTimestamp || timeLeft <= 0) {
        return null;
    }

    return <div className={className}>Time until next commitment allowed: {formatTimeLeft(timeLeft)}</div>;
};

export default CooldownTimer;
