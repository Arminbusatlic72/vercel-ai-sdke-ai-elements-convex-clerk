"use client";

import { useState, useEffect } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number; // ms
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounce = 300
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue !== value) onChange(internalValue);
    }, debounce);

    return () => clearTimeout(handler);
  }, [internalValue, debounce, onChange, value]);

  return (
    <input
      type="text"
      value={internalValue}
      onChange={(e) => setInternalValue(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring focus:ring-blue-200"
    />
  );
}
