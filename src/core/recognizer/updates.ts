import { Observable, share } from "rxjs";

/** How many deliveries of events run, nested ones included. */
let deliveries = 0;
/** How many updates apply, nested ones included. */
let applying = 0;
/** The updates that wait for the microtask, in order. */
let heldUpdates: (() => void)[] | undefined;
/**
 * Where an update that the applying update causes goes in `heldUpdates`:
 * right after it, and after the ones it caused before.
 */
let insertAt = 0;

/** Reports `error` as uncaught, without stopping the code that caught it. */
const report = (error: unknown) => {
	if (typeof reportError === "function") {
		reportError(error);
	} else {
		setTimeout(() => {
			throw error;
		});
	}
};

const apply = (update: () => void) => {
	applying++;

	try {
		update();
	} finally {
		applying--;
	}
};

const applyHeldUpdates = () => {
	for (
		let update = heldUpdates?.shift();
		update;
		update = heldUpdates?.shift()
	) {
		insertAt = 0;

		// the next updates apply, whatever this one throws
		try {
			apply(update);
		} catch (error) {
			report(error);
		}
	}

	heldUpdates = undefined;
};

/**
 * Applies `update` now, or in a microtask if an event is being delivered. A
 * recognizer delivers the start of a gesture before it listens for its end, so
 * an update applied during the delivery would miss the end. The updates made
 * until the microtask wait too, so that they apply in order.
 *
 * An update that an update makes, as a `Recognizable` for its recognizers,
 * applies with it. An update that an update causes, as from the handler of
 * the end event it causes, applies right after it.
 */
export const scheduleUpdate = (update: () => void) => {
	if (!deliveries && (applying || !heldUpdates)) {
		apply(update);

		return;
	}

	if (!heldUpdates) {
		heldUpdates = [];
		insertAt = 0;
		queueMicrotask(applyHeldUpdates);
	}

	if (applying) {
		heldUpdates.splice(insertAt++, 0, update);
	} else {
		heldUpdates.push(update);
	}
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
						try {
							beforeEach(event);
						} catch (error) {
							subscriber.error(error);

							return;
						}

						subscriber.next(event);
					} finally {
						deliveries--;
					}
				},
				error: (error) => subscriber.error(error),
				complete: () => subscriber.complete(),
			}),
		).pipe(share());
