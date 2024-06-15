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
  withLatestFrom,
} from "rxjs"
import { filterNotEmpty } from "../utils/utils"
import { scanToRecognizerEvent } from "../recognizer/scanToRecognizerEvent"
import { trackPointers } from "../utils/events"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"
import {
  TapEvent,
  TapRecognizerInterface,
  TapRecognizerOptions,
} from "./TapRecognizerInterface"
import { takeWhenOutsideThreshold, takeWhenPressedTooLong } from "./operators"

export class TapRecognizer
  extends Recognizer<TapRecognizerOptions, TapEvent>
  implements TapRecognizerInterface
{
  public events$: Observable<TapEvent>

  constructor(options?: RecognizerConfig<TapRecognizerOptions>) {
    super(options)

    this.events$ = this.config$.pipe(
      switchMap((config) => {
        const {
          multiTapThreshold = 0,
          maximumPressTime = 150,
          maxTaps = 1,
          tolerance = 10,
        } = config.options ?? {}

        const activePointers$ = this.pointerDown$.pipe(
          trackPointers({
            pointerEvent$: this.pointerEvent$,
            trackMove: true,
          }),
          shareReplay(1),
        )

        const hasMoreThanOneActivePointer$ = activePointers$.pipe(
          filter(({ pointers }) => pointers.length > 1),
        )

        const bufferPointerDowns = (stream: Observable<PointerEvent>) =>
          stream.pipe(
            buffer(this.pointerUp$.pipe(debounceTime(multiTapThreshold))),
            first(),
          )

        const tap$ = merge(
          this.pointerDown$,
          activePointers$.pipe(ignoreElements()),
        ).pipe(
          exhaustMap((initialPointerEvent) => {
            const pointerDowns$ = merge(
              of(initialPointerEvent),
              this.pointerDown$,
            ).pipe(shareReplay(1))

            const pointerDownsBuffered$ = pointerDowns$.pipe(bufferPointerDowns)

            /**
             * Exit condition for `tolerance`
             */
            const clickedTooFarFromOriginalTap$ = pointerDowns$.pipe(
              takeWhenOutsideThreshold({
                initialPointerEvent,
                pointerEvent$: this.pointerEvent$,
                tolerance,
              }),
            )

            /**
             * Exit condition for `maximumPressTime`
             */
            const hasFingersPressedForTooLong$ = pointerDowns$.pipe(
              takeWhenPressedTooLong({
                pointerEvent$: this.pointerEvent$,
                timeout: maximumPressTime,
              }),
            )

            const takeUntil$ = merge(
              this.failWith$,
              this.pointerCancel$,
              hasMoreThanOneActivePointer$,
              clickedTooFarFromOriginalTap$,
              hasFingersPressedForTooLong$,
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
              shareReplay(1),
            )

            return rawEvent$.pipe(
              scanToRecognizerEvent,
              withLatestFrom(rawEvent$),
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

  public update(config: RecognizerConfig<TapRecognizerOptions>): void {
    super.update(config)
  }
}
