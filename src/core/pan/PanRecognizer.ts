import {
  Observable,
  filter,
} from "rxjs"
import { Recognizer, PanOptions, PanEvent } from "../recognizer/Recognizer"

export class PanRecognizer extends Recognizer<PanOptions, PanEvent> {
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>

  constructor(protected options: PanOptions = {}) {
    super(options)

    this.events$ = this.panEvent$

    this.start$ = this.panEvent$.pipe(
      filter((event) => event.type === "panStart"),
    )

    this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"))
  }
}
