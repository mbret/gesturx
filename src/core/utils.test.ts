import { describe, it, expect } from "vitest"
import { getCenterFromEvents } from "./utils"

describe("getCenterFromEvents", () => {
  it("calculates the correct center for a list of pointer events", () => {
    const events = [
      { clientX: 0, clientY: 0 },
      { clientX: 2, clientY: 2 },
      { clientX: 4, clientY: 6 },
    ]
    const center = getCenterFromEvents(events as any)
    expect(center).toEqual({ x: 2, y: 2.6666666666666665 })
  })

  it("returns origin when no events are present", () => {
    const events: any[] = []
    const center = getCenterFromEvents(events)
    expect(center).toEqual({ x: 0, y: 0 })
  })

  it("handles single point correctly", () => {
    const events = [{ clientX: 5, clientY: 5 }]
    const center = getCenterFromEvents(events as any)
    expect(center).toEqual({ x: 5, y: 5 })
  })
})
