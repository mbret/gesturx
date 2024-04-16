export type GestureEvent = {
  srcEvent: PointerEvent;
};

export type RecognizerInstanceParams = {
  container: HTMLElement;
  afterEventReceived?: (event: PointerEvent) => PointerEvent;
};
