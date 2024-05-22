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
import { Recognizer } from "./Recognizer"
import { PanRecognizer } from "./pan/PanRecognizer"
import { RecognizerEvent } from "./RecognizerEventState"

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
}

export class SwipeRecognizer extends Recognizer {
  public events$: Observable<SwipeEvent>

  constructor(protected options: Params = {}) {
    super()

    const panRecognizer = new PanRecognizer()

    const { escapeVelocity = 0.9 } = options

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
              filter(
                (event) =>
                  Math.abs(event.velocityX) >= escapeVelocity ||
                  Math.abs(event.velocityY) >= escapeVelocity,
              ),
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
