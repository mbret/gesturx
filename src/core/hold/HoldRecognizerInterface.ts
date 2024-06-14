import { Observable } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"

export interface HoldEvent extends RecognizerEvent {
  type: "holdStart" | "holdEnd"
}

export interface HoldRecognizerOptions {
  posThreshold?: number
  delay?: number
  numInputs?: number
}

export interface HoldRecognizerInterface
  extends Recognizer<HoldRecognizerOptions, HoldEvent> {
  events$: Observable<HoldEvent>

  update(options: RecognizerConfig<HoldRecognizerOptions>): void
}
