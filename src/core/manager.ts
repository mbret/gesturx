import { map, merge } from "rxjs";
import { createTapRecognizer } from "./tapRecognizer";
import { getCenterFromEvent } from "./utils";

export const createManager = ({
  container,
  afterEventReceived = (event) => event,
  recognizers,
}: {
  container: HTMLElement;
  recognizers: ReturnType<typeof createTapRecognizer>[];
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

  const recognizerInstances = recognizers.map((recognizer) =>
    recognizer({ container, afterEventReceived }),
  );

  const events$ = merge(
    ...recognizerInstances.map((recognizer) => recognizer.events$),
  ).pipe(
    map((event) => ({
      ...event,
      center: getCenterFromEvent(event.srcEvent),
    })),
  );

  return { events$ };
};
