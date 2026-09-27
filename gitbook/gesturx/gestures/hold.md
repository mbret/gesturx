# Hold

### A hold is detected when the user touches the screen without releasing it.

Usually not needed if you have other gestures such as pan setup but can be useful if you really just need to know wheter the user is holding or not the element (screen).

#### API

[Visit the API here](https://github.com/mbret/gesturx/blob/main/src/core/hold/HoldRecognizerInterface.ts)

#### Example

```typescript
new HoldRecognizer({
  numInputs: 2
})
```
