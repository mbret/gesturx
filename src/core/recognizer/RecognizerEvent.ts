export interface RecognizerEvent {
	center: { x: number; y: number };
	event: PointerEvent;
	/**
	 * Contain the last known pointer event for each active fingers.
	 * It should contain a unique list, with n being the number of active fingers.
	 */
	pointers: PointerEvent[];
	/**
	 * Delay between the user action and the event recognition
	 */
	delay: number;
	deltaX: number;
	deltaY: number;
	/**
	 * @important
	 * Can be negative, 0, positive
	 */
	velocityX: number;
	/**
	 * @important
	 * Can be negative, 0, positive
	 */
	velocityY: number;
	startTime: number;
	/**
	 * Angle delta (in degrees) between pointers between this event
	 * and the previous one.
	 *
	 * @important
	 * - Will only register a delta if the previous event and current event
	 *   have the same amount of fingers
	 */
	deltaPointersAngle: number;
	/**
	 * Average distance between all pointers
	 */
	pointersAverageDistance: number;
}
