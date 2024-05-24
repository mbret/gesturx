import {
  Observable,
  combineLatest,
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
import {
  getPointerEvents,
  isOUtsidePosThreshold,
  matchPointer,
  trackFingers,
} from "../utils/utils"
import { Recognizer } from "../recognizer/Recognizer"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { mapToRecognizerEvent } from "../recognizer/mapToRecognizerEvent"

export interface PanEvent extends RecognizerEvent {
  type: "panStart" | "panMove" | "panEnd"
}

export class PanRecognizer extends Recognizer {
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>
  public fingers$: Observable<number>

  constructor(protected options: { posThreshold?: number } = {}) {
    super()

    const { posThreshold = 15 } = options

    this.events$ = this.init$.pipe(
      switchMap(({ container, afterEventReceived }) => {
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

            const firstPointerDownMovingOutOfThreshold$ = pointerDowns$.pipe(
              mergeMap((pointerDown) =>
                pointerMove$.pipe(
                  matchPointer(pointerDown),
                  // we start pan only if the user started moving a certain distance
                  filter((pointerMoveEvent) =>
                    isOUtsidePosThreshold(
                      pointerDown,
                      pointerMoveEvent,
                      posThreshold,
                    ),
                  ),
                ),
              ),
              first(),
            )

            const panStart$ = firstPointerDownMovingOutOfThreshold$.pipe(
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
              share(),
            )

            return combineLatest([
              rawEvent$.pipe(mapToRecognizerEvent),
              rawEvent$,
            ]).pipe(
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

    this.start$ = this.events$.pipe(
      filter((event) => event.type === "panStart"),
    )
    this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"))

    this.fingers$ = this.init$.pipe(
      switchMap(({ container, afterEventReceived }) => {
        const pointerEvents = getPointerEvents({
          container,
          afterEventReceived,
        })

        return pointerEvents.pointerDown$.pipe(
          trackFingers({
            ...pointerEvents,
            trackMove: false,
          }),
        )
      }),
      map((events) => events.length),
    )
  }
}
