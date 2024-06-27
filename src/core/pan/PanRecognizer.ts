import { Observable, map, merge, share } from "rxjs"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"
import {
  PanEvent,
  PanRecognizerInterface,
  PanRecognizerOptions,
} from "./PanRecognizerInterface"

export { type PanEvent }

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

    const panStart$ = this.panStart$.pipe(
      map((event) => ({
        type: "panStart" as const,
        ...event,
      })),
      share(),
    )

    const panEnd$ = this.panEnd$.pipe(
      map((event) => ({
        type: "panEnd" as const,
        ...event,
      })),
      share(),
    )

    this.events$ = merge(
      panStart$,
      this.panMove$.pipe(
        map((event) => ({
          type: "panMove" as const,
          ...event,
        })),
      ),
      panEnd$,
    )

    this.start$ = panStart$

    this.end$ = panEnd$
  }

  public update(config: RecognizerConfig<PanRecognizerOptions>) {
    super.update(config, config.options)
  }
}
