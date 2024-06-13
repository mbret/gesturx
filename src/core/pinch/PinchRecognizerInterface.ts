import { Observable } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerOptions } from "../recognizer/Recognizer"

export interface PinchEvent extends RecognizerEvent {
  type: "pinchStart" | "pinchMove" | "pinchEnd"
  scale: number
  /**
   * Distance between start and current
   */
  distance: number
  /**
   * Delta distance between events
   */
  deltaDistance: number
  /**
   * Delta scale between events
   */
  deltaDistanceScale: number
}

export interface PinchRecognizerOptions {
  posThreshold?: number
  failWith?: { start$: Observable<unknown> }[]
}

export interface PinchRecognizerInterface
  extends Recognizer<RecognizerOptions, PinchEvent> {
  events$: Observable<PinchEvent>

  update(options: PinchRecognizerOptions): void
}
