import { ArrowForwardIcon } from "@chakra-ui/icons"
import { ControlBox } from "../controls/ControlBox"
import { AppRecognizable } from "../useRecognizable"
import { useEffect, useState } from "react"
import {
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Text,
} from "@chakra-ui/react"
import { Settings } from "../App"
import { RotateRecognizer } from "../../core"

export const RotateControls = ({
  recognizable,
  settings,
  setSettings,
}: {
  recognizable: AppRecognizable
  settings: Settings
  setSettings: (stateUpdate: (state: Settings) => Settings) => void
}) => {
  const [rotation, setRotation] = useState(0)
  const { rotateNumInputs, rotatePosThreshold } = settings

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "rotateMove") {
        setRotation(e.angle)
      }

      if (e.type === "rotateEnd") {
        setRotation(0)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  const rotateRecognizer = recognizable.recognizers.find(
    (recognizer): recognizer is RotateRecognizer =>
      recognizer instanceof RotateRecognizer,
  )

  /**
   * Update settings from controls
   */
  useEffect(() => {
    rotateRecognizer?.update({
      options: {
        numInputs: rotateNumInputs,
        posThreshold: rotatePosThreshold,
      },
    })
  }, [rotateRecognizer, rotateNumInputs, rotatePosThreshold])

  return (
    <ControlBox>
      <Text fontSize="xs">
        rotation:{" "}
        <ArrowForwardIcon boxSize={4} transform={`rotate(${rotation}deg)`} />{" "}
        {rotation.toFixed(0)} deg
      </Text>

      <FormControl mt={1}>
        <FormLabel fontSize="xs">posThreshold (px)</FormLabel>
        <NumberInput
          size="sm"
          defaultValue={settings.rotatePosThreshold}
          min={0}
          max={9999}
          onChange={(valueString) =>
            setSettings((state) => ({
              ...state,
              rotatePosThreshold: parseInt(valueString),
            }))
          }
        >
          <NumberInputField />
        </NumberInput>
      </FormControl>

      <FormControl mt={1}>
        <FormLabel fontSize="xs">numInputs</FormLabel>
        <NumberInput
          size="sm"
          defaultValue={settings.rotateNumInputs}
          min={0}
          max={9999}
          onChange={(valueString) =>
            setSettings((state) => ({
              ...state,
              rotateNumInputs: parseInt(valueString),
            }))
          }
        >
          <NumberInputField />
        </NumberInput>
      </FormControl>
    </ControlBox>
  )
}
