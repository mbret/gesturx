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
import { Recognizer } from "../recognizer/Recognizer"
import { PanRecognizer } from "../pan/PanRecognizer"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"

export interface SwipeEvent extends RecognizerEvent {
  type: "swipe"
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

export class SwipeRecognizer extends Recognizer {
  public events$: Observable<SwipeEvent>

  constructor(protected options: Params = {}) {
    super()

    const { escapeVelocity = 0.9, posThreshold } = options

    const panRecognizer = new PanRecognizer({ posThreshold })

    this.events$ = this.init$.pipe(
      switchMap((initializedWith) => {
        panRecognizer.initialize(initializedWith)

        const hasMoreThanOneFinger$ = panRecognizer.events$.pipe(
          filter(({ pointers }) => pointers.length > 1),
        )

        return panRecognizer.start$.pipe(
          exhaustMap(() =>
            panRecognizer.end$.pipe(
              first(),
              filter((event) => {
                return (
                  Math.abs(event.velocityX) >= escapeVelocity ||
                  Math.abs(event.velocityY) >= escapeVelocity
                )
              }),
              takeUntil(hasMoreThanOneFinger$),
            ),
          ),
          map(({ type, ...rest }) => ({
            type: "swipe" as const,
            ...rest,
          })),
          share(),
        )
      }),
    )
  }
}
