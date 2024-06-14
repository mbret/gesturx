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
        const pinchStart$ = this.panEvent$.pipe(
          filter((event) => event.type === "panStart"),
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
            return this.panEvent$.pipe(
              takeWhile((event) => event.type !== "panEnd"),
              mapPanEventToPinchEvent({
                type: "pinchMove",
                initialEvent,
              }),
            )
          }),
        )

        const pinchEnd$ = pinchStart$.pipe(
          switchMap((pinchStartEvent) =>
            this.panEvent$.pipe(
              // we cannot have a panEnd without a previous event so it will always emit
              startWith(pinchStartEvent),
              pairwise(),
              filter(([_, currEvent]) => currEvent.type === "panEnd"),
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
