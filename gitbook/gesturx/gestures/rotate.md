# Rotate

A Rotate is detected when:

* the user has two or more inputs moving about a circle on the edges of a diameter.
* the user has one input moving in a circular motion around the center point of the bound target element.

#### API

[Visit the API here](https://github.com/mbret/gesturx/blob/main/src/core/rotate/RotateRecognizerInterface.ts)

#### Example

```typescript
new RotateRecognizer({
  posThreshold: 0
})
```

