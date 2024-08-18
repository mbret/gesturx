import {
  NEVER,
  Observable,
  defaultIfEmpty,
  filter,
  first,
  map,
  merge,
  of,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  takeWhile,
  withLatestFrom,
} from "rxjs"
import {
  Recognizer,
  RecognizerConfig,
  RecognizerPanEvent,
} from "../recognizer/Recognizer"
import { mapPanEventToPinchEvent } from "./mapPanEventToPinchEvent"
import {
  PinchEvent,
  PinchRecognizerInterface,
  PinchRecognizerOptions,
} from "./PinchRecognizerInterface"

export { type PinchEvent } from "./PinchRecognizerInterface"

export class PinchRecognizer
  extends Recognizer<PinchRecognizerOptions, PinchEvent>
  implements PinchRecognizerInterface
{
  public events$: Observable<PinchEvent>

  public start$: Observable<PinchEvent>
  public end$: Observable<PinchEvent>

  constructor(config?: RecognizerConfig<PinchRecognizerOptions>) {
    super(config, {
      ...config?.options,
      numInputs: 2,
    })

    const pinchStart$ = this.panStart$.pipe(
      withLatestFrom(this.failWithActive$),
      filter(([, failWithActive]) => !failWithActive),
      map(([event]) => event),
      mapPanEventToPinchEvent({
        type: "pinchStart",
        initialEvent: undefined,
      }),
      share(),
    )

    this.events$ = this.config$.pipe(
      switchMap(() => {
        const pinchStarted$ = pinchStart$.pipe(shareReplay(1))

        const failingActive$ = this.failWithActive$.pipe(
          filter((isActive) => isActive),
          first(),
        )

        const pinchMove$ = pinchStarted$.pipe(
          switchMap((initialEvent) => {
            return this.pan$.pipe(
              takeWhile((event) => event.type !== "end"),
              mapPanEventToPinchEvent({
                type: "pinchMove",
                initialEvent,
              }),
            )
          }),
          takeUntil(failingActive$),
        )

        const pinchEnd$ = pinchStarted$.pipe(
          switchMap((pinchStartEvent) => {
            let latestEvent: PinchEvent | RecognizerPanEvent = pinchStartEvent

            return this.pan$.pipe(
              switchMap((event) => {
                if (event.type === "end") {
                  return of(event)
                }

                latestEvent = event

                return NEVER
              }),
              takeUntil(failingActive$),
              defaultIfEmpty(null),
              map((endEventOrNull) =>
                endEventOrNull ? endEventOrNull : latestEvent,
              ),
              mapPanEventToPinchEvent({
                type: "pinchEnd",
                initialEvent: latestEvent,
              }),
              share(),
            )
          }),
        )

        return merge(pinchStarted$, pinchMove$, pinchEnd$)
      }),
      share(),
    )

    this.start$ = this.events$.pipe(
      filter((event) => event.type === "pinchStart"),
    )

    this.end$ = this.events$.pipe(filter((event) => event.type === "pinchEnd"))
  }

  public update(options: RecognizerConfig<PinchRecognizerOptions>) {
    super.update(options, options.options)
  }
}
