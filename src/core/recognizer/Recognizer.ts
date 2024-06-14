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
import { isValidConfig } from "./operators"

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

export interface PanEvent extends RecognizerEvent {
  type: "panStart" | "panMove" | "panEnd"
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
  protected panEvent$: Observable<PanEvent>

  public state$: Observable<State>

  abstract events$: Observable<Event>

  protected config$ = this.configSubject.pipe(isValidConfig)

  constructor(config?: RecognizerConfig<Options>, panConfig?: PanConfig) {
    const stateSubject = new BehaviorSubject<State>({
      fingers: 0,
    })

    this.panEvent$ = this.configSubject.pipe(
      isValidConfig,
      switchMap((config) => {
        const { container, afterEventReceived } = config
        const numInputs = Math.max(1, config.panConfig?.numInputs ?? 1)
        const posThreshold = Math.max(0, config.panConfig?.posThreshold ?? 0)
        const delay = Math.max(0, config.panConfig?.delay ?? 0)

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
          exhaustMap(({ pointers: initialPointerEvents }) => {
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
                type: "panStart" as const,
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
