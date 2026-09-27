# Recognizers

The core idea of the library is to create a `Recognizable` element and attach several `Recognizer` to it.

Each gestures you want to detect has or can have a `Recognizer` (`TapRecognizer`, `PinchRecognizer`, etc). You simply pass them to the `Recognizable` instance and they will work automatically.

```typescript
const recognizable = new Recognizable({
  recognizers: [
    new TapRecognizer(),
    new RotateRecognizer()
  ]
})
```

You should not reuse the same instances in different `Recognizable` since they will each overwrite the previous configuration.

When needed you can create your own `Recognizer` by extending `AbstractPanRecognizer`. You can check the codebase to have an idea how to use it.

### `failWith` option

Every recognizer has an option `failWith` option which can be used to explicitely cancel or fail a gesture. A good example is cancelling a tap if we detect a pan gesture. Ideally you would be able to configure your `TapRecognizer` correctly but if you have a pan recognizer and want to make sure you never have conflict, you can use it like this:

```typescript
const panRecognizer = new PanRecognizer()
const tapRecognizer = new TapRecognizer({
  maxTaps: 3,
  failWith: [panRecognizer]
})
```

In this scenario you are sure to not detect a tap gesture while having a pan gesture started. See this as double security in some cases.

### `RecognizerEvent`

Every core recognizer extends the class `Recognizer`. As a result, every event output share the same base properties. Specific recognizer may or may not add specific properties to their gestures.

You can find the [RecognizerEvent definition here](https://github.com/mbret/gesturx/blob/main/src/core/recognizer/RecognizerEvent.ts)

### Default Options

The default options are configured to match the most common use case.

For example the tap recogniser will recognise up to 2 taps and the pan recogniser will only start registering gesture when the fingers start moving a reasonable threshold.

You will most likely be fine with the default settings but if you need to adjust some values remember you can tinker with the options on the [demo](https://gesturx.vercel.app/) as well.
