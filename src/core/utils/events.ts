import {
  NEVER,
  Observable,
  defer,
  endWith,
  filter,
  fromEvent,
  map,
  merge,
  mergeMap,
  of,
  scan,
  takeUntil,
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
 * @todo test the strict stability
 * @important
 * Stable function, will not emit if the pointers don't change
 */
export const trackActivePointers = ({
  container,
}: {
  container: HTMLElement
}) => {
  const pointerUp$ = fromEvent<PointerEvent>(container, "pointerup")
  const pointerLeave$ = fromEvent<PointerEvent>(container, "pointerleave")
  const pointerCancel$ = fromEvent<PointerEvent>(container, "pointercancel")

  return fromEvent<PointerEvent>(container, "pointerdown").pipe(
    mergeMap((pointerDown) => {
      const pointerDownRelease$ = merge(
        pointerUp$,
        pointerLeave$,
        pointerCancel$,
      ).pipe(matchPointer(pointerDown))
      const pointerDown$ = defer(() => of(pointerDown))

      return pointerDown$.pipe(
        mergeMap(() => merge(pointerDown$, NEVER)),
        map((event) => ({ id: event.pointerId, event })),
        takeUntil(pointerDownRelease$),
        endWith({ id: pointerDown.pointerId, event: undefined }),
      )
    }),
    scan(
      (acc, { event, id }) => {
        if (!event) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _deleted, ...rest } = acc

          return rest
        }

        return {
          ...acc,
          [id]: event,
        }
      },
      {} as Record<number, PointerEvent | undefined>,
    ),
    map((events) => Object.values(events).filter(isDefined)),
  )
}

/**
 * Track all pointerEvent for active fingers
 */
export const trackFingers =
  ({
    pointerCancel$,
    pointerLeave$,
    pointerUp$,
    pointerMove$,
    trackMove,
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
    return stream.pipe(
      mergeMap((pointerDown) => {
        const pointerDownRelease$ = merge(
          pointerUp$,
          pointerLeave$,
          pointerCancel$,
        ).pipe(matchPointer(pointerDown))

        const pointerDown$ = defer(() => of(pointerDown))

        const tracking$ = merge(
          pointerDown$,
          trackMove ? pointerMove$ : NEVER,
        ).pipe(
          matchPointer(pointerDown),
          map((event) => ({ id: event.pointerId, event })),
          takeUntil(pointerDownRelease$),
          endWith({ id: pointerDown.pointerId, event: undefined }),
        )

        return tracking$
      }),
      scan(
        (acc, { event, id }) => {
          if (!event) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [id]: _deleted, ...rest } = acc

            return rest
          }

          return {
            ...acc,
            [id]: event,
          }
        },
        {} as Record<number, PointerEvent | undefined>,
      ),
      map((events) => Object.values(events).filter(isDefined)),
    )
  }