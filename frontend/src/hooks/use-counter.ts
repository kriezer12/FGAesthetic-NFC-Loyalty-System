import { useEffect, useState } from "react"

export function useCounter(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start)

  useEffect(() => {
    if (end === start) {
      setCount(end)
      return
    }

    const startTime = Date.now()
    const difference = end - start

    const updateCount = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smoother animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = Math.floor(start + difference * easeOutQuart)

      setCount(current)

      if (progress < 1) {
        requestAnimationFrame(updateCount)
      } else {
        setCount(end)
      }
    }

    requestAnimationFrame(updateCount)
  }, [end, duration, start])

  return count
}
