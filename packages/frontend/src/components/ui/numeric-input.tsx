import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Input } from "./input";

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fallback: number;
  integer?: boolean;
  className?: string;
}

/**
 * A numeric input that only validates/clamps on blur, allowing users to
 * freely type (including clearing the field) without the value snapping back.
 */
export function NumericInput({
  value,
  onChange,
  min,
  max,
  step,
  fallback,
  integer,
  className,
}: NumericInputProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync from external value changes (but not while the user is typing)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(value));
    }
  }, [value, isFocused]);

  const clamp = useCallback(
    (raw: string): number => {
      const parsed = integer ? parseInt(raw) : parseFloat(raw);
      let val = isNaN(parsed) ? fallback : parsed;
      if (min !== undefined) val = Math.max(min, val);
      if (max !== undefined) val = Math.min(max, val);
      return val;
    },
    [min, max, fallback, integer],
  );

  const handleBlur = () => {
    setIsFocused(false);
    const clamped = clamp(localValue);
    setLocalValue(String(clamped));
    onChange(clamped);
  };

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      className={className}
    />
  );
}
