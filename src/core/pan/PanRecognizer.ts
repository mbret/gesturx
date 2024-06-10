import { Observable, filter } from "rxjs"
import {
  Recognizer,
  RecognizerOptions,
  PanEvent,
} from "../recognizer/Recognizer"

export type PanOptions = Pick<
  RecognizerOptions,
  "numInputs" | "failWith" | "posThreshold"
>

export class PanRecognizer extends Recognizer<PanOptions, PanEvent> {
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>

  constructor(options: PanOptions = {}) {
    super({
      ...options,
      posThreshold: options.posThreshold ?? 15,
    })

    this.events$ = this.panEvent$

    this.start$ = this.panEvent$.pipe(
      filter((event) => event.type === "panStart"),
    )

    this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"))
  }
}
