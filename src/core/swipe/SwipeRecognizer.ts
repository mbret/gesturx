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
import { calculateDegreeAngleBetweenPoints } from "../utils/geometry"
import { isRecognizedAsSwipe } from "./isRecognizedAsSwipe"

export interface SwipeEvent extends RecognizerEvent {
  type: "swipe"
  /**
   * Angle between first pointer and last one in degree
   */
  angle: number
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
          exhaustMap((startEvent) => {
            return panRecognizer.end$.pipe(
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
