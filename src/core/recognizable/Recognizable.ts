import {
  Observable,
  ObservedValueOf,
  combineLatest,
  map,
  merge,
  share,
} from "rxjs"
import { Recognizer, RecognizerConfig } from "../recognizer/Recognizer"
import {
  RecognizableInterface,
  RecognizableState,
} from "./RecognizableInterface"

export class Recognizable<T extends Recognizer<any, any>[]>
  implements RecognizableInterface<T>
{
  events$: Observable<ObservedValueOf<T[number]["events$"]>>

  recognizers: T

  state$: Observable<RecognizableState>

  constructor(
    protected options: {
      recognizers: T
    } & RecognizerConfig<unknown>,
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

    this.update(options)
  }

  public update(options: RecognizerConfig<unknown>) {
    if (options.container) {
      /**
       * We have to disable touch-action otherwise every events will be followed
       * by a cancel event since the browser will try to handle touch.
       * @see https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
       */
      options.container.style.touchAction = `none`

      /**
       *  Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
       */
      options.container.style.userSelect = `none`
    }

    this.options.recognizers.forEach((recognizer) => {
      recognizer.update(options)
    })
  }
}
