import {
  BehaviorSubject,
  NEVER,
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
import { trackPointers, matchPointer } from "../utils/events"
import { isWithinPosThreshold } from "../utils/utils"
import { scanToRecognizerEvent } from "./scanToRecognizerEvent"
import { filterPointerOff, isValidConfig } from "./operators"
import { getPointerEvents } from "./utils"

type PanConfig = {
  posThreshold?: number
  delay?: number
  /**
   * Number of inputs to trigger the event.
   * Default to 1
   */
  numInputs?: number
}

export type RecognizerConfig<Options> = {
  container?: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
  options?: Options
  failWith?: { start$: Observable<unknown> }[]
}

export interface RecognizerPanEvent extends RecognizerEvent {
  type: "start" | "move" | "end"
}

export type State = {
  fingers: number
}

export abstract class Recognizer<
  Options extends Record<any, any>,
  Event extends RecognizerEvent,
> {
  protected configSubject = new BehaviorSubject<
    RecognizerConfig<Options> & {
      panConfig?: PanConfig
    }
  >({})
  protected pan$: Observable<RecognizerPanEvent>
  protected panStart$: Observable<RecognizerEvent>
  protected panMove$: Observable<RecognizerEvent>
  protected panEnd$: Observable<RecognizerEvent>

  protected pointerEvent$: Observable<PointerEvent>
  protected pointerDown$: Observable<PointerEvent>
  protected pointerUp$: Observable<PointerEvent>
  protected pointerCancel$: Observable<PointerEvent>
  protected pointerMove$: Observable<PointerEvent>
  protected pointerOff$: Observable<PointerEvent>

  public state$: Observable<State>

  abstract events$: Observable<Event>

  protected failWith$: Observable<unknown>

  protected config$ = this.configSubject.pipe(isValidConfig)

  constructor(config?: RecognizerConfig<Options>, panConfig?: PanConfig) {
    const stateSubject = new BehaviorSubject<State>({
      fingers: 0,
    })

    this.pointerEvent$ = this.config$.pipe(
      switchMap(({ container, afterEventReceived }) =>
        getPointerEvents({
          container,
          afterEventReceived,
        }),
      ),
    )

    this.pointerDown$ = this.pointerEvent$.pipe(
      filter((event) => event.type === "pointerdown"),
    )

    this.pointerUp$ = this.pointerEvent$.pipe(
      filter((event) => event.type === "pointerup"),
    )

    this.pointerMove$ = this.pointerEvent$.pipe(
      filter((event) => event.type === "pointermove"),
    )

    this.pointerCancel$ = this.pointerEvent$.pipe(
      filter((event) => event.type === "pointercancel"),
    )

    this.pointerOff$ = this.pointerEvent$.pipe(filterPointerOff)

    this.failWith$ = this.config$.pipe(
      switchMap(({ failWith }) =>
        !failWith?.length
          ? NEVER
          : merge(...(failWith?.map(({ start$ }) => start$) ?? [])),
      ),
    )

    this.pan$ = this.configSubject.pipe(
      isValidConfig,
      switchMap((config) => {
        const numInputs = Math.max(1, config.panConfig?.numInputs ?? 1)
        const posThreshold = Math.max(0, config.panConfig?.posThreshold ?? 0)
        const delay = Math.max(0, config.panConfig?.delay ?? 0)

        const trackPointers$ = this.pointerDown$.pipe(
          trackPointers({
            pointerEvent$: this.pointerEvent$,
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
          exhaustMap(({ pointers: initialPointerEvents }) => {
            const panReleased$ = trackPointers$.pipe(
              hasNotEnoughFingers,
              first(),
              share(),
            )

            const delay$ = timer(delay)

            const pointerDownPassingThreshold$ = merge(
              ...initialPointerEvents.map((pointerEvent) => of(pointerEvent)),
              this.pointerDown$,
            ).pipe(
              mergeMap((pointerDown) =>
                merge(this.pointerMove$, of(pointerDown)).pipe(
                  matchPointer(pointerDown),
                  filter((pointerEvent) =>
                    isWithinPosThreshold(
                      pointerDown,
                      pointerEvent,
                      posThreshold,
                    ),
                  ),
                ),
              ),
              first(),
            )

            const panStart$ = pointerDownPassingThreshold$.pipe(
              switchMap(() => delay$),
              withLatestFrom(trackPointers$),
              map(([, { event, pointers }]) => ({
                type: "start" as const,
                event,
                latestActivePointers: pointers,
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
                    type: "move" as const,
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
                    type: "end" as const,
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
              scanToRecognizerEvent,
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

    this.panStart$ = this.pan$.pipe(
      filter((event) => event.type === "start"),
      map(({ type, ...rest }) => rest),
    )

    this.panMove$ = this.pan$.pipe(
      filter((event) => event.type === "move"),
      map(({ type, ...rest }) => rest),
    )

    this.panEnd$ = this.pan$.pipe(
      filter((event) => event.type === "end"),
      map(({ type, ...rest }) => rest),
    )

    this.state$ = stateSubject.asObservable()

    this.updateInternal(config ?? {}, panConfig)
  }

  private updateInternal(
    config: Partial<RecognizerConfig<Options>>,
    panConfig?: PanConfig,
  ) {
    const existingConfig = this.configSubject.getValue()

    this.configSubject.next({
      ...existingConfig,
      ...config,
      ...(config.options && {
        options: { ...existingConfig.options, ...config.options },
      }),
      panConfig: {
        ...existingConfig.panConfig,
        ...panConfig,
      },
    })
  }

  public update(
    config: Partial<RecognizerConfig<Options>>,
    panConfig?: PanConfig,
  ) {
    this.updateInternal(config, panConfig)
  }
}
