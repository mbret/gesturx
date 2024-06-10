import {
  BehaviorSubject,
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
  tap,
  withLatestFrom,
} from "rxjs"
import { RecognizerEvent } from "./RecognizerEvent"
import { getPointerEvents, trackFingers, matchPointer } from "../utils/events"
import { isOutsidePosThreshold } from "../utils/utils"
import { mapToRecognizerEvent } from "./mapToRecognizerEvent"

type RecognizerConfig<Options> = {
  container?: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
  options?: Options
}

type ValidRecognizerConfig<Options> = Required<
  Pick<RecognizerConfig<Options>, "container">
> &
  RecognizerConfig<Options>

export interface PanEvent extends RecognizerEvent {
  type: "panStart" | "panMove" | "panEnd"
}

export type PanOptions = {
  posThreshold?: number
  failWith?: { start$: Observable<unknown> }[]
}

export type State = {
  fingers: number
}

export abstract class Recognizer<
  Options extends PanOptions,
  Event extends RecognizerEvent,
> {
  protected config$ = new BehaviorSubject<RecognizerConfig<Options>>({})
  protected panEvent$: Observable<PanEvent>
  public state$: Observable<State>
  abstract events$: Observable<Event>

  protected validConfig$ = this.config$.pipe(
    filter(
      (config): config is ValidRecognizerConfig<Options> => !!config.container,
    ),
  )

  constructor(options: Options) {
    const stateSubject = new BehaviorSubject<State>({
      fingers: 0,
    })

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
      tap((event) => {
        stateSubject.next({
          fingers: event.pointers.length,
        })
      }),
      share(),
    )

    this.state$ = stateSubject.asObservable()

    this.update(options)
  }

  public initialize(config: RecognizerConfig<Options>) {
    const prevConfig = this.config$.getValue()

    this.config$.next({
      ...prevConfig,
      ...config,
      options: {
        ...prevConfig.options,
        ...config.options,
      } as Options,
    })
  }

  public update(options: Options) {
    const config = this.config$.getValue()

    this.config$.next({
      ...config,
      options: {
        ...config.options,
        ...options,
      },
    })
  }
}
