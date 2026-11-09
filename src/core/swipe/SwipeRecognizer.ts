import {
	filter,
	map,
	type Observable,
	share,
	switchMap,
	takeUntil,
	withLatestFrom,
} from "rxjs";
import { Recognizer, type RecognizerConfig } from "../recognizer/Recognizer";
import { calculateDegreeAngleBetweenPoints } from "../utils/geometry";
import { isRecognizedAsSwipe } from "./operators";
import type {
	SwipeEvent,
	SwipeRecognizerInterface,
	SwipeRecognizerOptions,
} from "./SwipeRecognizerInterface";

export type { SwipeEvent, SwipeRecognizerOptions };

export class SwipeRecognizer
	extends Recognizer<SwipeRecognizerOptions, SwipeEvent>
	implements SwipeRecognizerInterface
{
	public events$: Observable<SwipeEvent>;

	constructor(config?: RecognizerConfig<SwipeRecognizerOptions>) {
		super(config, {
			posThreshold: 0,
			numInputs: 1,
		});

		this.events$ = this.container$.pipe(
			switchMap(() => {
				return this.panStart$.pipe(
					withLatestFrom(this.failWithActive$),
					filter(([, failWithActive]) => !failWithActive),
					switchMap(([startEvent]) => {
						const { escapeVelocity = 0.9 } =
							this.configSubject.getValue().options ?? {};

						return this.panEnd$.pipe(
							// numInputs is 1, so only a container update, null included, ends the pan with a finger still pressed
							filter((event) => !event.pointers.length),
							isRecognizedAsSwipe(escapeVelocity),
							map((event) => {
								return {
									type: "swipe" as const,
									angle: calculateDegreeAngleBetweenPoints(
										startEvent.event,
										event.event,
									),
									...event,
								};
							}),
							takeUntil(
								this.failWithActive$.pipe(filter((isActive) => isActive)),
							),
						);
					}),
					share(),
				);
			}),
		);
	}

	public update(config: RecognizerConfig<SwipeRecognizerOptions>) {
		super.update(config);
	}
}
