import { IoArrowForward } from "react-icons/io5"
import { ControlBox } from "../controls/ControlBox"
import { AppRecognizable } from "../useRecognizable"
import { useEffect, useState } from "react"
import { Text } from "@chakra-ui/react"
import { Settings } from "../App"
import { RotateRecognizer } from "../../core"
import { Field } from "../chakra/ui/field"
import { NumberInputField, NumberInputRoot } from "../chakra/ui/number-input"

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
        rotation: <IoArrowForward size="20" transform={`rotate(${rotation})`} />{" "}
        {rotation.toFixed(0)} deg
      </Text>

      <Field label="posThreshold (px)" mt={1}>
        <NumberInputRoot
          defaultValue={settings.rotatePosThreshold.toString()}
          min={0}
          max={9999}
          onValueChange={(e) =>
            setSettings((state) => ({
              ...state,
              rotatePosThreshold: parseInt(e.value),
            }))
          }
        >
          <NumberInputField />
        </NumberInputRoot>
      </Field>

      <Field label="numInputs" mt={1}>
        <NumberInputRoot
          defaultValue={settings.rotateNumInputs.toString()}
          min={0}
          max={9999}
          onValueChange={(e) =>
            setSettings((state) => ({
              ...state,
              rotateNumInputs: parseInt(e.value),
            }))
          }
        >
          <NumberInputField />
        </NumberInputRoot>
      </Field>
    </ControlBox>
  )
}
