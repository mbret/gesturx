# Important Notes

## `pointercancel` Handling

When a gesture is ending with a **pointercancel** event, the gesture event will reference this native event but its values will not be used in calculations. Instead we will suppose the last values are the one from the previous event. Resulting in null deltas.

This is because `pointercancel` can and is usually dispatched after something else and therefore might lead to completely wrong and unsynced values. A good example is dragging an element.

Take this scenario: You start a swipe on top of an image that is draggable, the swipe will start, a drag event will start and a pointercancel event will be triggered. In this context, the `pointercancel` will hold very different values as the previous `pointermove` because it directly relate to the drag context itself as opposed to the initial pointers. The browser handle x,y coordinate very differently and there could be a delta of several hundreds pixels between the last two events.

This is an **opiniated** decision taken to make the library fully generic and agnostic. In reality, it should not impact you.

The benefit is that we do not force you to disable any behaviors to make it work.
