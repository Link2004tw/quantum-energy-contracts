"use client";

import React from "react";

const UnderlineButton = ({ title = "Click Me", onClick, disabled = false }) => {
  return (
    <button
      className={`text-primary-600 hover:text-primary-700 underline font-medium text-md transition-colors duration-150 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="text-lg">{title}</div>
    </button>
  );
};

export default UnderlineButton;
