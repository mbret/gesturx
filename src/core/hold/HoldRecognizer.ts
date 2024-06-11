import { Observable, filter, map, merge, share } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerOptions } from "../recognizer/Recognizer"

export interface SwipeEvent extends RecognizerEvent {
  type: "holdStart" | "holdEnd"
}

type Options = Pick<RecognizerOptions, "numInputs" | "failWith" | "delay">

export class HoldRecognizer extends Recognizer<RecognizerOptions, SwipeEvent> {
  public events$: Observable<SwipeEvent>

  constructor(protected options: Options = {}) {
    super({
      numInputs: 1,
      delay: 0,
      posThreshold: 0,
      ...options,
    })

    const start$ = this.panEvent$.pipe(
      filter((e) => e.type === "panStart"),
      map(({ type, ...rest }) => {
        return {
          type: "holdStart" as const,
          ...rest,
        }
      }),
    )

    const end$ = this.panEvent$.pipe(
      filter((e) => e.type === "panEnd"),
      map(({ type, ...rest }) => {
        return {
          type: "holdEnd" as const,
          ...rest,
        }
      }),
    )

    this.events$ = merge(start$, end$).pipe(share())
  }
}
