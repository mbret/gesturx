import {
  EMPTY,
  Observable,
  exhaustMap,
  filter,
  first,
  map,
  merge,
  of,
  race,
  share,
  switchMap,
  takeUntil,
} from "rxjs"
import { enrichEvent, getPointerEvents, isOUtsidePosThreshold } from "./utils"
import { GestureEvent } from "./types"
import { Recognizer } from "./Recognizer"

type CommonData = ReturnType<typeof enrichEvent> & GestureEvent

export type PanEvent =
  | ({
      type: "panStart"
      /**
       * Delay between the tap and the first moving
       */
      delay: number
    } & CommonData)
  | ({ type: "panMove" } & CommonData)
  | ({ type: "panEnd" } & CommonData)

export class PanRecognizer extends Recognizer {
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>

  constructor(protected options: { posThreshold?: number }) {
    super()
    const { posThreshold = 20 } = options

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
            // const firstMove$ = pointerMove$.pipe(first())

            // const pointerDownBuffer$ = merge(of(initialPointerDownEvent), pointerDown$).pipe(buffer(firstMove$), first(), share())
            const pointerDownBuffer$ = of(initialPointerDownEvent)

            const panStart$ = pointerDownBuffer$.pipe(
              // filter((events) => events.length === 1),
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
              map(
                () =>
                  ({
                    type: "panStart",
                    ...enrichEvent({
                      event: initialPointerDownEvent,
                      startTime,
                      startEvent: initialPointerDownEvent,
                    }),
                  }) satisfies PanEvent,
              ),
              share(),
              takeUntil(panReleased$),
            )

            const panEnd$ = race(panStart$, panReleased$).pipe(
              switchMap((event) =>
                event.type === "panStart"
                  ? panReleased$.pipe(
                      map(
                        (endEvent) =>
                          ({
                            type: "panEnd",
                            ...enrichEvent({
                              event: endEvent,
                              startTime,
                              startEvent: initialPointerDownEvent,
                            }),
                          }) satisfies PanEvent,
                      ),
                    )
                  : EMPTY,
              ),
            )

            const panMove$ = panStart$.pipe(
              switchMap(() => pointerMove$),
              map(
                (moveEvent) =>
                  ({
                    type: "panMove",
                    ...enrichEvent({
                      event: moveEvent,
                      startTime,
                      startEvent: initialPointerDownEvent,
                    }),
                  }) satisfies PanEvent,
              ),
              takeUntil(panReleased$),
            )

            return merge(panStart$, panMove$, panEnd$)
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
