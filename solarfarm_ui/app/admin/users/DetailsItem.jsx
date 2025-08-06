"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { truncateEthereumAddress } from "@/utils/tools";
import ClickableCard from "@/app/components/Layout/ClickableCard";

const DetailItem = ({ user }) => {
  const router = useRouter();

  const handleClick = () => {
    if (user._uid) {
      router.push(`/admin/users/${user._uid}`);
    }
  };

  return (
    <ClickableCard
      title={user.username || user.email || "User Details"}
      maxHeight="max-h-96"
      maxWidth="max-w-md"
      className="cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for user ${
        user.username || user.email || "unknown"
      }`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-600">Username</span>
          <span className="text-gray-800">{user.username || "N/A"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-600">Email</span>
          <span className="text-gray-800">{user.email || "N/A"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-600">
            Ethereum Address
          </span>
          <span className="text-gray-800 truncate">
            {truncateEthereumAddress(user._ethereumAddress) || "N/A"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-600">
            Energy (kWh)
          </span>
          <span className="text-gray-800">{user.energy || 0}</span>
        </div>
      </div>
    </ClickableCard>
  );
};

export default DetailItem;
