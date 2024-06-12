import { Observable, filter } from "rxjs"
import {
  Recognizer,
  RecognizerOptions,
  PanEvent,
} from "../recognizer/Recognizer"
import {
  PanRecognizerInterface,
  PanRecognizerOptions,
} from "./PanRecognizerInterface"

export class PanRecognizer
  extends Recognizer<RecognizerOptions, PanEvent>
  implements PanRecognizerInterface
{
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>

  constructor(options: PanRecognizerOptions = {}) {
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

  public update(options: PanRecognizerOptions) {
    super.update(options)
  }
}
