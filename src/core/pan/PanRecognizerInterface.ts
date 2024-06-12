import { Observable } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerOptions } from "../recognizer/Recognizer"

export interface PanEvent extends RecognizerEvent {
  type: "panStart" | "panMove" | "panEnd"
}

export interface PanRecognizerOptions {
  posThreshold?: number
  delay?: number
  numInputs?: number
  failWith?: { start$: Observable<unknown> }[]
}

export interface PanRecognizerInterface extends Recognizer<RecognizerOptions, PanEvent> {
  events$: Observable<PanEvent>

  update(options: PanRecognizerOptions): void
}
