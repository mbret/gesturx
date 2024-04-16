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

export function isDefined<T>(arg: T | null | undefined): arg is T extends null | undefined ? never : T {
  return arg !== null && arg !== undefined
}

export const hasAtLeastOneItem = <T>(events: T[]): events is [T, ...T[]] => events.length > 0

export const getCenterFromEvent = (event: MouseEvent | TouchEvent | PointerEvent) => ({
  x: "changedTouches" in event ? event.changedTouches[0]?.pageX ?? 0 : event.clientX,
  y: "changedTouches" in event ? event.changedTouches[0]?.pageY ?? 0 : event.clientY,
})

export function isOUtsidePosThreshold(startEvent: PointerEvent, endEvent: PointerEvent, posThreshold: number) {
  const start = getCenterFromEvent(startEvent)
  const end = getCenterFromEvent(endEvent)

  // Determines if the movement qualifies as a drag
  return Math.abs(end.x - start.x) > posThreshold || Math.abs(end.y - start.y) > posThreshold
}

export function calculateDistance(pointA: PointerEvent, pointB: PointerEvent) {
  const dx = pointA.clientX - pointB.clientX
  const dy = pointA.clientY - pointB.clientY

  return Math.sqrt(dx * dx + dy * dy)
}

export const fromFailWith = (failWith?: { start$: Observable<unknown> }[]) =>
  !failWith?.length ? NEVER : merge(...(failWith?.map(({ start$ }) => start$) ?? []))

export function matchPointer(pointer: PointerEvent) {
  return (stream: Observable<PointerEvent>) => stream.pipe(filter((newPointer) => newPointer.pointerId === pointer.pointerId))
}

export const getPointerEvents = ({
  container,
  afterEventReceived = (event) => event,
}: {
  container: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}) => {
  const pointerDown$ = fromPointerDown({ afterEventReceived, container })
  const pointerUp$ = fromEvent<PointerEvent>(container, "pointerup").pipe(map(afterEventReceived))
  const pointerMove$ = fromEvent<PointerEvent>(container, "pointermove").pipe(map(afterEventReceived))
  /**
   * Mostly used to handle cursor leaving window on mouse pointers.
   */
  const pointerLeave$ = fromEvent<PointerEvent>(container, "pointerleave").pipe(map(afterEventReceived))
  /**
   * Handle things such as contextual menu popup or
   * native swipe navigation conflict.
   */
  const pointerCancel$ = fromEvent<PointerEvent>(container, "pointercancel").pipe(map(afterEventReceived))

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
}) => fromEvent<PointerEvent>(container, "pointerdown").pipe(map(afterEventReceived))

export const enrichEvent = ({
  event,
  startTime,
  startEvent,
}: {
  event: PointerEvent
  startTime: number
  startEvent: PointerEvent
}) => {
  const startX = startEvent.clientX
  const startY = startEvent.clientY
  const deltaX = event.clientX - startX
  const deltaY = event.clientY - startY

  // Calculate the change in time
  const dt = Date.now() - startTime

  // Avoid division by zero
  // Calculate velocity in pixels per second
  const velocityX = dt > 0 ? deltaX / dt : 0
  const velocityY = dt > 0 ? deltaY / dt : 0

  return {
    srcEvent: event,
    deltaX,
    deltaY,
    velocityX,
    velocityY,
    delay: new Date().getTime() - startTime,
    center: {
      x: event.x,
      y: event.y,
    },
  }
}

/**
 * @todo test the strict stability
 * @important
 * Stable function, will not emit if the pointers don't change
 */
export const trackActivePointers = ({ container }: { container: HTMLElement }) => {
  const pointerUp$ = fromEvent<PointerEvent>(container, "pointerup")
  // const pointerMove$ = fromEvent<PointerEvent>(container, "pointermove")
  const pointerLeave$ = fromEvent<PointerEvent>(container, "pointerleave")
  const pointerCancel$ = fromEvent<PointerEvent>(container, "pointercancel")

  return fromEvent<PointerEvent>(container, "pointerdown").pipe(
    mergeMap((pointerDown) => {
      const pointerDownRelease$ = merge(pointerUp$, pointerLeave$, pointerCancel$).pipe(matchPointer(pointerDown))
      const pointerDown$ = defer(() => of(pointerDown))
      // const currentPointerMove$ = pointerMove$.pipe(
      //   filter((pointerMoveEvent) => matchPointer(pointerMoveEvent, pointerDown)),
      //   throttleTime(100, undefined, { trailing: true }),
      // )

      return pointerDown$.pipe(
        // mergeMap(() => merge(pointerDown$, currentPointerMove$)),
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
