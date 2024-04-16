import { map, merge } from "rxjs";
import { TapRecognizer } from "./TapRecognizer";
import { getCenterFromEvent } from "./utils";
import { PanRecognizer } from "./PanRecognizer";

export const createManager = ({
  container,
  afterEventReceived = (event) => event,
  recognizers,
}: {
  container: HTMLElement;
  recognizers: (TapRecognizer | PanRecognizer)[];
  afterEventReceived?: (event: PointerEvent) => PointerEvent;
}) => {
  // user api
  // const dragRecognizer = createPanRecognizer();
  // const singleTapRecognizer = createTapRecognizer({
  //   maxTaps: 2,
  //   failWith: [dragRecognizer],
  // });
  // const pinchRecognizer = createPinchRecognizer();

  // internal api
  // dragRecognizer.initialize({ container, afterEventReceived });

  // const recognizers = [
  //   singleTapRecognizer({ container, afterEventReceived }),
  //   // pinchRecognizer({ container, afterEventReceived }),
  //   // dragRecognizer,
  // ]

  recognizers.forEach((recognizer) => {
    recognizer.initialize({ container, afterEventReceived });
  });

  const events$ = merge(
    ...recognizers.map((recognizer) => recognizer.events$),
  ).pipe(
    map((event) => ({
      ...event,
      center: getCenterFromEvent(event.srcEvent),
    })),
  );

  return { events$ };
};
