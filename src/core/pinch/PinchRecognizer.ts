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
import {
  Recognizer,
  RecognizerOptions,
} from "../recognizer/Recognizer"
import { mapPanEventToPinchEvent } from "./mapPanEventToPinchEvent"
import {
  PinchEvent,
  PinchRecognizerInterface,
  PinchRecognizerOptions,
} from "./PinchRecognizerInterface"

export { type PinchEvent } from "./PinchRecognizerInterface"

export class PinchRecognizer
  extends Recognizer<RecognizerOptions, PinchEvent>
  implements PinchRecognizerInterface
{
  public events$: Observable<PinchEvent>

  constructor(protected options: PinchRecognizerOptions = {}) {
    super({
      posThreshold: options.posThreshold,
      numInputs: 2,
    })

    this.events$ = this.validConfig$.pipe(
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

  public update(options: PinchRecognizerOptions) {
    super.update(options)
  }
}
