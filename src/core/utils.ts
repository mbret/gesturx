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

export function isDefined<T>(
  arg: T | null | undefined,
): arg is T extends null | undefined ? never : T {
  return arg !== null && arg !== undefined
}

export const hasAtLeastOneItem = <T>(events: T[]): events is [T, ...T[]] =>
  events.length > 0

export const getCenterFromEvents = (events: PointerEvent[]) => {
  const sum = events.reduce(
    (acc, point) => {
      acc.x += point.clientX
      acc.y += point.clientY

      return acc
    },
    { x: 0, y: 0 },
  )

  const numPoints = events.length || 1

  return {
    x: sum.x / numPoints,
    y: sum.y / numPoints,
  }
}

export function isOUtsidePosThreshold(
  startEvent: PointerEvent,
  endEvent: PointerEvent,
  posThreshold: number,
) {
  const start = getCenterFromEvents([startEvent])
  const end = getCenterFromEvents([endEvent])

  // Determines if the movement qualifies as a drag
  return (
    Math.abs(end.x - start.x) > posThreshold ||
    Math.abs(end.y - start.y) > posThreshold
  )
}

export function calculateDistance(pointA: PointerEvent, pointB: PointerEvent) {
  const dx = pointA.clientX - pointB.clientX
  const dy = pointA.clientY - pointB.clientY

  return Math.sqrt(dx * dx + dy * dy)
}

export const fromFailWith = (failWith?: { start$: Observable<unknown> }[]) =>
  !failWith?.length
    ? NEVER
    : merge(...(failWith?.map(({ start$ }) => start$) ?? []))

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

/**
 * Avoid division by zero
 * Calculate velocity in pixels per second
 */
export const calculateVelocity = (
  delay: number,
  deltaX: number,
  deltaY: number,
) => {
  const velocityX = delay > 0 ? deltaX / delay : 0
  const velocityY = delay > 0 ? deltaY / delay : 0

  return {
    velocityX,
    velocityY,
  }
}

export const calculateAngle = (
  deltaX: number,
  deltaY: number,
) => {
  const radians = Math.atan2(deltaY, deltaX)
  const angle = (radians * 180) / Math.PI

  return {
    angle,
  }
}
