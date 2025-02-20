import { type Observable, filter } from "rxjs";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";

export const isRecognizedAsSwipe =
	(escapeVelocity: number) => (stream: Observable<RecognizerEvent>) =>
		stream.pipe(
			filter((event) => {
				return (
					Math.abs(event.velocityX) >= escapeVelocity ||
					Math.abs(event.velocityY) >= escapeVelocity
				);
			}),
		);
