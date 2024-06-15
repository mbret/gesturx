import { Observable, filter, mergeMap, takeUntil, takeWhile, timer } from "rxjs"
import { isPointerOffEvent, matchPointer } from "../utils/events"
import { filterPointerOff } from "../recognizer/operators"
import { isWithinPosThreshold } from "../utils/utils"

export const takeWhenPressedTooLong =
  ({
    timeout,
    pointerEvent$,
  }: {
    timeout: number
    pointerEvent$: Observable<PointerEvent>
  }) =>
  (stream: Observable<PointerEvent>) =>
    stream.pipe(
      mergeMap((pointerDown) =>
        timer(timeout).pipe(
          takeUntil(
            pointerEvent$.pipe(filterPointerOff, matchPointer(pointerDown)),
          ),
        ),
      ),
    )

export const takeWhenOutsideThreshold =
  ({
    initialPointerEvent,
    pointerEvent$,
    tolerance,
  }: {
    initialPointerEvent: PointerEvent
    tolerance: number
    pointerEvent$: Observable<PointerEvent>
  }) =>
  (stream: Observable<PointerEvent>) =>
    stream.pipe(
      mergeMap((pointerDown) =>
        pointerEvent$.pipe(
          matchPointer(pointerDown),
          takeWhile((event) => !isPointerOffEvent(event), true),
          filter((event) =>
            isWithinPosThreshold(initialPointerEvent, event, tolerance),
          ),
        ),
      ),
    )
