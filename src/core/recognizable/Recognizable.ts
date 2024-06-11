import { combineLatest, map, merge, share } from "rxjs"
import { Recognizer } from "../recognizer/Recognizer"
import { RecognizableInterface } from "./RecognizableInterface"

export class Recognizable<T extends Recognizer<any, any>[]>
  implements RecognizableInterface<T>
{
  public readonly events$
  public readonly recognizers
  public readonly state$

  constructor(
    protected options: {
      recognizers: T
      afterEventReceived?: (event: PointerEvent) => PointerEvent
    },
  ) {
    this.recognizers = options.recognizers
    this.events$ = merge(
      ...options.recognizers.map((recognizer) => recognizer.events$),
    ).pipe(share())

    this.state$ = combineLatest(
      this.recognizers.map((recognizer) => recognizer.state$),
    ).pipe(
      map((states) =>
        states.reduce((acc, state) => ({
          fingers: Math.max(acc.fingers, state.fingers),
        })),
      ),
    )
  }

  public initialize(container: HTMLElement) {
    /**
     * We have to disable touch-action otherwise every events will be followed
     * by a cancel event since the browser will try to handle touch.
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
     */
    container.style.touchAction = `none`

    /**
     *  Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
     */
    container.style.userSelect = `none`

    this.options.recognizers.forEach((recognizer) => {
      recognizer.initialize({
        container,
        afterEventReceived: this.options.afterEventReceived,
      })
    })
  }
}
