# Getting Started

## Installation

```bash
$ npm install gesturx rxjs
```

## Usage

```typescript
import { PanRecognizer, Recognizable, TapRecognizer } from "gesturx"

const panRecognizer = new PanRecognizer()

const recognizable = new Recognizable({
  /**
   * Register pan (moving) & taps.
   * We also make sure to prevent conflicts between pan & taps.
   */
  recognizers: [
    panRecognizer,
    new TapRecognizer({
      options: { maxTaps: 3 },
      failWith: [panRecognizer],
    })
  ],
})

recognizable.events$.subscribe(({ event }) => {
  if (event.type === `tap`) {
    console.log(`You clicked ${event.taps} times!`)
  }
})

recognizable.update({
  // The div you want to register gestures on
  container: document.getElementById("myPan")!,
})
```



