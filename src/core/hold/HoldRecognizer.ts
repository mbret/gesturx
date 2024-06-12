import { Observable, filter, map, merge, share } from "rxjs"
import { Recognizer, RecognizerOptions } from "../recognizer/Recognizer"
import { PanOptions } from "../pan/PanRecognizer"
import {
  HoldEvent,
  HoldRecognizerInterface,
  HoldRecognizerOptions,
} from "./HoldRecognizerInterface"

export class HoldRecognizer
  extends Recognizer<RecognizerOptions, HoldEvent>
  implements HoldRecognizerInterface
{
  public events$: Observable<HoldEvent>

  constructor(options: HoldRecognizerOptions = {}) {
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

  public update(options: PanOptions) {
    super.update(options)
  }
}
