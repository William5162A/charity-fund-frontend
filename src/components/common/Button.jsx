// src/components/common/Button.jsx
import React from 'react';

export default function Button({ text, onClick, type = "button", variant = "primary" }) {
  // تحديد الألوان بناءً على نوع الزر
  const baseStyle = "w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-sm";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    owner: "bg-purple-700 text-white hover:bg-purple-800 border-2 border-purple-900"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]}`}
    >
      {text}
    </button>
  );
}