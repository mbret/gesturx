import {
  Observable,
  exhaustMap,
  filter,
  first,
  map,
  merge,
  mergeMap,
  of,
  share,
  shareReplay,
  skipUntil,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import { isOutsidePosThreshold } from "../utils/utils"
import { Recognizer } from "../recognizer/Recognizer"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { mapToRecognizerEvent } from "../recognizer/mapToRecognizerEvent"
import { getPointerEvents, matchPointer, trackFingers } from "../utils/events"

export interface PanEvent extends RecognizerEvent {
  type: "panStart" | "panMove" | "panEnd"
}

export type PanOptions = {
  posThreshold?: number
}

export abstract class AbstractPanRecognizer<
  Options extends PanOptions,
  Event extends RecognizerEvent,
> extends Recognizer<Options, Event> {
  protected panEvent$: Observable<PanEvent>

  constructor(protected options: Options) {
    super(options)

    this.panEvent$ = this.validConfig$.pipe(
      switchMap((config) => {
        const { container, afterEventReceived } = config
        const { posThreshold = 15 } = config.options ?? {}
        const {
          pointerCancel$,
          pointerDown$,
          pointerLeave$,
          pointerMove$,
          pointerUp$,
        } = getPointerEvents({
          container,
          afterEventReceived,
        })

        return pointerDown$.pipe(
          exhaustMap((initialPointerDownEvent) => {
            const pointerDowns$ = merge(
              of(initialPointerDownEvent),
              pointerDown$,
            )

            const pointerUpdate$ = merge(
              pointerCancel$,
              pointerDown$,
              pointerLeave$,
              pointerMove$,
              pointerUp$,
            )

            const trackFingers$ = pointerDowns$.pipe(
              trackFingers({
                pointerCancel$,
                pointerLeave$,
                pointerUp$,
                pointerMove$,
                trackMove: true,
              }),
              shareReplay(),
            )

            /**
             * We release when we detect a pointer leave and there are no more
             * active fingers.
             *
             * @todo move to utils
             */
            const panReleased$ = merge(
              pointerUp$,
              pointerLeave$,
              pointerCancel$,
            ).pipe(
              withLatestFrom(trackFingers$),
              filter(([_, pointers]) => !pointers.length),
              map(([event]) => event),
              first(),
              share(),
            )

            const firstEventPassingThreshold$ = pointerDowns$.pipe(
              mergeMap((pointerDown) => {
                if (posThreshold <= 0) {
                  return of(pointerDown)
                }

                return pointerMove$.pipe(
                  matchPointer(pointerDown),
                  // we start pan only if the user started moving a certain distance
                  filter((pointerMoveEvent) =>
                    isOutsidePosThreshold(
                      pointerDown,
                      pointerMoveEvent,
                      posThreshold,
                    ),
                  ),
                )
              }),
              first(),
            )

            const panStart$ = firstEventPassingThreshold$.pipe(
              map(() => ({
                type: "panStart" as const,
                event: initialPointerDownEvent,
              })),
              share(),
              takeUntil(panReleased$),
            )

            const panEnd$ = panStart$.pipe(
              mergeMap(() =>
                panReleased$.pipe(
                  map((endEvent) => ({
                    type: "panEnd" as const,
                    event: endEvent,
                  })),
                ),
              ),
            )

            const panUpdate$ = pointerUpdate$.pipe(
              skipUntil(panStart$),
              map((event) => ({
                type: "panMove" as const,
                event,
              })),
              takeUntil(panReleased$),
            )

            const rawEvent$ = merge(panStart$, panUpdate$, panEnd$).pipe(
              withLatestFrom(trackFingers$),
              map(([event, pointers]) => ({
                ...event,
                latestActivePointers: pointers,
              })),
              shareReplay(),
            )

            return rawEvent$.pipe(
              mapToRecognizerEvent,
              withLatestFrom(rawEvent$),
              map(([recognizerEvent, { type }]) => ({
                ...recognizerEvent,
                type,
              })),
            )
          }),
        )
      }),
      share(),
    )
  }
}
