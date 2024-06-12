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
  skip,
  switchMap,
  takeUntil,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import { RecognizerEvent } from "./RecognizerEvent"
import { getPointerEvents, trackPointers, matchPointer } from "../utils/events"
import { isWithinPosThreshold } from "../utils/utils"
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

export type RecognizerOptions = {
  posThreshold?: number
  delay?: number
  /**
   * Number of inputs to trigger the event.
   * Default to 1
   */
  numInputs?: number
  failWith?: { start$: Observable<unknown> }[]
}

export type State = {
  fingers: number
}

export abstract class Recognizer<
  Options extends RecognizerOptions,
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
        const numInputs = Math.max(1, config.options?.numInputs ?? 1)
        const posThreshold = Math.max(0, config.options?.posThreshold ?? 0)
        const delay = Math.max(0, config.options?.delay ?? 0)

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

        const trackPointers$ = pointerDown$.pipe(
          trackPointers({
            pointerCancel$,
            pointerLeave$,
            pointerUp$,
            pointerMove$,
            trackMove: true,
          }),
          shareReplay(1),
        )

        const hasEnoughFingers = (
          stream: Observable<{ event: PointerEvent; pointers: PointerEvent[] }>,
        ) =>
          stream.pipe(
            filter(
              (
                events,
              ): events is { event: PointerEvent; pointers: [PointerEvent] } =>
                events.pointers.length >= numInputs,
            ),
          )

        const hasNotEnoughFingers = (
          stream: Observable<{
            event: PointerEvent
            pointers: PointerEvent[]
          }>,
        ) => stream.pipe(filter((events) => events.pointers.length < numInputs))

        return trackPointers$.pipe(
          hasEnoughFingers,
          exhaustMap(
            ({
              event: initialPointerEvent,
              pointers: initialPointerEvents,
            }) => {
              const panReleased$ = trackPointers$.pipe(
                hasNotEnoughFingers,
                first(),
                share(),
              )

              const delay$ = timer(delay)

              const pointerDownPassingThreshold$ = merge(
                ...initialPointerEvents.map((pointerEvent) => of(pointerEvent)),
                pointerDown$,
              ).pipe(
                mergeMap((pointerDown) =>
                  merge(pointerMove$, of(pointerDown)).pipe(
                    matchPointer(pointerDown),
                    filter((pointerMoveEvent) =>
                      isWithinPosThreshold(
                        pointerDown,
                        pointerMoveEvent,
                        posThreshold,
                      ),
                    ),
                  ),
                ),
                first(),
              )

              const panStart$ = pointerDownPassingThreshold$.pipe(
                switchMap(() => delay$),
                map(() => ({
                  type: "panStart" as const,
                  event: initialPointerEvent,
                  latestActivePointers: initialPointerEvents,
                })),
                shareReplay({
                  bufferSize: 1,
                  refCount: false,
                }),
                takeUntil(panReleased$),
              )

              const panUpdate$ = panStart$.pipe(
                mergeMap(() =>
                  trackPointers$.pipe(
                    skip(1),
                    map(({ event, pointers }) => ({
                      type: "panMove" as const,
                      event,
                      latestActivePointers: pointers,
                    })),
                  ),
                ),
                takeUntil(panReleased$),
              )

              const panEnd$ = panStart$.pipe(
                mergeMap(() =>
                  panReleased$.pipe(
                    map(({ event, pointers }) => ({
                      type: "panEnd" as const,
                      event,
                      latestActivePointers: pointers,
                    })),
                  ),
                ),
              )

              const rawEvent$ = merge(panStart$, panUpdate$, panEnd$).pipe(
                shareReplay(1),
              )

              return rawEvent$.pipe(
                mapToRecognizerEvent,
                withLatestFrom(rawEvent$),
                map(([recognizerEvent, { type }]) => ({
                  ...recognizerEvent,
                  type,
                })),
              )
            },
          ),
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
