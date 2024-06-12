import {
  Observable,
  defer,
  filter,
  fromEvent,
  map,
  merge,
  mergeMap,
  of,
  scan,
  takeWhile,
} from "rxjs"
import { isDefined } from "./utils"

export function matchPointer(pointer: PointerEvent) {
  return (stream: Observable<PointerEvent>) =>
    stream.pipe(
      filter((newPointer) => newPointer.pointerId === pointer.pointerId),
    )
}

export const getPointerEvents = ({
  container,
  afterEventReceived = (event) => event,
}: {
  container: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}) => {
  const pointerDown$ = fromPointerDown({ afterEventReceived, container })
  const pointerUp$ = fromEvent<PointerEvent>(container, "pointerup").pipe(
    map(afterEventReceived),
  )
  const pointerMove$ = fromEvent<PointerEvent>(container, "pointermove").pipe(
    map(afterEventReceived),
  )
  /**
   * Mostly used to handle cursor leaving window on mouse pointers.
   */
  const pointerLeave$ = fromEvent<PointerEvent>(container, "pointerleave").pipe(
    map(afterEventReceived),
  )
  /**
   * Handle things such as contextual menu popup or
   * native swipe navigation conflict.
   */
  const pointerCancel$ = fromEvent<PointerEvent>(
    container,
    "pointercancel",
  ).pipe(map(afterEventReceived))

  return {
    pointerDown$,
    pointerCancel$,
    pointerLeave$,
    pointerUp$,
    pointerMove$,
  }
}

export const fromPointerDown = ({
  container,
  afterEventReceived = (event) => event,
}: {
  container: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}) =>
  fromEvent<PointerEvent>(container, "pointerdown").pipe(
    map(afterEventReceived),
  )

/**
 * Track all pointerEvent for active fingers
 */
export const trackPointers =
  ({
    pointerCancel$,
    pointerLeave$,
    pointerUp$,
    pointerMove$,
  }: {
    pointerUp$: Observable<PointerEvent>
    pointerLeave$: Observable<PointerEvent>
    pointerCancel$: Observable<PointerEvent>
    pointerMove$: Observable<PointerEvent>
    /**
     * Setting this value to false will not update the list
     * on pointer move. Use it if you only need to track number of active
     * fingers.
     */
    trackMove: boolean
  }) =>
  (stream: Observable<PointerEvent>) => {
    type PointersState = {
      event: PointerEvent
      pointers: Record<number, PointerEvent | undefined>
    }

    const isPointerRemoved = (event: PointerEvent) =>
      ["pointercancel", "pointerleave", "pointerup"].includes(event.type)

    return stream.pipe(
      mergeMap((pointerDown) => {
        const pointerDown$ = defer(() => of(pointerDown))

        const tracking$ = merge(
          pointerDown$,
          merge(pointerMove$, pointerCancel$, pointerLeave$, pointerUp$),
        ).pipe(
          matchPointer(pointerDown),
          takeWhile((event) => !isPointerRemoved(event), true),
        )

        return tracking$
      }),
      scan<PointerEvent, PointersState, undefined>((acc, event) => {
        if (isPointerRemoved(event)) {
          const { [event.pointerId]: _deleted, ...rest } = acc?.pointers ?? {}

          return {
            event,
            pointers: rest,
          }
        }

        return {
          event,
          pointers: {
            ...(acc?.pointers ?? {}),
            [event.pointerId]: event,
          },
        }
      }, undefined),
      map(({ event, pointers }) => ({
        event,
        pointers: Object.values(pointers).filter(isDefined),
      })),
    )
  }
