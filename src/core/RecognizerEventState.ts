export interface RecognizerEvent {
  center: { x: number; y: number }
  startEvents: PointerEvent[]
  pointers: PointerEvent[]
  delay: number
  deltaX: number
  deltaY: number
  velocityX: number
  velocityY: number
  startTime: number
  cumulatedAngle: number
}

export class RecognizerEventState {
  /**
   * Center position for multi-touch, or just the single pointer.
   */
  center: { x: number; y: number } = { x: 0, y: 0 }
  startEvents: PointerEvent[] = []
  pointers: PointerEvent[] = []
  /**
   * Contain the last known pointer event for each active fingers.
   * It should contain a unique list, with n being the number of active fingers.
   */
  latestActivePointers: PointerEvent[] = []
  /**
   * Delay between the user action and the event recognition
   */
  delay: number = 0
  deltaX: number = 0
  deltaY: number = 0
  /**
   * @important
   * Can be negative, 0, positive
   */
  velocityX: number = 0
  /**
   * @important
   * Can be negative, 0, positive
   */
  velocityY: number = 0
  startTime: number = 0
  /**
   * represent the angle of gesture between start and latest event.
   *
   *             (-90)
   * (+/-180) <-   |   -> (+/-0)
   *             (+90)
   */
  cumulatedAngle: number = 0
}
