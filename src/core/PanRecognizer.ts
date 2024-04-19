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
  switchMap,
  takeUntil,
} from "rxjs"
import { getPointerEvents, isOUtsidePosThreshold } from "./utils"
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
              pointerDown$,
            ).pipe(first())

            const pointerDownBuffer$ = of(initialPointerDownEvent)

            const panStart$ = pointerDownBuffer$.pipe(
              switchMap(() => pointerMove$),
              // we start pan only if the user started moving a certain distance
              filter((pointerMoveEvent) =>
                isOUtsidePosThreshold(
                  initialPointerDownEvent,
                  pointerMoveEvent,
                  posThreshold,
                ),
              ),
              first(),
              map(() => ({
                type: "panStart" as const,
                events: [initialPointerDownEvent],
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
                    events: [initialPointerDownEvent, endEvent],
                    startTime,
                  })),
                ),
              ),
            )

            const panMove$ = panStart$.pipe(
              mergeMap(() => pointerMove$),
              map((moveEvent) => ({
                type: "panMove" as const,
                events: [initialPointerDownEvent, moveEvent],
                startTime,
              })),
              takeUntil(panReleased$),
            )

            return merge(panStart$, panMove$, panEnd$).pipe(
              mapToRecognizerEvent,
            )
          }),
          share(),
        )
      }),
    )

    this.start$ = this.events$.pipe(
      filter((event) => event.type === "panStart"),
    )
    this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"))
  }
}
