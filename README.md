# gesturx

[![npm](https://img.shields.io/npm/v/gesturx)](https://www.npmjs.com/package/gesturx)
[![license](https://img.shields.io/npm/l/gesturx)](LICENSE)

Gesture recognition for the browser, built on [rxjs](https://rxjs.dev). gesturx turns the pointer events of touch, mouse and pen into taps, pans, pinches, rotations, swipes and holds.

Try the gestures in the [demo](https://gesturx.vercel.app/).

- [Installation](#installation)
- [Quick start](#quick-start)
- [Recognizable](#recognizable)
- [Recognizers](#recognizers): [Tap](#tap), [Pan](#pan), [Pinch](#pinch), [Rotate](#rotate), [Swipe](#swipe), [Hold](#hold)
- [Events](#events)
- [failWith](#failwith)
- [Updating a recognizer](#updating-a-recognizer)
- [Custom gestures](#custom-gestures)
- [Notes](#notes)
- [Known limitations](#known-limitations)

## Installation

```bash
npm install gesturx rxjs
```

- rxjs 7 is a peer dependency. If your app doesn't use rxjs yet, it adds rxjs to your bundle.
- gesturx is published as ES modules only.
- It needs a browser with Pointer Events. The build targets Chrome 87, Edge 88, Firefox 78 and Safari 14.

## Quick start

```ts
import { PanRecognizer, Recognizable, TapRecognizer } from "gesturx";

const pan = new PanRecognizer();
// no tap is recognized while a pan runs
const tap = new TapRecognizer({ options: { maxTaps: 3 }, failWith: [pan] });

const recognizable = new Recognizable({ recognizers: [pan, tap] });

recognizable.events$.subscribe(({ event }) => {
	if (event.type === "tap") {
		console.log(`${event.taps} taps`);
	}

	if (event.type === "panMove") {
		console.log(`moved ${event.deltaX}px, ${event.deltaY}px`);
	}
});

recognizable.update({ container: document.getElementById("app")! });
```

Recognition starts when `events$` has a subscriber and a container is set. It stops when you unsubscribe.

## Recognizable

A `Recognizable` puts several recognizers on one element.

```ts
import { HoldRecognizer, Recognizable, SwipeRecognizer } from "gesturx";

const recognizable = new Recognizable({
	container: document.getElementById("app")!,
	disableTextSelection: true,
	recognizers: [new SwipeRecognizer(), new HoldRecognizer()],
});

const subscription = recognizable.events$.subscribe(({ event, recognizer }) => {
	console.log(event.type, recognizer);
});

recognizable.state$.subscribe(({ fingers }) => {
	console.log(`${fingers} fingers`);
});

// to stop recognizing
subscription.unsubscribe();
```

- `events$` emits `{ event, recognizer }` for the events of all its recognizers.
- `state$` emits `{ fingers }`: the most fingers that one of its recognizers recognizes at that moment.
- `update({ container })` sets the element on all its recognizers. Set the options of each recognizer on the recognizer itself.
- When it gets a container, it sets `touch-action: none` on it. Without that, the browser handles touch gestures itself and cancels the pointer events.
- `disableTextSelection: true` also sets `user-select: none` on the container.
- Give each recognizer to one `Recognizable` only, because each `Recognizable` writes its config to its recognizers.
- Overlapping elements with their own recognizers can recognize the same gesture.

## Recognizers

A recognizer also works alone, on any element:

```ts
import { PanRecognizer } from "gesturx";

const card = document.getElementById("card")!;
// a Recognizable sets this for you
card.style.touchAction = "none";

const pan = new PanRecognizer({ container: card });

const subscription = pan.events$.subscribe((event) => {
	if (event.type === "panMove") {
		card.style.translate = `${event.deltaX}px ${event.deltaY}px`;
	}
});

// to stop recognizing
subscription.unsubscribe();
```

Every recognizer takes the same config in its constructor and in `update()`:

| Key | Meaning |
| --- | --- |
| `container` | The element to listen on. |
| `options` | The options of the recognizer, listed in its section below. |
| `failWith` | Recognizers that block this one while they run. See [failWith](#failwith). |
| `afterEventReceived` | A function that changes each pointer event before the recognizer reads it. |

Every recognizer has:

- `events$`: its events. A subscription starts the recognition.
- `state$`: `{ fingers }`, the fingers of the gesture it recognizes, from its start event to its end event. It is 0 at other times, and it stays 0 for a tap or a swipe.
- `update(config)`: see [Updating a recognizer](#updating-a-recognizer).

Only the primary button starts a gesture: a finger, a pen tip or a left click. A right click, a middle click or a pen eraser starts nothing.

### Tap

`TapRecognizer` emits `tap` when fingers press and release quickly. `taps` counts the presses.

| Option | Default | Meaning |
| --- | --- | --- |
| `maxTaps` | `1` | The most taps in one gesture. A gesture with more taps is ignored. |
| `multiTapThreshold` | `100 * (maxTaps - 1)` ms | The time to wait after a release for one more press. |
| `maximumPressTime` | `150` ms | A press held longer cancels the gesture. |
| `tolerance` | `10` px | A press that moves farther than this from the first press cancels the gesture. |

Two fingers down at the same time cancel the gesture too. With `maxTaps` of 2 or more, a single tap is reported only after `multiTapThreshold`.

```ts
import { TapRecognizer } from "gesturx";

const tap = new TapRecognizer({
	container: document.getElementById("app")!,
	options: { maxTaps: 2, multiTapThreshold: 300 },
});

tap.events$.subscribe(({ taps }) => {
	console.log(taps === 2 ? "double tap" : "single tap");
});
```

### Pan

`PanRecognizer` follows fingers that press and move. It emits `panStart`, then `panMove` at each move, then `panEnd`.

| Option | Default | Meaning |
| --- | --- | --- |
| `posThreshold` | `15` px | The distance that a finger moves before the pan starts. |
| `delay` | `0` ms | The time to wait after the threshold before the pan starts. A release in that time cancels the pan. |
| `numInputs` | `1` | The fingers it needs. The pan ends when fewer fingers stay pressed. |

```ts
import { PanRecognizer } from "gesturx";

const pan = new PanRecognizer({
	container: document.getElementById("app")!,
	options: { numInputs: 2 },
});

pan.events$.subscribe(({ type, deltaX, deltaY }) => {
	console.log(type, deltaX, deltaY);
});
```

### Pinch

`PinchRecognizer` follows two or more fingers that move closer or apart. It emits `pinchStart`, `pinchMove` and `pinchEnd`.

| Option | Default | Meaning |
| --- | --- | --- |
| `posThreshold` | `0` px | The distance that a finger moves before the pinch starts. At 0, the pinch starts when the second finger touches. |

Its events add these fields:

| Field | Meaning |
| --- | --- |
| `scale` | The average distance between the fingers, divided by the one at the start. |
| `distance` | The change in that average distance since the start, in px. |
| `deltaDistance` | The change in distance since the previous event, in px. |
| `deltaDistanceScale` | The change in scale since the previous event. Their product over the pinch is `scale`. |

A finger that touches or lifts during a pinch doesn't change `scale` or `distance`.

```ts
import { PinchRecognizer } from "gesturx";

const photo = document.getElementById("photo")!;
const pinch = new PinchRecognizer({ container: photo });

pinch.events$.subscribe(({ scale }) => {
	photo.style.scale = `${scale}`;
});
```

### Rotate

`RotateRecognizer` follows two or more fingers that turn around their center. It emits `rotateStart`, `rotateMove` and `rotateEnd`.

| Option | Default | Meaning |
| --- | --- | --- |
| `posThreshold` | `15` px | The distance that a finger moves before the rotation starts. |
| `numInputs` | `2` | The fingers it needs. A value lower than 2 doesn't work. |

The rotation starts when a finger has moved `posThreshold`, even if the fingers don't turn. A pinch therefore starts a rotation too, with an `angle` near 0.

Its events add `angle`, the angle turned since the start, and `deltaAngle`, the angle turned since the previous event. Both are in degrees, and a positive angle is clockwise on the screen.

```ts
import { RotateRecognizer } from "gesturx";

const dial = document.getElementById("dial")!;
const rotate = new RotateRecognizer({ container: dial });

rotate.events$.subscribe(({ angle }) => {
	dial.style.rotate = `${angle}deg`;
});
```

### Swipe

`SwipeRecognizer` emits `swipe` when a finger lifts after a fast move.

| Option | Default | Meaning |
| --- | --- | --- |
| `escapeVelocity` | `0.9` px/ms | The speed on the x axis or the y axis that the move must reach. |

The speed is the average speed from the press to the release. The event adds `angle`, the direction from the press to the release in degrees: 0 is right, 90 is down, -90 is up, and 180 or -180 is left. `velocityX` and `velocityY` give the speed.

```ts
import { SwipeRecognizer } from "gesturx";

const swipe = new SwipeRecognizer({
	container: document.getElementById("app")!,
});

swipe.events$.subscribe(({ angle }) => {
	if (Math.abs(angle) <= 45) {
		console.log("right");
	} else if (Math.abs(angle) >= 135) {
		console.log("left");
	} else {
		console.log(angle > 0 ? "down" : "up");
	}
});
```

### Hold

`HoldRecognizer` emits `holdStart` when fingers press, and `holdEnd` when they lift.

| Option | Default | Meaning |
| --- | --- | --- |
| `delay` | `0` ms | The time that the fingers stay pressed before the hold starts. A release in that time cancels the hold. Moving doesn't cancel it. |
| `numInputs` | `1` | The fingers it needs. The hold ends when fewer fingers stay pressed. |
| `posThreshold` | `0` px | The distance that a finger moves before the hold starts. |

```ts
import { HoldRecognizer } from "gesturx";

const hold = new HoldRecognizer({
	container: document.getElementById("app")!,
	options: { delay: 500 },
});

hold.events$.subscribe(({ type }) => {
	console.log(type === "holdStart" ? "long press" : "released");
});
```

## Events

The events of every recognizer have these fields:

| Field | Meaning |
| --- | --- |
| `type` | The name of the event, for example `panMove`. |
| `event` | The `PointerEvent` that caused it. |
| `pointers` | The latest `PointerEvent` of each finger in the gesture. |
| `center` | The center of the fingers, `{ x, y }`, in client coordinates. |
| `deltaX`, `deltaY` | The distance that the center moved since the gesture started, in px. |
| `velocityX`, `velocityY` | `deltaX` and `deltaY` divided by `delay`, in px/ms. They can be negative. |
| `delay` | The time since the gesture started, in ms. |
| `startTime` | The time when the gesture started, from `Date.now()`. |
| `deltaPointersAngle` | The angle that the fingers turned since the previous event, in degrees. It is 0 when the number of fingers changed. |
| `pointersAverageDistance` | The average distance between two fingers, over all pairs, in px. |

The package exports the types of the events (`TapEvent`, `PanEvent`, `PinchEvent`, `RotateEvent`, `SwipeEvent`, `HoldEvent` and their base `RecognizerEvent`), of the options (`TapRecognizerOptions` and the others), and `RecognizableState`.

## failWith

`failWith` blocks a recognizer while other recognizers run:

- It doesn't start a gesture while one of them runs. That gesture is dropped, not delayed.
- If one of them starts during its gesture, the gesture stops. A pan, a pinch, a rotation or a hold emits its end event. A tap or a swipe emits nothing.

`failWith` accepts a `PanRecognizer`, a `PinchRecognizer`, a `RotateRecognizer`, a `HoldRecognizer`, or any object with `start$` and `end$` observables. A source runs from a value of `start$` to a value of `end$`:

```ts
import { Subject } from "rxjs";
import { PanRecognizer } from "gesturx";

const dialogOpened$ = new Subject<void>();
const dialogClosed$ = new Subject<void>();

const pan = new PanRecognizer({
	container: document.getElementById("app")!,
	failWith: [{ start$: dialogOpened$, end$: dialogClosed$ }],
});

pan.events$.subscribe(({ type }) => {
	console.log(type);
});

// no pan from here
dialogOpened$.next();
// pans again from here
dialogClosed$.next();
```

A recognizer subscribes to its `failWith` sources when it gets a subscriber. A recognizer in a `failWith` list therefore recognizes gestures, even without a subscriber of its own.

## Updating a recognizer

`update()` changes the config of a recognizer at any time:

```ts
import { PanRecognizer } from "gesturx";

const pan = new PanRecognizer({ container: document.getElementById("app")! });

pan.events$.subscribe(({ type }) => {
	console.log(type);
});

// the other options stay as they are
pan.update({ options: { posThreshold: 30 } });
```

- The options that you don't pass keep their values.
- An option passed as `undefined` or `NaN` keeps its value too.
- `failWith` or `afterEventReceived` passed as `undefined` keep their values. Pass `failWith: []` to remove `failWith`.
- A new `container` moves the listeners to the new element.

## Custom gestures

To make a gesture of your own, extend `Recognizer`. The second argument of `super()` sets `numInputs`, `posThreshold` and `delay` for the gesture that the base class follows. The base class gives you protected streams:

- `panStart$`, `panMove$` and `panEnd$`: that gesture, as `RecognizerEvent`s.
- `pointerEvent$`, `pointerDown$`, `pointerMove$`, `pointerUp$` and `pointerCancel$`: the pointer events of the container.
- `failWithActive$`: `true` while one of the `failWith` sources runs.

```ts
import { map, type Observable } from "rxjs";
import {
	Recognizer,
	type RecognizerConfig,
	type RecognizerEvent,
} from "gesturx";

interface TwoFingerDragEvent extends RecognizerEvent {
	type: "twoFingerDrag";
}

class TwoFingerDragRecognizer extends Recognizer<object, TwoFingerDragEvent> {
	public events$: Observable<TwoFingerDragEvent>;

	constructor(config?: RecognizerConfig<object>) {
		super(config, { numInputs: 2, posThreshold: 10 });

		this.events$ = this.panMove$.pipe(
			map((event) => ({ ...event, type: "twoFingerDrag" as const })),
		);
	}
}

const drag = new TwoFingerDragRecognizer({
	container: document.getElementById("app")!,
});

drag.events$.subscribe(({ deltaX, deltaY }) => {
	console.log(deltaX, deltaY);
});
```

A `Recognizable` accepts a custom recognizer like the others. For a complete example, read [`SwipeRecognizer`](https://github.com/mbret/gesturx/blob/main/src/core/swipe/SwipeRecognizer.ts).

## Notes

### pointercancel

The browser sends `pointercancel` when it takes over a pointer, for example to start the native drag of an image. The coordinates of that event can be hundreds of pixels away from the fingers. When a gesture ends with a `pointercancel`, its end event references it, but `deltaX` and `deltaY` stay as they were in the previous event.

## Known limitations

- `update()` during a gesture drops the gesture without an end event ([#140](https://github.com/mbret/gesturx/issues/140)). A recognizer with that one in its `failWith` then stays blocked ([#152](https://github.com/mbret/gesturx/issues/152)).
- A recognizer keeps its `failWith` sources subscribed after you unsubscribe from it ([#151](https://github.com/mbret/gesturx/issues/151)).
- With `maxTaps: 2`, the default `multiTapThreshold` of 100 ms is short for a double tap at normal speed. Set it to about 300 ([#150](https://github.com/mbret/gesturx/issues/150)).
- A swipe checks the average speed of the move, not the speed at the release ([#141](https://github.com/mbret/gesturx/issues/141)).
- A `container` set to `undefined` or `null` doesn't detach a recognizer. Unsubscribe instead ([#154](https://github.com/mbret/gesturx/issues/154)).
- A mouse drag ends when the cursor leaves the container ([#156](https://github.com/mbret/gesturx/issues/156)).

## License

MIT, by [mbret](https://github.com/mbret).
