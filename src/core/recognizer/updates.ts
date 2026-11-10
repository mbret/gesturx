import { Observable, share } from "rxjs";

/** How many deliveries of events run, nested ones included. */
let deliveries = 0;
/** How many updates apply, nested ones included. */
let applying = 0;
/** The updates that wait for the microtask, in order. */
let heldUpdates: (() => void)[] | undefined;

const apply = (update: () => void) => {
	applying++;

	try {
		update();
	} finally {
		applying--;
	}
};

const applyHeldUpdates = () => {
	try {
		// an update from a handler of one of these waits at the end of the list
		for (
			let update = heldUpdates?.shift();
			update;
			update = heldUpdates?.shift()
		) {
			apply(update);
		}
	} finally {
		heldUpdates = undefined;
	}
};

/**
 * Applies `update` now, or in a microtask if an event is being delivered. A
 * recognizer delivers the start of a gesture before it listens for its end, so
 * an update applied during the delivery would miss the end. The updates made
 * until the microtask wait too, so that they apply in order. An update that an
 * update makes, as a `Recognizable` for its recognizers, applies with it.
 */
export const scheduleUpdate = (update: () => void) => {
	if (!deliveries && (applying || !heldUpdates)) {
		apply(update);

		return;
	}

	if (!heldUpdates) {
		heldUpdates = [];
		queueMicrotask(applyHeldUpdates);
	}

	heldUpdates.push(update);
};

/**
 * Shares `events$`. It calls `beforeEach` on each event, then delivers it to
 * every subscriber, while `scheduleUpdate` holds back the updates.
 */
export const shareDelivered =
	<T>(beforeEach: (event: T) => void = () => {}) =>
	(events$: Observable<T>) =>
		new Observable<T>((subscriber) =>
			events$.subscribe({
				next: (event) => {
					deliveries++;

					try {
						beforeEach(event);
						subscriber.next(event);
					} finally {
						deliveries--;
					}
				},
				error: (error) => subscriber.error(error),
				complete: () => subscriber.complete(),
			}),
		).pipe(share());
