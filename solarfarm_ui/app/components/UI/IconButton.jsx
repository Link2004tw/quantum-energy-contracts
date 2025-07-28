"use client";

import React from "react";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/solid";
const IconButton = ({
  label,
  onClick,
  className = "",
  size = "6",
  disabled = false,
}) => {
  // Map size to Tailwind width/height classes for the icon
  const iconSizeClasses = {
    4: "w-4 h-4",
    6: "w-6 h-6",
    8: "w-8 h-8",
    10: "w-10 h-10",
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 hover:text-white'
        ${
          disabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-blue-500 hover:text-white hover:bg-blue-600"
        } 
        ${className}`}
    >
      <ArrowRightStartOnRectangleIcon
        className="size-6  hover:text-white"
        onClick={onClick}
      />

      {label && <span>{label}</span>}
    </button>
  );
};

export default IconButton;
