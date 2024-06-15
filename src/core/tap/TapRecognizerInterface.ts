import { Observable } from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"

export interface TapEvent extends RecognizerEvent {
  type: "tap"
  taps: number
}

export interface TapRecognizerOptions {
  /**
   * Introduce a delay before recognizing a tap. This can be used to register more taps.
   *
   *
   * A longer time will delay the click event but make it easier to multi taps.
   * Try to find a good balance between latency and accessibility.
   *
   * @default 0
   */
  multiTapThreshold?: number

  /**
   * Maximum time you allow a finger to be pressed on the screen before cancelling the gesture.
   *
   * This can be used to allow long press for example.
   * The default value does not really allow long press but rather accomodate for slower
   * taps.
   *
   * @default 150
   */
  maximumPressTime?: number

  /**
   * Maximum number of taps allowed for the gesture. Going above will ignore the gesture.
   * Going below will register a gesture with the number of taps.
   *
   * For example you can allow single and double tap only by setting `2` as value.
   *
   * @default 1
   */
  maxTaps?: number

  /**
   * A tolerance value which allows the user to move their finger about a radius measured in pixels.
   * This allows the Tap gesture to be triggered more easily since a User might move their
   * finger slightly during a tap event.
   *
   * @default 10
   */
  tolerance?: number
}

export interface TapRecognizerInterface
  extends Recognizer<TapRecognizerOptions, TapEvent> {
  events$: Observable<TapEvent>

  update(options: RecognizerConfig<TapRecognizerOptions>): void
}
