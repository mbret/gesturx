# gesturx

[![npm](https://img.shields.io/npm/v/gesturx)](https://www.npmjs.com/package/gesturx)
[![license](https://img.shields.io/npm/l/gesturx)](https://github.com/mbret/gesturx/blob/main/LICENSE)

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
const tap = new TapRecognizer({
	options: { maxTaps: 3 },
	failWith: [pan],
});

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

gesturx sets no style on a container. Give it `touch-action: none` from your CSS. Without it, the browser scrolls or zooms on touch screens, and cancels the pointer events. Add `user-select: none` if a drag must not select text.

```css
#app {
	touch-action: none;
}
```

Recognition starts when `events$` has a subscriber and a container is set. It stops when you unsubscribe, or when you set `container: null`.

## Recognizable

A `Recognizable` puts several recognizers on one element.

```ts
import { HoldRecognizer, Recognizable, SwipeRecognizer } from "gesturx";

const recognizable = new Recognizable({
	container: document.getElementById("app")!,
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
- `update({ container })` sets the element on all its recognizers, and `update({ container: null })` detaches them. Set the options of each recognizer on the recognizer itself.
- Give each recognizer to one `Recognizable` only, because each `Recognizable` writes its config to its recognizers.
- Overlapping elements with their own recognizers can recognize the same gesture.

## Recognizers

A recognizer also works alone, on any element. Its container needs `touch-action: none` too, as [Quick start](#quick-start) says.

```ts
import { PanRecognizer } from "gesturx";

const card = document.getElementById("card")!;
card.style.touchAction = "none";

const pan = new PanRecognizer({ container: card });

const subscription = pan.events$.subscribe((event) => {
	if (event.type === "panMove") {
		card.style.transform = `translate(${event.deltaX}px, ${event.deltaY}px)`;
	}
});

// to stop recognizing
subscription.unsubscribe();
```

The other examples in this README use a recognizer alone, and expect `touch-action: none` on the container from your CSS.

Every recognizer takes the same config in its constructor and in `update()`:

| Key | Meaning |
| --- | --- |
| `container` | The element to listen on. `null` detaches the recognizer. |
| `options` | The options of the recognizer, listed in its section below. |
| `failWith` | Recognizers that block this one while they run. See [failWith](#failwith). |
| `afterEventReceived` | A function that changes each pointer event before the recognizer reads it. The recognizer tells a release from the event that the browser gave. |

Every recognizer has:

- `events$`: its events. A subscription starts the recognition.
- `state$`: `{ fingers }`, the fingers of the gesture it recognizes, from its start event to its end event. It is 0 at other times, and it stays 0 for a tap or a swipe.
- `running$`: `true` while it recognizes a gesture, as `state$` tells. See [failWith](#failwith).
- `update(config)`: see [Updating a recognizer](#updating-a-recognizer).

Only the primary button starts a gesture: a finger, a pen tip or a left click. A right click, a middle click or a pen eraser starts nothing.

A recognizer follows a pointer pressed in its container until its release, also outside the container. It listens to the `pointerdown`, `pointermove`, `pointerup` and `pointercancel` of that pointer on the document, in the capture phase, before any element does. An element that stops their propagation doesn't hide them. To hide a press from a recognizer, stop the propagation of its `pointerdown` in an element of the container.

The distance thresholds below are measured on each axis: a finger passes a 15 px threshold when it moves 15 px on the x axis or on the y axis.

### Tap

`TapRecognizer` emits `tap` when fingers press and release quickly. `taps` counts the presses.

| Option | Default | Meaning |
| --- | --- | --- |
| `maxTaps` | `1` | The most taps in one gesture. A gesture with more taps is ignored. |
| `multiTapThreshold` | `300` ms with `maxTaps` of 2 or more, `0` otherwise | The time to wait after a release for one more press. |
| `maximumPressTime` | `150` ms | A press held longer cancels the gesture. |
| `tolerance` | `10` px | A press that moves farther than this from the first press cancels the gesture. |

Two fingers down at the same time cancel the gesture too. With `maxTaps` of 2 or more, every `tap` comes `multiTapThreshold` after the last release, a double tap too.

```ts
import { TapRecognizer } from "gesturx";

const tap = new TapRecognizer({
	container: document.getElementById("app")!,
	options: { maxTaps: 2 },
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
	photo.style.transform = `scale(${scale})`;
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
	dial.style.transform = `rotate(${angle}deg)`;
});
```

### Swipe

`SwipeRecognizer` emits `swipe` when a finger lifts after a fast move.

| Option | Default | Meaning |
| --- | --- | --- |
| `escapeVelocity` | `0.9` px/ms | The speed on the x axis or the y axis that the finger must have when it lifts. |

The speed is measured over the last 100 ms before the finger lifts. A finger that stops for more than 40 ms before it lifts has a speed of 0, so a fast move that stops is no swipe. The event adds `angle`, the direction from the press to the release in degrees: 0 is right, 90 is down, -90 is up, and 180 or -180 is left. `velocityX` and `velocityY` give the speed when the finger lifts.

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
| `delay` | `0` ms | The time that the fingers stay pressed before the hold starts. It counts from the press, or from the threshold when `posThreshold` is set. A release in that time cancels the hold. Moving doesn't cancel it. |
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
| `event` | The `PointerEvent` that caused it. For a tap, the last press. |
| `pointers` | The latest `PointerEvent` of each finger that is still pressed. An end event leaves out the finger that lifted, so a one-finger `panEnd` has none. A tap has its last press. |
| `center` | The center of the fingers, `{ x, y }`, in client coordinates. |
| `deltaX`, `deltaY` | The distance that the center moved since the start event, in px. They are 0 at the start event, which comes after the threshold. A finger that touches or lifts doesn't change them. |
| `velocityX`, `velocityY` | `deltaX` and `deltaY` divided by `delay`, in px/ms. They can be negative. A swipe gives the speed when the finger lifts instead. |
| `delay` | The time since the start event, in ms. |
| `startTime` | The time of the start event, from `Date.now()`. |
| `deltaPointersAngle` | The angle that the fingers turned since the previous event, in degrees. It is 0 when the number of fingers changed. |
| `pointersAverageDistance` | The average distance between two fingers, over all pairs, in px. |

A tap is one event, so its `startTime` is the time it is reported, and its `delay`, deltas and velocities are 0.

The package exports the types of the events (`TapEvent`, `PanEvent`, `PinchEvent`, `RotateEvent`, `SwipeEvent`, `HoldEvent` and their base `RecognizerEvent`), of the options (`TapRecognizerOptions` and the others), and `RecognizableState`.

## failWith

`failWith` blocks a recognizer while other recognizers run:

- It doesn't start a gesture while one of them runs. That gesture is dropped, not delayed.
- If one of them starts during its gesture, the gesture stops. A pan, a pinch, a rotation or a hold emits its end event, before the start event of the recognizer that stopped it. A tap or a swipe emits nothing.

`failWith` accepts a recognizer, or any object with a `running$` observable. `running$` emits whether the source runs: its current value when subscribed, then each change. A `BehaviorSubject` does that:

```ts
import { BehaviorSubject } from "rxjs";
import { PanRecognizer } from "gesturx";

const dialogOpen$ = new BehaviorSubject(false);

const pan = new PanRecognizer({
	container: document.getElementById("app")!,
	failWith: [{ running$: dialogOpen$ }],
});

pan.events$.subscribe(({ type }) => {
	console.log(type);
});

// no pan from here
dialogOpen$.next(true);
// pans again from here
dialogOpen$.next(false);
```

- A source that emits nothing when subscribed counts as not running until it emits. So a plain `Subject` misses a source that started before.
- The `running$` of a recognizer is `true` from its start event to its end event, or until the last subscriber of its `events$` leaves.
- The `running$` of a tap or a swipe stays `false`, so it never blocks. For a single tap that waits for a double tap, use one `TapRecognizer` with `maxTaps: 2` and read `taps`.
- A recognizer runs only while it has a subscriber, so subscribe to a recognizer that you put in a `failWith` list. A `Recognizable` subscribes to all its recognizers while its `events$` has a subscriber.
- A recognizer reads its `failWith` sources while it has a subscriber, and lets go of them with its last subscriber. A `TapRecognizer` reads them at each press.

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

- The options that you don't pass keep their values. `options: undefined` keeps all of them.
- An option passed as `undefined` or `NaN` keeps its value too.
- `container`, `failWith` or `afterEventReceived` passed as `undefined` keep their values. Pass `container: null` to detach the recognizer, and `failWith: []` to remove `failWith`.
- A gesture keeps the options it had when its fingers pressed. New options apply from the next gesture.
- A new `afterEventReceived` applies from the next pointer event, also during a gesture.
- A new `container` moves the listeners to the new element, and `null` removes them. Both end the gesture in progress:
  - A pan, a pinch, a rotation or a hold emits its end event. Its `event` is the latest pointer event, and its `pointers` has the fingers that are still pressed.
  - A tap or a swipe in progress emits nothing.
- While a recognizer delivers an event, or reports its fingers in `state$` and `running$`, every `update()` waits, of any recognizer or `Recognizable`. It applies in a microtask, after every subscriber gets the event, and the later `update()` calls apply after it, in order. So a new `container` from a start handler ends the gesture after its start event. An `update()` from the handler of an event that an `update()` causes, as an end event, applies right after that `update()`. Outside the handlers, `update()` applies at once, unless an `update()` from a handler still waits: it then applies after it.

## Custom gestures

To make a gesture of your own, extend `Recognizer`. The second argument of `super()` sets `numInputs`, `posThreshold` and `delay` for the gesture that the base class follows. The base class gives you protected members:

- `panStart$`, `panMove$` and `panEnd$`: that gesture, as `RecognizerEvent`s. `pan$` has all of them, with a `type` of `start`, `move` or `end`.
- `pointerEvent$`: each press of the primary button in the container, then the events of its pointer until its release, also outside the container.
- `pointerOff$`: the releases in `pointerEvent$`. A release is a `pointerup`, a `pointercancel`, a `contextmenu`, or a mouse or pen `pointermove` with no button pressed.
- `pointerDown$`, `pointerMove$`, `pointerUp$` and `pointerCancel$`: the events of `pointerEvent$` with that type. `pointerMove$` leaves out the releases.
- `failWithActive$`: `true` while one of the `failWith` sources runs. The streams above ignore `failWith`, so drop your events while it is `true`.
- `reportFingers(isEnd)`: an operator for your `events$` that reports the fingers of its events in `state$`, until an event for which `isEnd` returns `true`. It shares the events. Without it, `state$` stays 0 and `running$` stays `false`.

The events of `pan$`, and the events that `reportFingers` shares, hold back an `update()` from their handlers, as [Updating a recognizer](#updating-a-recognizer) says. An `update()` from a handler of other events, as from `pointerEvent$` alone, applies at once.

```ts
import { filter, map, type Observable, withLatestFrom } from "rxjs";
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
			withLatestFrom(this.failWithActive$),
			filter(([, failWithActive]) => !failWithActive),
			map(([event]) => ({ ...event, type: "twoFingerDrag" as const })),
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

The browser sends `pointercancel` when it takes over a pointer, for example to start the native drag of an image. The coordinates of that event can be hundreds of pixels away from the fingers. When a gesture ends with a `pointercancel`, its end event references it, but `deltaX` and `deltaY` stay as they were in the previous event. `center`, and the `angle` of a swipe, do use its coordinates.

### contextmenu

A `contextmenu` event ends the gesture of its pointer, as a `pointerup` does, but a tap fails. A right click opens the context menu, and so can a long press on a touch screen. An element that stops the propagation of `contextmenu` keeps the gesture running.

### Missed release

If the page doesn't receive the `pointerup` of a mouse or a pen, the next move of that pointer with no button pressed ends its gesture, and a tap fails. The end event references that `pointermove`. As for a `pointercancel`, `deltaX` and `deltaY` stay as they were in the previous event. A new press of that pointer ends the gesture as a `pointercancel` does, then starts a new one.

So each move of a pressed mouse or pen must have its `buttons`, as in a browser. Set `buttons` in the mouse and pen events that your tests dispatch.

## License

MIT, by [mbret](https://github.com/mbret).
