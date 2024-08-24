/* eslint-disable @typescript-eslint/no-unused-vars */
import { Observable, map, scan } from "rxjs"
import { PinchEvent } from "./PinchRecognizerInterface"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"

export const scanPanEventToPinchEvent =
  ({
    type,
    initialEvent,
  }: {
    type: PinchEvent["type"]
    initialEvent: PinchEvent | RecognizerEvent | undefined
  }) =>
  (stream: Observable<RecognizerEvent | PinchEvent>) =>
    stream.pipe(
      scan<
        RecognizerEvent | PinchEvent,
        PinchEvent & {
          initialPointersAverageDistance: number
        },
        PinchEvent | RecognizerEvent | undefined
      >((acc, curr) => {
        const previousPointersLength = acc?.pointers.length ?? 0
        const hasChangedFingers =
          previousPointersLength !== curr.pointers.length
        const previousPointersAverageDistance =
          acc?.pointersAverageDistance ?? curr.pointersAverageDistance

        /**
         * initial average distance is reset every time we change fingers
         * @important in case of 1 finger, distance will be 0
         */
        const initialPointersAverageDistance = hasChangedFingers
          ? curr.pointersAverageDistance
          : !!acc && "initialPointersAverageDistance" in acc
            ? acc.initialPointersAverageDistance
            : curr.pointersAverageDistance

        /**
         * @important When finger is 1, distance is 0
         */
        const scale =
          initialPointersAverageDistance === 0
            ? 1
            : curr.pointersAverageDistance / initialPointersAverageDistance

        const distance =
          curr.pointersAverageDistance - initialPointersAverageDistance

        const deltaDistance =
          curr.pointersAverageDistance - initialPointersAverageDistance

        /**
         * @important When finger is 1, distance is 0
         * Same when fingers change
         */
        const deltaDistanceScale =
          hasChangedFingers || previousPointersAverageDistance === 0
            ? 1
            : curr.pointersAverageDistance / previousPointersAverageDistance

        return {
          ...acc,
          ...curr,
          type,
          initialPointersAverageDistance,
          scale,
          distance,
          deltaDistance,
          deltaDistanceScale,
        }
      }, initialEvent),
      map(({ initialPointersAverageDistance, ...rest }): PinchEvent => rest),
    )
