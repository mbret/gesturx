# Recognizable

To start recognizing gestures on an element, wrap it with a `Recognizable` instance:

```typescript
const recognizable = new Recognizable({
  recognizers: [
    new TapRecognizer(),
    new RotateRecognizer()
  ]
})

recognizable.update({
  // The div you want to register gestures on
  container: document.getElementById("myPan")!,
})
```

The `Recognizable` instance will offer convenient methods to access all your events and also configure the element to be compatible with gestures.

You can create as many as you want but be careful when having elements overlapping each other. You may end up with conflicting gestures.

As soon as you update it with a valid container, the recognizers will start listening to events. You can update it whenever you want and change the container at any moment. Only one container per recognizable instance can be used however.

### API

Visit the [Recognizable API here](https://github.com/mbret/gesturx/blob/main/src/core/recognizable/RecognizableInterface.ts)
