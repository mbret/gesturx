import { Observable, ReplaySubject, map, tap } from "rxjs"
import { getCenterFromEvents } from "./utils"
import { RecognizerEvent, RecognizerEventState } from "./RecognizerEventState"

type InitializedWith = {
  container: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}

export interface RecognizerOptions {
  failWith?: { start$: Observable<unknown> }[]
}

export interface DeprecatedRecognizerEvent {
  /**
   * Center position for multi-touch, or just the single pointer.
   */
  center: { x: number; y: number }
  startEvents: PointerEvent[]
  events: PointerEvent[]
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

export const deprecatedMapToRecognizerEvent = <
  T extends Partial<
    Pick<DeprecatedRecognizerEvent, "startEvents" | "events" | "startTime">
  >,
  R extends DeprecatedRecognizerEvent,
  Return extends R & Omit<T, "startEvents" | "events" | "startTime">,
>(
  stream: Observable<T>,
): Observable<Return> =>
  stream.pipe(
    map((event) => {
      const startEvent = (event.startEvents ?? [])[0]
      const events = event.events ?? event.startEvents ?? []

      if (!startEvent) throw new Error("Missing events")

      const endEvent = events[(event.events?.length ?? 0) - 1] ?? startEvent
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
        center: getCenterFromEvents(events),
        events,
        ...event,
      } as unknown as Return
    }),
  )

export const mapToRecognizerEvent =
  <
    DataType,
    T extends {
      type: DataType
      event: PointerEvent
      events?: PointerEvent[]
      startEvents: PointerEvent[]
      latestActivePointers: PointerEvent[]
      startTime: number
    },
    Return extends RecognizerEvent & {
      type: T["type"]
    },
  >(
    recognizerEventState: RecognizerEventState,
  ) =>
  (stream: Observable<T>): Observable<Return> => {
    const getCenterFromData = (data: T) =>
      getCenterFromEvents(
        !data.latestActivePointers.length
          ? [data.event]
          : data.latestActivePointers,
      )

    return stream.pipe(
      /**
       * Update center if we have a change in fingers.
       * That way the new center get adjusted and we avoid jumping delta
       */
      tap((data) => {
        if (
          [
            "pointerdown",
            "pointercancel",
            "pointerleave",
            "pointerup",
          ].includes(data.event.type)
        ) {
          recognizerEventState.center = getCenterFromData(data)
        }
      }),
      map((data) => {
        const startEvent = (data.startEvents ?? [])[0]
        const events = data.latestActivePointers ?? []

        if (!startEvent) throw new Error("Missing events")

        const previousCenter = recognizerEventState.center
        /**
         * Get center of all active fingers or last pointer event
         */
        const currentCenter = getCenterFromData(data)

        // const endEvent = events[(data.events?.length ?? 0) - 1] ?? startEvent
        // const startX = startEvent.clientX
        // const startY = startEvent.clientY
        const deltaX =
          currentCenter.x - previousCenter.x + recognizerEventState.deltaX
        const deltaY =
          currentCenter.y - previousCenter.y + recognizerEventState.deltaY

        // Calculate the change in time
        const now = Date.now()
        const startTime = data.startTime ?? now
        const delay = now - startTime

        // Avoid division by zero
        // Calculate velocity in pixels per second
        const velocityX = delay > 0 ? deltaX / delay : 0
        const velocityY = delay > 0 ? deltaY / delay : 0

        const radians = Math.atan2(deltaY, deltaX)
        const cumulatedAngle = (radians * 180) / Math.PI

        recognizerEventState.deltaX = deltaX
        recognizerEventState.deltaY = deltaY
        recognizerEventState.velocityX = velocityX
        recognizerEventState.velocityY = velocityY
        recognizerEventState.delay = delay
        recognizerEventState.startTime = startTime
        recognizerEventState.cumulatedAngle = cumulatedAngle
        recognizerEventState.pointers = events
        recognizerEventState.latestActivePointers = data.latestActivePointers
        recognizerEventState.center = currentCenter

        return {
          deltaX,
          deltaY,
          velocityX,
          velocityY,
          delay,
          // startTime,
          cumulatedAngle,
          center: recognizerEventState.center,
          // events,
          pointers: recognizerEventState.pointers,
          ...data,
        } as unknown as Return
      }),
    )
  }

export class Recognizer {
  protected init$ = new ReplaySubject<InitializedWith>()

  initialize(initializedWith: {
    container: HTMLElement
    afterEventReceived?: (event: PointerEvent) => PointerEvent
  }) {
    this.init$.next(initializedWith)
  }
}
