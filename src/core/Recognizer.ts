import { Observable, ReplaySubject } from "rxjs"
import { getCenterFromEvent } from "./utils"

type InitializedWith = {
  container: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}

export interface RecognizerOptions {
  failWith?: { start$: Observable<unknown> }[]
}

export interface RecognizerEvent {
  center: { x: number; y: number }
  srcEvent: PointerEvent
}

export class Recognizer {
  initializedWithSubject = new ReplaySubject<InitializedWith>()

  initialize(initializedWith: {
    container: HTMLElement
    afterEventReceived?: (event: PointerEvent) => PointerEvent
  }) {
    this.initializedWithSubject.next(initializedWith)
  }

  mapToFinalEvent<T extends { srcEvent: PointerEvent }>(event: T) {
    return {
      ...event,
      center: getCenterFromEvent(event.srcEvent),
    }
  }
}
