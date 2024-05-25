import { describe, it, expect } from "vitest"
import { calculateCentroid } from "./geometry"

describe("calculateCentroid", () => {
  it("calculates the correct center for a list of pointer events", () => {
    const events = [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 6 },
    ]
    const center = calculateCentroid(events as any)
    expect(center).toEqual({ x: 2, y: 2.6666666666666665 })
  })

  it("returns origin when no events are present", () => {
    const events: any[] = []
    const center = calculateCentroid(events)
    expect(center).toEqual({ x: 0, y: 0 })
  })

  it("handles single point correctly", () => {
    const events = [{ x: 5, y: 5 }]
    const center = calculateCentroid(events as any)
    expect(center).toEqual({ x: 5, y: 5 })
  })
})
