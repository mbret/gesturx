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
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { AbstractPanRecognizer, PanEvent } from "../pan/AbstractPanRecognizer"
import { mapPanEventToPinchEvent } from "./mapPanEventToPinchEvent"
import { emitOnceWhen } from "../utils/operators"

export interface PinchEvent extends RecognizerEvent {
  type: "pinchStart" | "pinchMove" | "pinchEnd"
  scale: number
  /**
   * Distance between start and current
   */
  distance: number
  /**
   * Delta distance between events
   */
  deltaDistance: number
  /**
   * Delta scale between events
   */
  deltaDistanceScale: number
}

type Options = {
  posThreshold?: number
}

export class PinchRecognizer extends AbstractPanRecognizer<
  Options,
  PinchEvent
> {
  public events$: Observable<PinchEvent>

  constructor(protected options: Options = {}) {
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
}
