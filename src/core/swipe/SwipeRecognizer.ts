import {
  Observable,
  exhaustMap,
  filter,
  first,
  map,
  share,
  switchMap,
  takeUntil,
} from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { calculateDegreeAngleBetweenPoints } from "../utils/geometry"
import { isRecognizedAsSwipe } from "./isRecognizedAsSwipe"
import { AbstractPanRecognizer } from "../pan/AbstractPanRecognizer"

export interface SwipeEvent extends RecognizerEvent {
  type: "swipe"
  /**
   * Angle between first pointer and last one in degree
   *
   *             (-90)
   * (+/-180) <-   |   -> (+/-0)
   *             (+90)
   */
  angle: number
}

type Options = {
  /**
   * The minimum velocity (px/ms) that the gesture has to obtain by the end event.
   */
  escapeVelocity?: number
  // @todo
  numInputs?: number
  // @todo
  maxRestTime?: number
  posThreshold?: number
}

export class SwipeRecognizer extends AbstractPanRecognizer<
  Options,
  SwipeEvent
> {
  public events$: Observable<SwipeEvent>

  constructor(protected options: Options = {}) {
    super(options)

    this.events$ = this.validConfig$.pipe(
      switchMap((initializedWith) => {
        const { escapeVelocity = 0.9 } = initializedWith.options ?? {}

        const hasMoreThanOneFinger$ = this.panEvent$.pipe(
          filter(({ pointers }) => pointers.length > 1),
        )

        const panStart$ = this.panEvent$.pipe(
          filter((e) => e.type === "panStart"),
        )

        const panEnd$ = this.panEvent$.pipe(filter((e) => e.type === "panEnd"))

        return panStart$.pipe(
          exhaustMap((startEvent) => {
            return panEnd$.pipe(
              first(),
              isRecognizedAsSwipe(escapeVelocity),
              map(({ type, ...rest }) => {
                return {
                  type: "swipe" as const,
                  angle: calculateDegreeAngleBetweenPoints(
                    startEvent.event,
                    rest.event,
                  ),
                  ...rest,
                }
              }),
              takeUntil(hasMoreThanOneFinger$),
            )
          }),
          share(),
        )
      }),
    )
  }
}
