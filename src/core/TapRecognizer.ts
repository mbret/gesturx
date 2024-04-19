import {
  Observable,
  buffer,
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
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import {
  fromFailWith,
  fromPointerDown,
  getPointerEvents,
  hasAtLeastOneItem,
  isOUtsidePosThreshold,
  trackActivePointers,
} from "./utils"
import {
  Recognizer,
  RecognizerEvent,
  RecognizerOptions,
  mapToRecognizerEvent,
} from "./Recognizer"

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

export class TapRecognizer extends Recognizer {
  public events$: Observable<TapEvent>

  constructor(protected options: Options = {}) {
    super()

    const {
      multiTapThreshold = 200,
      maximumPressTime = 250,
      maxTaps = 1,
      // threshold should be high because of fingers size
      // and potential margin due to it. clicks are nearly perfect
      // not fingers.
      posThreshold = 10,
      failWith,
    } = options

    this.events$ = this.initializedWithSubject.pipe(
      switchMap(({ container, afterEventReceived }) => {
        const startTime = Date.now()
        const { pointerUp$, pointerLeave$, pointerCancel$, pointerMove$ } =
          getPointerEvents({
            container,
            afterEventReceived,
          })

        const pointerDown$ = fromPointerDown({ container, afterEventReceived })
        const activePointers$ = trackActivePointers({ container }).pipe(
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
                  isOUtsidePosThreshold(
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

            const tap$ = pointerDownsBuffered$.pipe(
              filter(hasAtLeastOneItem),
              filter((events) => events.length <= maxTaps),
              map((events) => ({
                type: "tap" as const,
                taps: events.length,
                events: [events[0]],
                startTime,
              })),
              mapToRecognizerEvent,
              takeUntil(takeUntil$),
            )

            return tap$
          }),
        )

        return tap$
      }),
      share(),
    )
  }
}
