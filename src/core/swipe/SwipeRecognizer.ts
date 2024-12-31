import {
	type Observable,
	filter,
	map,
	share,
	switchMap,
	takeUntil,
	withLatestFrom,
} from "rxjs";
import { Recognizer, type RecognizerConfig } from "../recognizer/Recognizer";
import { calculateDegreeAngleBetweenPoints } from "../utils/geometry";
import type {
	SwipeEvent,
	SwipeRecognizerInterface,
	SwipeRecognizerOptions,
} from "./SwipeRecognizerInterface";
import { isRecognizedAsSwipe } from "./operators";

export type { SwipeEvent };

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

		this.events$ = this.config$.pipe(
			switchMap((initializedWith) => {
				const { escapeVelocity = 0.9 } = initializedWith.options ?? {};

				return this.panStart$.pipe(
					withLatestFrom(this.failWithActive$),
					filter(([, failWithActive]) => !failWithActive),
					switchMap(([startEvent]) => {
						return this.panEnd$.pipe(
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
