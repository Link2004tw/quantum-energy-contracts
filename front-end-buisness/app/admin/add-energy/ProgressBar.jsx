"use client";

import React, { createRef, useEffect } from 'react'
import "./progress.module.css";

export default function ProgressBar({value}) {
    const ref = createRef(null);
    if(!ref.current) return;
    useEffect(() => {
        ref.current.style.setProperty("--progress",`${value}%` );
        ref.current.setAttribute("data-value", value.toString());
    }, [value]);
  return (
    <div className="progrss" data-value={value}></div>
  )
}
