import { Stack, Text } from "@chakra-ui/react"
import { ControlBox } from "../controls/ControlBox"
import { AppRecognizable } from "../useRecognizable"
import { useEffect, useState } from "react"
import { Settings } from "../App"
import { PanRecognizer } from "../../core"
import { Field } from "../chakra/ui/field"
import { NumberInputField, NumberInputRoot } from "../chakra/ui/number-input"

export const PanControl = ({
  recognizable,
  settings,
  setSettings,
}: {
  recognizable: AppRecognizable
  settings: Settings
  setSettings: (stateUpdate: (state: Settings) => Settings) => void
}) => {
  const [isHolding, setIsHolding] = useState(false)
  const { panDelay, panNumInputs, panPosThreshold } = settings
  const panRecognizer = recognizable.recognizers.find(
    (recognizer): recognizer is PanRecognizer =>
      recognizer instanceof PanRecognizer,
  )

  /**
   * Update settings from controls
   */
  useEffect(() => {
    panRecognizer?.update({
      options: {
        numInputs: panNumInputs,
        posThreshold: panPosThreshold,
        delay: panDelay,
      },
    })
  }, [panRecognizer, panDelay, panNumInputs, panPosThreshold])

  useEffect(() => {
    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "panStart") {
        setIsHolding(true)
      }

      if (e.type === "panEnd") {
        setIsHolding(false)
      }
    })

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable])

  return (
    <ControlBox>
      <Stack>
        <Text fontSize="small">Pan: {isHolding ? "true" : "false"}</Text>
        <Field label="numInputs" mt={1}>
          <NumberInputRoot
            defaultValue={settings.panNumInputs.toString()}
            min={1}
            max={99}
            onValueChange={(e) =>
              setSettings((state) => ({
                ...state,
                panNumInputs: parseInt(e.value),
              }))
            }
          >
            <NumberInputField />
          </NumberInputRoot>
        </Field>

        <Field label="posThreshold (px)" mt={1}>
          <NumberInputRoot
            defaultValue={settings.panPosThreshold.toString()}
            min={0}
            max={9999}
            onValueChange={(e) =>
              setSettings((state) => ({
                ...state,
                panPosThreshold: parseInt(e.value),
              }))
            }
          >
            <NumberInputField />
          </NumberInputRoot>
        </Field>

        <Field label="delay (seconds)" mt={1}>
          <NumberInputRoot
            defaultValue={settings.panDelay.toString()}
            min={0}
            max={9999}
            onValueChange={(e) =>
              setSettings((state) => ({
                ...state,
                panDelay: parseInt(e.value),
              }))
            }
          >
            <NumberInputField />
          </NumberInputRoot>
        </Field>
      </Stack>
    </ControlBox>
  )
}
