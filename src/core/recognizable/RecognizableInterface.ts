import { Observable, ObservedValueOf } from "rxjs"
import { Recognizer } from "../recognizer/Recognizer"

export type RecognizableState = {
  /**
   * Number of maximum simultaneous fingers currently registered
   * by all recognizers.
   *
   * You can use this to detect how many fingers are touching the screen.
   *
   * This is assuming one of your recognizer is registering gestures.
   */
  fingers: number
}

export interface RecognizableInterface<T extends Recognizer<any, any>[]> {
  /**
   * List of recognizers registered.
   *
   * You can access them directly from here if needed.
   */
  readonly recognizers: T

  /**
   * Dispatch events from all recognizer in one place.
   */
  readonly events$: Observable<ObservedValueOf<T[number]["events$"]>>

  /**
   * Global state based on registered recognizers.
   *
   * It is similar to the recognizer state but is a conveniant access
   * which merge all their state together.
   */
  readonly state$: Observable<RecognizableState>

  /**
   * Initialize the instance with a given html element.
   *
   * You can only initialize one element per instance but you can
   * change the element and call the method again if needed.
   */
  initialize(container: HTMLElement): void
}
