import { Observable } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"

export interface RotateEvent extends RecognizerEvent {
  type: "rotateMove" | "rotateStart" | "rotateEnd"
  /**
   * Current rotation angle
   */
  angle: number
  /**
   * Delta angle between events
   */
  deltaAngle: number
}

export interface RotateRecognizerOptions {
  /**
   * @default 15
   */
  posThreshold?: number
  /**
   * Minimum fingers required to trigger.
   *
   * A value lower than 2 will not work
   *
   * @default 2
   */
  numInputs?: number
}

export interface RotateRecognizerInterface
  extends Recognizer<RotateRecognizerOptions, RotateEvent> {
  events$: Observable<RotateEvent>

  update(options: RecognizerConfig<RotateRecognizerOptions>): void
}
