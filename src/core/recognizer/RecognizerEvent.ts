export interface RecognizerEvent {
  center: { x: number; y: number }
  event: PointerEvent
  /**
   * Contain the last known pointer event for each active fingers.
   * It should contain a unique list, with n being the number of active fingers.
   */
  pointers: PointerEvent[]
  /**
   * Delay between the user action and the event recognition
   */
  delay: number
  deltaX: number
  deltaY: number
  /**
   * @important
   * Can be negative, 0, positive
   */
  velocityX: number
  /**
   * @important
   * Can be negative, 0, positive
   */
  velocityY: number
  startTime: number
  /**
   * represent the angle of gesture between start and latest event.
   *
   *             (-90)
   * (+/-180) <-   |   -> (+/-0)
   *             (+90)
   */
  cumulatedAngle: number
}
