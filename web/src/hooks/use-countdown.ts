import { useEffect, useState } from "react";

/**
 * Counts down to a target time, re-rendering once a second until it passes.
 * Returns the remaining milliseconds (zero or negative once reached, 0 when
 * no target is set).
 */
export function useCountdown(target: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const targetMs = new Date(target).getTime();
    if (targetMs <= Date.now()) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (targetMs <= Date.now()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return target ? new Date(target).getTime() - now : 0;
}
