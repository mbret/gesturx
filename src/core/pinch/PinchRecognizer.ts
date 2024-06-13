import {
  Observable,
  first,
  map,
  merge,
  mergeMap,
  scan,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import {
  Recognizer,
  PanEvent,
  RecognizerOptions,
} from "../recognizer/Recognizer"
import { mapPanEventToPinchEvent } from "./mapPanEventToPinchEvent"
import { emitOnceWhen } from "../utils/operators"
import {
  PinchEvent,
  PinchRecognizerInterface,
  PinchRecognizerOptions,
} from "./PinchRecognizerInterface"

export class PinchRecognizer
  extends Recognizer<RecognizerOptions, PinchEvent>
  implements PinchRecognizerInterface
{
  public events$: Observable<PinchEvent>

  constructor(protected options: PinchRecognizerOptions = {}) {
    super(options)

    this.events$ = this.validConfig$.pipe(
      switchMap(() => {
        const hasLessThanTwoFinger$ = this.panEvent$.pipe(
          emitOnceWhen(({ pointers }) => pointers.length < 2),
          share(),
        )

        const hasMoreThanOneFinger$ = this.panEvent$.pipe(
          emitOnceWhen(({ pointers }) => pointers.length > 1),
        )

        const start$ = hasMoreThanOneFinger$.pipe(
          map((panEvent) =>
            mapPanEventToPinchEvent({
              panEvent,
              pinchStartEvent: undefined,
              previousPinchEvent: undefined,
              type: "pinchStart",
            }),
          ),
          share(),
        )

        const rotate$ = start$.pipe(
          mergeMap((pinchStartEvent) => {
            return this.panEvent$.pipe(
              scan<PanEvent, PinchEvent, PinchEvent>(
                (previousPinchEvent, panEvent) =>
                  mapPanEventToPinchEvent({
                    pinchStartEvent,
                    previousPinchEvent,
                    panEvent,
                    type: "pinchMove",
                  }),
                pinchStartEvent,
              ),
              takeUntil(hasLessThanTwoFinger$),
            )
          }),
          shareReplay(),
        )

        const pinchEnd$ = start$.pipe(
          mergeMap((pinchStartEvent) =>
            hasLessThanTwoFinger$.pipe(
              first(),
              withLatestFrom(rotate$),
              map(([panEvent, previousPinchEvent]) =>
                mapPanEventToPinchEvent({
                  pinchStartEvent,
                  previousPinchEvent,
                  panEvent,
                  type: "pinchEnd",
                }),
              ),
            ),
          ),
        )

        return merge(start$, rotate$, pinchEnd$)
      }),
    )
  }

  public update(options: PinchRecognizerOptions) {
    super.update(options)
  }
}
