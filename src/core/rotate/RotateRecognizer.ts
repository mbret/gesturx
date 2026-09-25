import {
	filter,
	first,
	map,
	merge,
	type Observable,
	scan,
	share,
	shareReplay,
	switchMap,
	takeUntil,
	tap,
	withLatestFrom,
} from "rxjs";
import {
	Recognizer,
	type RecognizerConfig,
	type RecognizerPanEvent,
} from "../recognizer/Recognizer";
import type {
	RotateEvent,
	RotateRecognizerInterface,
	RotateRecognizerOptions,
} from "./RotateRecognizerInterface";

export type { RotateEvent };

type RotatingEvent = RecognizerPanEvent & { angle: number; deltaAngle: number };

export class RotateRecognizer
	extends Recognizer<RotateRecognizerOptions, RotateEvent>
	implements RotateRecognizerInterface
{
	public events$: Observable<RotateEvent>;

	constructor(config: RecognizerConfig<RotateRecognizerOptions> = {}) {
		super(config, {
			numInputs: 2,
			posThreshold: 15,
			...config.options,
		});

		this.events$ = this.config$.pipe(
			switchMap(() => {
				const rotateStart$ = this.panStart$.pipe(
					withLatestFrom(this.failWithActive$),
					filter(([, failWithActive]) => !failWithActive),
					map(([event]) => ({
						...event,
						type: "rotateStart" as const,
						angle: 0,
						deltaAngle: 0,
					})),
					shareReplay(1),
				);

				const rotate$ = rotateStart$.pipe(
					switchMap((rotateStartEvent) => {
						let latestEvent: RotatingEvent = {
							...rotateStartEvent,
							type: "start",
						};

						const failingActive$ = this.failWithActive$.pipe(
							filter((isActive) => isActive),
							first(),
						);

						const events$ = this.pan$.pipe(
							scan<RecognizerPanEvent, RotatingEvent, undefined>(
								(acc, current) => {
									const angle = (acc?.angle ?? 0) + current.deltaPointersAngle;

									return {
										...acc,
										...current,
										angle,
										deltaAngle: current.deltaPointersAngle,
									};
								},
								undefined,
							),
							tap((event) => {
								latestEvent = event;
							}),
							takeUntil(failingActive$),
						);

						// cancelled by failWith: it ends on the angle it reached
						const trailingEndEventIfFailed$ = failingActive$.pipe(
							map(() => ({
								...latestEvent,
								type: "end" as const,
								deltaAngle: 0,
							})),
							takeUntil(this.panEnd$),
						);

						return merge(events$, trailingEndEventIfFailed$);
					}),
					share(),
				);

				const rotateMove$ = rotate$.pipe(
					filter((event) => event.type === "move"),
					map((event) => ({ ...event, type: "rotateMove" as const })),
				);

				const rotateEnd$ = rotate$.pipe(
					filter((event) => event.type === "end"),
					map((event) => ({ ...event, type: "rotateEnd" as const })),
				);

				return merge(rotateStart$, rotateMove$, rotateEnd$);
			}),
			share(),
		);
	}

	public update(options: RecognizerConfig<RotateRecognizerOptions>) {
		super.update(options, options.options);
	}
}
