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

  constructor(config?: RecognizerConfig<PinchRecognizerOptions>) {
    super(config, {
      ...config?.options,
      numInputs: 2,
    })

    this.events$ = this.config$.pipe(
      switchMap(() => {
        const pinchStart$ = this.panStart$.pipe(
          switchMap((event) =>
            of(event).pipe(
              mapPanEventToPinchEvent({
                type: "pinchStart",
                initialEvent: undefined,
              }),
            ),
          ),
          shareReplay(1),
        )

        const pinchMove$ = pinchStart$.pipe(
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

        const pinchEnd$ = pinchStart$.pipe(
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

        return merge(pinchStart$, pinchMove$, pinchEnd$)
      }),
      share(),
    )
  }

  public update(options: RecognizerConfig<PinchRecognizerOptions>) {
    super.update(options, options.options)
  }
}
