import { ReplaySubject } from "rxjs";

type InitializedWith = {
  container: HTMLElement;
  afterEventReceived?: (event: PointerEvent) => PointerEvent;
};

export class Recognizer {
  initializedWithSubject = new ReplaySubject<InitializedWith>();

  initialize(initializedWith: {
    container: HTMLElement;
    afterEventReceived?: (event: PointerEvent) => PointerEvent;
  }) {
    this.initializedWithSubject.next(initializedWith);
  }
}
