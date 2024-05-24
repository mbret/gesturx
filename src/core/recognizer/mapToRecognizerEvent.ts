import { Observable, map, scan } from "rxjs"
import { RecognizerEvent } from "./RecognizerEvent"
import { calculateVelocity } from "../utils/utils"
import { calculateAngleDelta, calculateCentroid } from "../utils/geometry"

export interface RecognizerEventInput {
  event: PointerEvent
  latestActivePointers: PointerEvent[]
}

interface RecognizerEventState extends RecognizerEventInput {
  startTime: number
  center: { x: number; y: number }
  deltaX: number
  deltaY: number
  deltaPointersAngle: number
}

const calculateNewDelta = (
  newCenter: { x: number; y: number },
  prevCenter: { x: number; y: number },
  prevDeltaX: number,
  prevDeltaY: number,
) => {
  const deltaX = newCenter.x - prevCenter.x + prevDeltaX
  const deltaY = newCenter.y - prevCenter.y + prevDeltaY

  return {
    deltaX,
    deltaY,
  }
}

export const mapToRecognizerEvent = <T extends RecognizerEventInput>(
  stream: Observable<T>,
): Observable<RecognizerEvent> => {
  const getCenterFromData = (data: T) =>
    calculateCentroid(
      !data.latestActivePointers.length
        ? [data.event]
        : data.latestActivePointers,
    )

  return stream.pipe(
    scan<T, RecognizerEventState, Partial<RecognizerEventState>>(
      (acc, curr) => {
        const newCenter = getCenterFromData(curr)
        const prevCenter = acc.center ?? { x: 0, y: 0 }
        const prevDeltaX = acc.deltaX ?? 0
        const prevDeltaY = acc.deltaY ?? 0
        const prevActivePointersNumber = acc.latestActivePointers?.length ?? 0
        const currActivePointersNumber = curr.latestActivePointers?.length ?? 0

        const hasAddedOrRemovedAFinger =
          [
            "pointerdown",
            "pointercancel",
            "pointerleave",
            "pointerup",
          ].includes(curr.event.type) &&
          prevActivePointersNumber !== currActivePointersNumber
        const hasAtLeastOneFinger = currActivePointersNumber > 0

        const { deltaX, deltaY } =
          hasAddedOrRemovedAFinger && hasAtLeastOneFinger
            ? calculateNewDelta(newCenter, newCenter, prevDeltaX, prevDeltaY)
            : calculateNewDelta(newCenter, prevCenter, prevDeltaX, prevDeltaY)

        const { degreesDelta: deltaPointersAngle } =
          prevActivePointersNumber === currActivePointersNumber &&
          prevActivePointersNumber >= 2 &&
          currActivePointersNumber >= 2
            ? calculateAngleDelta(
                acc.latestActivePointers ?? [],
                curr.latestActivePointers ?? [],
              )
            : { degreesDelta: 0 }

        return {
          startTime: acc.startTime ?? new Date().getTime(),
          ...acc,
          ...curr,
          center: newCenter,
          deltaX,
          deltaY,
          deltaPointersAngle,
        }
      },
      {},
    ),
    map((data) => {
      const {
        deltaX,
        deltaY,
        latestActivePointers,
        startTime,
        center,
        event,
        deltaPointersAngle,
      } = data
      const events = latestActivePointers ?? []

      // Calculate the change in time
      const now = Date.now()
      const delay = now - startTime

      const { velocityX, velocityY } = calculateVelocity(delay, deltaX, deltaY)

      return {
        deltaX,
        deltaY,
        velocityX,
        velocityY,
        delay,
        center,
        pointers: events,
        startTime,
        event,
        deltaPointersAngle,
      } satisfies RecognizerEvent
    }),
  )
}
