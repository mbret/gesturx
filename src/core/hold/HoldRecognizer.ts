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
import type {
	HoldEvent,
	HoldRecognizerInterface,
	HoldRecognizerOptions,
} from "./HoldRecognizerInterface";

export type { HoldEvent };

export class HoldRecognizer
	extends Recognizer<HoldRecognizerOptions, HoldEvent>
	implements HoldRecognizerInterface
{
	public events$: Observable<HoldEvent>;

	constructor(options: RecognizerConfig<HoldRecognizerOptions> = {}) {
		super(options, {
			numInputs: 1,
			delay: 0,
			posThreshold: 0,
			...options.options,
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
	}

	public update(options: RecognizerConfig<HoldRecognizerOptions>) {
		super.update(options, options.options);
	}
}
