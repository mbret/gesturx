import {
  Observable,
  buffer,
  combineLatest,
  debounceTime,
  exhaustMap,
  filter,
  first,
  ignoreElements,
  map,
  merge,
  of,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  timer,
  withLatestFrom,
} from "rxjs"
import {
  fromFailWith,
  filterNotEmpty,
  isOutsidePosThreshold,
} from "../utils/utils"
import { Recognizer, RecognizerOptions } from "../recognizer/Recognizer"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { mapToRecognizerEvent } from "../recognizer/mapToRecognizerEvent"
import {
  fromPointerDown,
  getPointerEvents,
  trackFingers,
} from "../utils/events"

export interface TapEvent extends RecognizerEvent {
  type: "tap"
  taps: number
}

interface Options extends RecognizerOptions {
  // Maximum time in ms between multiple taps.
  multiTapThreshold?: number
  // Maximum press time in ms.
  maximumPressTime?: number
  maxTaps?: number
  posThreshold?: number
}

export class TapRecognizer extends Recognizer<Options> {
  public events$: Observable<TapEvent>

  constructor(protected options: Options) {
    super(options)

    this.events$ = this.validConfig$.pipe(
      switchMap((config) => {
        const { container, afterEventReceived } = config
        const {
          multiTapThreshold = 200,
          maximumPressTime = 250,
          maxTaps = 2,
          // threshold should be high because of fingers size
          // and potential margin due to it. clicks are nearly perfect
          // not fingers.
          posThreshold = 10,
          failWith,
        } = config.options ?? {}

        const { pointerUp$, pointerLeave$, pointerCancel$, pointerMove$ } =
          getPointerEvents({
            container,
            afterEventReceived,
          })

        const pointerDown$ = fromPointerDown({ container, afterEventReceived })
        const activePointers$ = pointerDown$.pipe(
          trackFingers({
            pointerCancel$,
            pointerLeave$,
            pointerMove$,
            pointerUp$,
            trackMove: false,
          }),
          shareReplay(1),
        )

        const hasMoreThanOneActivePointer$ = activePointers$.pipe(
          filter((pointers) => pointers.length > 1),
        )

        const onlyOnePointer = <T>(stream: Observable<T>) =>
          stream.pipe(
            withLatestFrom(activePointers$),
            filter(([, pointers]) => pointers.length === 1),
            map(([pointer]) => pointer),
          )

        const bufferPointerDowns = (stream: Observable<PointerEvent>) =>
          stream.pipe(
            buffer(pointerUp$.pipe(debounceTime(multiTapThreshold))),
            first(),
          )

        const failWith$ = fromFailWith(failWith)

        const tap$ = merge(
          pointerDown$,
          activePointers$.pipe(ignoreElements()),
        ).pipe(
          onlyOnePointer,
          exhaustMap((initialPointerEvent) => {
            const pointerDowns$ = merge(of(initialPointerEvent), pointerDown$)
            const subsequentPointerEvents$ = merge(
              pointerUp$,
              pointerLeave$,
              pointerCancel$,
              pointerMove$,
            )
            const pointerDownsBuffered$ = pointerDowns$.pipe(bufferPointerDowns)
            const subsequentPointersOutOfPositionThreshold$ =
              subsequentPointerEvents$.pipe(
                filter((event) =>
                  isOutsidePosThreshold(
                    initialPointerEvent,
                    event,
                    posThreshold,
                  ),
                ),
                first(),
              )
            const waitedTooLong$ = activePointers$.pipe(
              switchMap(() => timer(maximumPressTime)),
            )

            const takeUntil$ = merge(
              failWith$,
              pointerCancel$,
              hasMoreThanOneActivePointer$,
              subsequentPointersOutOfPositionThreshold$,
              waitedTooLong$,
            )

            const rawEvent$ = pointerDownsBuffered$.pipe(
              filterNotEmpty,
              filter((events) => events.length <= maxTaps),
              map((events) => ({
                type: "tap" as const,
                taps: events.length,
                latestActivePointers: events,
                event: events[0],
              })),
            )

            return combineLatest([
              rawEvent$.pipe(mapToRecognizerEvent),
              rawEvent$,
            ]).pipe(
              map(([recognizerEvent, { type, taps }]) => ({
                ...recognizerEvent,
                type,
                taps,
              })),
              takeUntil(takeUntil$),
            )
          }),
        )

        return tap$
      }),
      share(),
    )
  }
}
