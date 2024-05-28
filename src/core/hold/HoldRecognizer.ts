import { Observable, filter, map, merge, share } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { AbstractPanRecognizer, PanOptions } from "../pan/AbstractPanRecognizer"

export interface SwipeEvent extends RecognizerEvent {
  type: "holdStart" | "holdEnd"
}

type Options = {}

export class HoldRecognizer extends AbstractPanRecognizer<Options, SwipeEvent> {
  public events$: Observable<SwipeEvent>

  constructor(protected options: Options = {}) {
    super({
      ...options,
      posThreshold: 0
    } satisfies PanOptions)

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
