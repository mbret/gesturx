import {
	defaultIfEmpty,
	filter,
	first,
	map,
	merge,
	type Observable,
	of,
	share,
	switchMap,
	takeUntil,
	takeWhile,
	tap,
	withLatestFrom,
} from "rxjs";
import { Recognizer, type RecognizerConfig } from "../recognizer/Recognizer";
import { shareLatest } from "../utils/operators";
import type {
	PinchEvent,
	PinchRecognizerInterface,
	PinchRecognizerOptions,
} from "./PinchRecognizerInterface";
import { scanPanEventToPinchEvent } from "./scanPanEventToPinchEvent";

export type { PinchEvent } from "./PinchRecognizerInterface";

export class PinchRecognizer
	extends Recognizer<PinchRecognizerOptions, PinchEvent>
	implements PinchRecognizerInterface
{
	public events$: Observable<PinchEvent>;

	public start$: Observable<PinchEvent>;
	public end$: Observable<PinchEvent>;

	constructor(config?: RecognizerConfig<PinchRecognizerOptions>) {
		super(config, {
			...config?.options,
			numInputs: 2,
		});

		this.events$ = this.config$.pipe(
			switchMap(() => {
				let latestPinchEvent: PinchEvent | undefined;

				const pinchStarted$ = this.panStart$.pipe(
					withLatestFrom(this.failWithActive$),
					filter(([, failWithActive]) => !failWithActive),
					map(([event]) => event),
					switchMap((event) =>
						of(event).pipe(
							// we don't want a scan on pinch start
							scanPanEventToPinchEvent({
								type: "pinchStart",
								initialEvent: undefined,
							}),
						),
					),
					shareLatest(),
				);

				const failingActive$ = this.failWithActive$.pipe(
					filter((isActive) => isActive),
					first(),
				);

				const pinchMove$ = pinchStarted$.pipe(
					switchMap((initialEvent) => {
						return this.pan$.pipe(
							takeWhile((event) => event.type !== "end"),
							scanPanEventToPinchEvent({
								type: "pinchMove",
								initialEvent,
							}),
							// only for this pinch, the next ones may move again
							takeUntil(failingActive$),
						);
					}),
				);

				const pinchEnd$ = pinchStarted$.pipe(
					switchMap((pinchStartEvent) =>
						this.pan$.pipe(
							filter((event) => event.type === "end"),
							takeUntil(failingActive$),
							defaultIfEmpty(null),
							map((endEvent) => {
								const latestEvent = latestPinchEvent ?? pinchStartEvent;

								/**
								 * It ends where it got to: lifting a finger leaves too few
								 * to measure the distance, and a failWith cancelling it
								 * moves none. So nothing changed since the latest event.
								 */
								return {
									...(endEvent ?? latestEvent),
									type: "pinchEnd" as const,
									scale: latestEvent.scale,
									distance: latestEvent.distance,
									deltaDistance: 0,
									deltaDistanceScale: 1,
								};
							}),
							share(),
						),
					),
				);

				return merge(pinchStarted$, pinchMove$, pinchEnd$).pipe(
					tap((event) => {
						latestPinchEvent = event;
					}),
				);
			}),
			share(),
		);

		this.start$ = this.events$.pipe(
			filter((event) => event.type === "pinchStart"),
		);

		this.end$ = this.events$.pipe(filter((event) => event.type === "pinchEnd"));
	}

	public update(options: RecognizerConfig<PinchRecognizerOptions>) {
		super.update(options, options.options);
	}
}
