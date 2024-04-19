import { Observable, filter, map } from "rxjs"
import { Recognizer, RecognizerEvent } from "./Recognizer"
import { PanRecognizer } from "./PanRecognizer"

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

  constructor(
    protected panRecognizer: PanRecognizer,
    protected options: Params = {},
  ) {
    super()
    const { escapeVelocity = 0.3 } = options

    this.events$ = panRecognizer.end$.pipe(
      filter(
        (event) =>
          Math.abs(event.velocityX) >= escapeVelocity ||
          Math.abs(event.velocityY) >= escapeVelocity,
      ),
      map(({ type, ...rest }) => ({
        type: "swipe",
        ...rest,
      })),
    )
  }
}
