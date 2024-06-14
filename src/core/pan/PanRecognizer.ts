import { Observable, filter } from "rxjs"
import {
  Recognizer,
  PanEvent,
  RecognizerConfig,
} from "../recognizer/Recognizer"
import {
  PanRecognizerInterface,
  PanRecognizerOptions,
} from "./PanRecognizerInterface"

export class PanRecognizer
  extends Recognizer<PanRecognizerOptions, PanEvent>
  implements PanRecognizerInterface
{
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>

  constructor(config?: RecognizerConfig<PanRecognizerOptions>) {
    super(config, {
      ...config,
      posThreshold: config?.options?.posThreshold ?? 15,
    })

    this.events$ = this.panEvent$

    this.start$ = this.panEvent$.pipe(
      filter((event) => event.type === "panStart"),
    )

    this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"))
  }

  public update(config: RecognizerConfig<PanRecognizerOptions>) {
    super.update(config, config.options)
  }
}
