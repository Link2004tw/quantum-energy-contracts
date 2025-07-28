'use client';

import React from 'react';

export default function ToggleSwitch({ onChange, checked }) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <span className='slider round' />
    </label>
  );
}