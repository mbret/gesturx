import { Observable, ReplaySubject } from "rxjs"

type InitializedWith = {
  container: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}

export interface RecognizerOptions {
  failWith?: { start$: Observable<unknown> }[]
}

export class Recognizer {
  protected init$ = new ReplaySubject<InitializedWith>()

  initialize(initializedWith: {
    container: HTMLElement
    afterEventReceived?: (event: PointerEvent) => PointerEvent
  }) {
    this.init$.next(initializedWith)
  }
}
