import { fromEvent, map, merge } from "rxjs"
import { fromPointerDown } from "../utils/events"

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

  const pointerEvents$ = merge(
    pointerDown$,
    pointerCancel$,
    pointerLeave$,
    pointerUp$,
    pointerMove$,
  )

  return {
    pointerEvents$,
    pointerDown$,
    pointerCancel$,
    pointerLeave$,
    pointerUp$,
    pointerMove$,
  }
}
