'use client';

import React from "react";

const Card = ({ title, maxHeight,maxWidth ,children }) => {
  return (
    <div
      className={`w-full card border border-b-primary-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-auto ${
        maxHeight || "max-h-96"
      } ${maxWidth || "max-w-120"} bg-white my-10`}
    >
      {title && <h2 className="card-title text-xl font-bold text-primary-600 px-6 pt-4">{title}</h2>}
      <div className="card-text p-6">{children}</div>
    </div>
  );
};

export default Card;
