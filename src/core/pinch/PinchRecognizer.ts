import {
  Observable,
  filter,
  merge,
  of,
  pairwise,
  share,
  shareReplay,
  startWith,
  switchMap,
  takeWhile,
} from "rxjs"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"
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
      switchMap((event) =>
        of(event).pipe(
          mapPanEventToPinchEvent({
            type: "pinchStart",
            initialEvent: undefined,
          }),
        ),
      ),
      share(),
    )

    this.events$ = this.config$.pipe(
      switchMap(() => {
        const pinchStarted$ = pinchStart$.pipe(shareReplay(1))

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
        )

        const pinchEnd$ = pinchStarted$.pipe(
          switchMap((pinchStartEvent) =>
            this.pan$.pipe(
              // we cannot have a panEnd without a previous event so it will always emit
              startWith(pinchStartEvent),
              pairwise(),
              filter(([, currEvent]) => currEvent.type === "end"),
              switchMap(([previousEvent, currEvent]) =>
                of(currEvent).pipe(
                  mapPanEventToPinchEvent({
                    type: "pinchEnd",
                    initialEvent: previousEvent,
                  }),
                ),
              ),
            ),
          ),
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
