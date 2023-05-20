import { useEffect, useState } from "react";

export function useDebounce<T>(
  value: T,
  delay: number
): { debouncedValue: T; isDebouncing: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setIsDebouncing(false);
      setDebouncedValue(value);
    }, delay);

    return () => {
      setIsDebouncing(true);
      clearTimeout(handler);
    };
  }, [value, delay]);

  return { debouncedValue, isDebouncing };
}
