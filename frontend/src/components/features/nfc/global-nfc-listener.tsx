// @ts-nocheck

import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  MAX_AVG_KEYSTROKE_INTERVAL,
  MIN_CHARS_FOR_VALIDATION,
} from "./nfc-scanner-parts/nfc-scanner-config"
import { getAverageKeystrokeInterval } from "./nfc-scanner-parts/nfc-scanner-timing"

/**
 * A hidden input that stays mounted at the top level of the dashboard.
 *
 * It mimics the behaviour of <NFCScanner> but instead of trying to
 * look up a customer itself it simply pushes the UID into the router
 * state and navigates to the scan page.  Because the listener never
 * unmounts, a tap on a card will be caught regardless of which
 * protected route the user is viewing.
 */
export function GlobalNFCListener() {
  const navigate = useNavigate()
  const keystrokeTimestamps = useRef<number[]>([])
  const inputStartTime = useRef<number | null>(null)
  const buffer = useRef("")

  const resetTracking = () => {
    keystrokeTimestamps.current = []
    inputStartTime.current = null
    buffer.current = ""
  }

  const handlePossibleUid = (uid: string) => {
    if (uid.length < MIN_CHARS_FOR_VALIDATION) return
    navigate("/dashboard/scan", { state: { uid } })
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // if user is focused on an editable element, ignore
      const target = e.target as HTMLElement
      if (target.closest("input,textarea,[contenteditable]")) return

      const now = Date.now()
      if (e.key === "Enter") {
        handlePossibleUid(buffer.current)
        resetTracking()
        return
      }

      if (!/^[0-9]$/.test(e.key)) {
        if (e.key === "Backspace" || e.key === "Delete") {
          resetTracking()
        }
        return
      }

      if (buffer.current.length >= 10) {
        // ignore extra digits
        return
      }

      if (inputStartTime.current === null) inputStartTime.current = now
      keystrokeTimestamps.current.push(now)
      buffer.current += e.key

      if (keystrokeTimestamps.current.length >= 3) {
        const avg = getAverageKeystrokeInterval(keystrokeTimestamps.current)
        if (avg > MAX_AVG_KEYSTROKE_INTERVAL) {
          // likely manual typing, abort
          resetTracking()
          return
        }
      }

      if (buffer.current.length === 10) {
        handlePossibleUid(buffer.current)
        resetTracking()
      }
    }

    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [navigate])

  // nothing to render
  return null
}
