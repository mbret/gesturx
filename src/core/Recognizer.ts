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
   * Delay between the user action and the event recognition
   */
  delay: number
  deltaX: number
  deltaY: number
  /**
   * @important
   * Can be negative, 0, positive
   */
  velocityX: number
  /**
   * @important
   * Can be negative, 0, positive
   */
  velocityY: number
  startTime: number
  /**
   * represent the angle of gesture between start and latest event.
   *
   *             (-90)
   * (+/-180) <-   |   -> (+/-0)
   *             (+90)
   */
  cumulatedAngle: number
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

      if (!startEvent) throw new Error("Missing events")

      const endEvent = event.events[event.events.length - 1] ?? startEvent
      const startX = startEvent.clientX
      const startY = startEvent.clientY
      const deltaX = endEvent.clientX - startX
      const deltaY = endEvent.clientY - startY

      // Calculate the change in time
      const now = Date.now()
      const startTime = event.startTime ?? now
      const delay = now - startTime

      // Avoid division by zero
      // Calculate velocity in pixels per second
      const velocityX = delay > 0 ? deltaX / delay : 0
      const velocityY = delay > 0 ? deltaY / delay : 0

      const radians = Math.atan2(deltaY, deltaX)
      const cumulatedAngle = (radians * 180) / Math.PI

      return {
        deltaX,
        deltaY,
        velocityX,
        velocityY,
        delay,
        startTime,
        cumulatedAngle,
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
