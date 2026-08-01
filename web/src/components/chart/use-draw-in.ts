import { useEffect, useRef, useState } from "react"

// The latch is set inside the frame, not when scheduling it: a cancelled frame
// (StrictMode's simulated remount) must be able to reschedule, while a frame that
// actually ran must never replay on refetch.
export function useDrawIn(ready: boolean): boolean {
  const played = useRef(false)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (!ready || played.current) return
    const frame = requestAnimationFrame(() => {
      played.current = true
      setDrawn(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [ready])

  return drawn
}
