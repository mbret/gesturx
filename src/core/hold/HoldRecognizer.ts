import {
	filter,
	first,
	map,
	merge,
	type Observable,
	of,
	share,
	switchMap,
	takeUntil,
	withLatestFrom,
} from "rxjs";
import { Recognizer, type RecognizerConfig } from "../recognizer/Recognizer";
import { omitUnset } from "../utils/utils";
import type {
	HoldEvent,
	HoldRecognizerInterface,
	HoldRecognizerOptions,
} from "./HoldRecognizerInterface";

export type { HoldEvent, HoldRecognizerOptions };

export class HoldRecognizer
	extends Recognizer<HoldRecognizerOptions, HoldEvent>
	implements HoldRecognizerInterface
{
	public events$: Observable<HoldEvent>;
	public running$: Observable<boolean>;

	constructor(options: RecognizerConfig<HoldRecognizerOptions> = {}) {
		super(options, {
			numInputs: 1,
			delay: 0,
			posThreshold: 0,
			...omitUnset(options.options),
		});

		const start$ = this.panStart$.pipe(
			withLatestFrom(this.failWithActive$),
			filter(([, failWithActive]) => !failWithActive),
			map(([event]) => {
				return {
					type: "holdStart" as const,
					...event,
				};
			}),
		);

		this.events$ = start$.pipe(
			switchMap((holdStartEvent) => {
				const failingActive$ = this.failWithActive$.pipe(
					filter((isActive) => isActive),
					first(),
				);

				const end$ = this.panEnd$.pipe(
					first(),
					map((event) => {
						return {
							type: "holdEnd" as const,
							...event,
						};
					}),
					takeUntil(failingActive$),
				);

				// cancelled by failWith: it ends where it started
				const trailingEndEventIfFailed$ = failingActive$.pipe(
					map(() => ({ ...holdStartEvent, type: "holdEnd" as const })),
					takeUntil(this.panEnd$),
				);

				return merge(of(holdStartEvent), end$, trailingEndEventIfFailed$);
			}),
			this.reportFingers((event) => event.type === "holdEnd"),
			share(),
		);

		this.running$ = this.gestureRunning$;
	}

	public update(options: RecognizerConfig<HoldRecognizerOptions>) {
		super.update(options, options.options);
	}
}
