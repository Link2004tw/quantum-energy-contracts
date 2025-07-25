"use clinet";
import React from "react";

export default function PrimaryButton({ title, onClick, disabled }) {
  
  return (
    <button
      className={`btn-primary ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {title}
    </button>
  );
}
