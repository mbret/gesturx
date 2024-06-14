import { Observable } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"

export interface PanEvent extends RecognizerEvent {
  type: "panStart" | "panMove" | "panEnd"
}

export interface PanRecognizerOptions {
  posThreshold?: number
  delay?: number
  numInputs?: number
}

export interface PanRecognizerInterface extends Recognizer<PanRecognizerOptions, PanEvent> {
  events$: Observable<PanEvent>

  update(options: RecognizerConfig<PanRecognizerOptions>): void
}
