import { Observable, map, merge, share, switchMap } from "rxjs"
import { Recognizer } from "../recognizer/Recognizer"
import { PanRecognizer } from "../pan/PanRecognizer"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"

export interface SwipeEvent extends RecognizerEvent {
  type: "holdStart" | "holdEnd"
}

type Options = {}

export class HoldRecognizer extends Recognizer<Options, SwipeEvent> {
  public events$: Observable<SwipeEvent>

  constructor(protected options: Options = {}) {
    super(options)

    this.events$ = this.validConfig$.pipe(
      switchMap((initializedWith) => {
        const panRecognizer = new PanRecognizer({ posThreshold: 0 })

        panRecognizer.initialize(initializedWith)

        const start$ = panRecognizer.start$.pipe(
          map(({ type, ...rest }) => {
            return {
              type: "holdStart" as const,
              ...rest,
            }
          }),
        )

        const end$ = panRecognizer.end$.pipe(
          map(({ type, ...rest }) => {
            return {
              type: "holdEnd" as const,
              ...rest,
            }
          }),
        )

        return merge(start$, end$).pipe(share())
      }),
    )
  }
}
