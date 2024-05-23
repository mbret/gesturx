import { Observable, map, scan } from "rxjs"
import { RecognizerEvent } from "./RecognizerEvent"
import {
  calculateAngle,
  calculateVelocity,
  getCenterFromEvents,
} from "../utils"

export interface RecognizerEventInput {
  event: PointerEvent
  latestActivePointers: PointerEvent[]
}

interface RecognizerEventState extends RecognizerEventInput {
  startTime: number
  center: { x: number; y: number }
  deltaX: number
  deltaY: number
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
    getCenterFromEvents(
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

        return {
          startTime: acc.startTime ?? new Date().getTime(),
          ...acc,
          ...curr,
          center: newCenter,
          deltaX,
          deltaY,
        }
      },
      {},
    ),
    map((data) => {
      const { deltaX, deltaY, latestActivePointers, startTime, center, event } =
        data
      const events = latestActivePointers ?? []

      // Calculate the change in time
      const now = Date.now()
      const delay = now - startTime

      const { velocityX, velocityY } = calculateVelocity(delay, deltaX, deltaY)
      const { angle } = calculateAngle(deltaX, deltaY)

      console.log({
        deltaX,
        deltaY,
        type: event.type,
        center,
        x: event.clientX,
        y: event.clientY,
      })

      return {
        deltaX,
        deltaY,
        velocityX,
        velocityY,
        delay,
        cumulatedAngle: angle,
        center,
        pointers: events,
        startTime,
        event,
      } satisfies RecognizerEvent
    }),
  )
}
