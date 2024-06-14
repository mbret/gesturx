import {
  Observable,
  filter,
  map,
  share,
  switchMap,
} from "rxjs"
import { calculateDegreeAngleBetweenPoints } from "../utils/geometry"
import { isRecognizedAsSwipe } from "./operators"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"
import {
  SwipeEvent,
  SwipeRecognizerInterface,
  SwipeRecognizerOptions,
} from "./SwipeRecognizerInterface"

export class SwipeRecognizer
  extends Recognizer<SwipeRecognizerOptions, SwipeEvent>
  implements SwipeRecognizerInterface
{
  public events$: Observable<SwipeEvent>

  constructor(config?: RecognizerConfig<SwipeRecognizerOptions>) {
    super(config, {
      posThreshold: 0,
      numInputs: 1,
    })

    this.events$ = this.config$.pipe(
      switchMap((initializedWith) => {
        const { escapeVelocity = 0.9 } = initializedWith.options ?? {}

        const panStart$ = this.panEvent$.pipe(
          filter((e) => e.type === "panStart"),
        )

        const panEnd$ = this.panEvent$.pipe(filter((e) => e.type === "panEnd"))

        return panStart$.pipe(
          switchMap((startEvent) => {
            return panEnd$.pipe(
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
            )
          }),
          share(),
        )
      }),
    )
  }

  public update(config: RecognizerConfig<SwipeRecognizerOptions>) {
    super.update(config)
  }
}
