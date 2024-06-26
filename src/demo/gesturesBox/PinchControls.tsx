import { useEffect, useState } from "react"
import { AppRecognizable } from "../useRecognizable"
import { ControlBox } from "../controls/ControlBox"
import {
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Text,
} from "@chakra-ui/react"
import { Settings } from "../App"
import { PinchEvent, PinchRecognizer } from "../../core"

export const PinchControls = ({
  recognizable,
  settings,
  setSettings,
}: {
  recognizable: AppRecognizable
  settings: Settings
  setSettings: (stateUpdate: (state: Settings) => Settings) => void
}) => {
  const [event, setEvent] = useState<PinchEvent | undefined>(undefined)
  const { pinchPosThreshold } = settings
  const pinchRecognizer = recognizable.recognizers.find(
    (recognizer): recognizer is PinchRecognizer =>
      recognizer instanceof PinchRecognizer,
  )

  /**
   * Update settings from controls
   */
  useEffect(() => {
    pinchRecognizer?.update({
      options: {
        posThreshold: pinchPosThreshold,
      },
    })
  }, [pinchRecognizer, pinchPosThreshold])

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (
        e.type === "pinchEnd" ||
        e.type === "pinchMove" ||
        e.type === "pinchStart"
      ) {
        setEvent(e)
      }

      if (e.type === "pinchEnd") {
        setEvent(undefined)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  return (
    <ControlBox>
      <Text fontSize="xs">scale: {(event?.scale ?? 1).toFixed(1)}% </Text>
      <Text fontSize="xs">
        scaleDelta {(event?.deltaDistanceScale ?? 1).toFixed(5)}%{" "}
      </Text>
      <Text fontSize="xs">distance {(event?.distance ?? 0).toFixed(0)}px</Text>
      <FormControl mt={1}>
        <FormLabel fontSize="xs">posThreshold (px)</FormLabel>
        <NumberInput
          size="sm"
          defaultValue={settings.pinchPosThreshold}
          min={0}
          max={9999}
          onChange={(valueString) =>
            setSettings((state) => ({
              ...state,
              pinchPosThreshold: parseInt(valueString),
            }))
          }
        >
          <NumberInputField />
        </NumberInput>
      </FormControl>
    </ControlBox>
  )
}
