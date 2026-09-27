# Swipe

A swipe is detected when the user touches the screen and moves in a relatively increasing velocity, leaving the screen at some point before it drops below a certain velocity.

#### API

[Visit the API here](https://github.com/mbret/gesturx/blob/main/src/core/swipe/SwipeRecognizerInterface.ts)

#### Example

```typescript
new SwipeRecognizer({
  escapeVelocity: 1,
});
```

