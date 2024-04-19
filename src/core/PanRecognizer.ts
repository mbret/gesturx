import {
  Observable,
  exhaustMap,
  filter,
  first,
  ignoreElements,
  map,
  merge,
  mergeMap,
  of,
  share,
  skipUntil,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import {
  getPointerEvents,
  isOUtsidePosThreshold,
  matchPointer,
  trackActivePointers,
  trackFingers,
} from "./utils"
import { Recognizer, RecognizerEvent, mapToRecognizerEvent } from "./Recognizer"

interface CommonData extends RecognizerEvent {}

export type PanEvent =
  | ({
      type: "panStart"
    } & CommonData)
  | ({ type: "panMove" } & CommonData)
  | ({ type: "panEnd" } & CommonData)

export class PanRecognizer extends Recognizer {
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>
  public fingers$: Observable<number>

  constructor(protected options: { posThreshold?: number } = {}) {
    super()
    const { posThreshold = 15 } = options

    this.events$ = this.initializedWithSubject.pipe(
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
            const startTime = new Date().getTime()

            const panReleased$ = merge(
              pointerUp$,
              pointerLeave$,
              pointerCancel$,
              // another pointer down means we put more fingers and we should stop the pan
              // in the future we should allow panning and pinching at the same time
              // pointerDown$,
            ).pipe(
              first(),
              share(),
            )

            const pointerDowns$ = merge(
              of(initialPointerDownEvent),
              pointerDown$,
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
                startEvents: [initialPointerDownEvent],
                startTime,
              })),
              share(),
              takeUntil(panReleased$),
            )

            const panEnd$ = panStart$.pipe(
              mergeMap(() =>
                panReleased$.pipe(
                  map((endEvent) => ({
                    type: "panEnd" as const,
                    startEvents: [initialPointerDownEvent],
                    events: [endEvent],
                    startTime,
                  })),
                ),
              ),
            )

            const panMove$ = pointerDowns$.pipe(
              trackFingers({
                pointerCancel$,
                pointerLeave$,
                pointerUp$,
                pointerMove$,
                trackMove: true,
              }),
              skipUntil(panStart$),
              map((events) => ({
                type: "panMove" as const,
                startEvents: [initialPointerDownEvent],
                events,
                startTime,
              })),
              takeUntil(panReleased$),
            )

            return merge(
              panStart$,
              panMove$,
              panEnd$,
            ).pipe(mapToRecognizerEvent)
          }),
        )
      }),
      share(),
    )

    this.start$ = this.events$.pipe(
      filter((event) => event.type === "panStart"),
    )
    this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"))

    this.fingers$ = this.initializedWithSubject.pipe(
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
          trackFingers({
            pointerCancel$,
            pointerLeave$,
            pointerMove$,
            pointerUp$,
            trackMove: false,
          }),
        )
      }),
      map((events) => events.length),
    )
  }
}
