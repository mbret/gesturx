# Custom Gesture

If you need to make a custom gesture, whether it's expanding on an existing one or a completely different gesture you can extend any recognizer or the base `Recognizer` class. This will ensure compatibility with the recognizable instance.

You can look at the source code for all recognizers to help you in the task. The `Recognizer` base class has various `pan` observables which you can use to build your own gesture handler.

[Link to the base Recognizer to extends from](https://github.com/mbret/gesturx/blob/main/src/core/recognizer/Recognizer.ts)

[SwipeRecognizer](https://github.com/mbret/gesturx/blob/main/src/core/swipe/SwipeRecognizer.ts) is a good simple example of how to extends the base recognizer to add gestures. In this case a swipe.
