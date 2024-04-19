import { Observable, ReplaySubject, map } from "rxjs"
import { getCenterFromEvent } from "./utils"

type InitializedWith = {
  container: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}

export interface RecognizerOptions {
  failWith?: { start$: Observable<unknown> }[]
}

export interface RecognizerEvent {
  center: { x: number; y: number }
  events: [PointerEvent, ...PointerEvent[]]
  /**
   * Delay between the tap and the first moving
   */
  delay: number
  deltaX: number
  deltaY: number
  velocityX: number
  velocityY: number
}

export const mapToRecognizerEvent = <
  T extends { events: PointerEvent[]; startTime?: number },
  R extends RecognizerEvent,
>(
  stream: Observable<T>,
): Observable<R & T> =>
  stream.pipe(
    map((event) => {
      const startEvent = event.events[0]
      const endEvent = event.events[event.events.length - 1]
      const startX = startEvent.clientX
      const startY = startEvent.clientY
      const deltaX = (endEvent?.clientX ?? startX) - startX
      const deltaY = (endEvent?.clientY ?? startY) - startY

      // Calculate the change in time
      const dt = event.startTime ? Date.now() - event.startTime : 0

      // Avoid division by zero
      // Calculate velocity in pixels per second
      const velocityX = dt > 0 ? deltaX / dt : 0
      const velocityY = dt > 0 ? deltaY / dt : 0

      return {
        deltaX,
        deltaY,
        velocityX,
        velocityY,
        delay: dt,
        center: getCenterFromEvent(endEvent ?? startEvent),
        ...event,
      } as R & T
    }),
  )

export class Recognizer {
  initializedWithSubject = new ReplaySubject<InitializedWith>()

  initialize(initializedWith: {
    container: HTMLElement
    afterEventReceived?: (event: PointerEvent) => PointerEvent
  }) {
    this.initializedWithSubject.next(initializedWith)
  }
}
