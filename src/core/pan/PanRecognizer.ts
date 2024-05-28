import {
  Observable,
  filter,
  map,
  switchMap,
} from "rxjs"
import { getPointerEvents, trackFingers } from "../utils/events"
import {
  AbstractPanRecognizer,
  PanEvent,
  PanOptions,
} from "./AbstractPanRecognizer"

export class PanRecognizer extends AbstractPanRecognizer<PanOptions, PanEvent> {
  public events$: Observable<PanEvent>
  public start$: Observable<PanEvent>
  public end$: Observable<PanEvent>
  public fingers$: Observable<number>

  constructor(protected options: PanOptions = {}) {
    super(options)

    this.events$ = this.panEvent$

    this.start$ = this.panEvent$.pipe(
      filter((event) => event.type === "panStart"),
    )

    this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"))

    this.fingers$ = this.validConfig$.pipe(
      switchMap(({ container, afterEventReceived }) => {
        const pointerEvents = getPointerEvents({
          container,
          afterEventReceived,
        })

        return pointerEvents.pointerDown$.pipe(
          trackFingers({
            ...pointerEvents,
            trackMove: false,
          }),
        )
      }),
      map((events) => events.length),
    )
  }
}
