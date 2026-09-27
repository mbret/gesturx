# Pan

A pan is detected when the user touches the screen and moves about the area.

Typically used to move elements around the screen.

**This recognizer is a basic wrapper around the `Recognizer` abstract class which all other recognizer inherit. This is because pan is the source of all gestures. It simply track the first touch to the last release and the moving in between.**

#### API

[Visit the API here](https://github.com/mbret/gesturx/blob/main/src/core/pan/PanRecognizerInterface.ts)

#### Example

```typescript
new PanRecognizer({
  numInputs: 2
})
```
