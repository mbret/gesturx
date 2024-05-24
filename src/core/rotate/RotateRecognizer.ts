import {
  Observable,
  exhaustMap,
  filter,
  first,
  map,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { Recognizer } from "../recognizer/Recognizer"
import { PanRecognizer } from "../pan/PanRecognizer"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"

export interface RotateEvent extends RecognizerEvent {
  type: "rotate"
}

type Params = {
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

export class RotateRecognizer extends Recognizer {
  public events$: Observable<RotateEvent>

  constructor(protected options: Params = {}) {
    super()

    const { escapeVelocity = 0.9, posThreshold } = options

    const panRecognizer = new PanRecognizer({ posThreshold })

    this.events$ = this.init$.pipe(
      switchMap((initializedWith) => {
        panRecognizer.initialize(initializedWith)

        const hasLessThanTwoFinger$ = panRecognizer.events$.pipe(
          filter(({ pointers }) => pointers.length < 2),
        )

        return panRecognizer.events$.pipe(
          filter(({ pointers }) => pointers.length > 1),
          // exhaustMap(() =>
          //   panRecognizer.events$.pipe(
          //     first(),
          //     tap((end) => {
          //       console.log(end.cumulatedAngle)
          //     }),
          //     filter((event) => {
          //       return (
          //         Math.abs(event.velocityX) >= escapeVelocity ||
          //         Math.abs(event.velocityY) >= escapeVelocity
          //       )
          //     }),
          //     takeUntil(hasLessThanTwoFinger$),
          //   ),
          // ),
          map(({ type, ...rest }) => ({
            type: "rotate" as const,
            ...rest,
          })),
          share(),
        )
      }),
    )
  }
}
