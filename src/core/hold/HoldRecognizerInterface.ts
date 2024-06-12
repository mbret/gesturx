import { Observable } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerOptions } from "../recognizer/Recognizer"

export interface HoldEvent extends RecognizerEvent {
  type: "holdStart" | "holdEnd"
}

export interface HoldRecognizerOptions {
  posThreshold?: number
  delay?: number
  numInputs?: number
  failWith?: { start$: Observable<unknown> }[]
}

export interface HoldRecognizerInterface
  extends Recognizer<RecognizerOptions, HoldEvent> {
  events$: Observable<HoldEvent>

  update(options: HoldRecognizerOptions): void
}
