import { Observable, filter, map, merge, share } from "rxjs"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"
import {
  HoldEvent,
  HoldRecognizerInterface,
  HoldRecognizerOptions,
} from "./HoldRecognizerInterface"

export class HoldRecognizer
  extends Recognizer<HoldRecognizerOptions, HoldEvent>
  implements HoldRecognizerInterface
{
  public events$: Observable<HoldEvent>

  constructor(options: RecognizerConfig<HoldRecognizerOptions> = {}) {
    super(options, {
      numInputs: 1,
      delay: 0,
      posThreshold: 0,
      ...options.options,
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

  public update(options: RecognizerConfig<HoldRecognizerOptions>) {
    super.update(options, options.options)
  }
}
