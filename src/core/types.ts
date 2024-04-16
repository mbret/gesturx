import { Observable } from "rxjs";

export type GestureEvent = {
  srcEvent: PointerEvent;
};

export type RecognizerParams = {
  failWith?: { start$: Observable<unknown> }[];
};

export type RecognizerInstanceParams = {
  container: HTMLElement;
  afterEventReceived?: (event: PointerEvent) => PointerEvent;
};
