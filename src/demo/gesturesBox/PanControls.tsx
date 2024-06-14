import {
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Stack,
  Text,
} from "@chakra-ui/react"
import { ControlBox } from "../controls/ControlBox"
import { AppRecognizable } from "../useRecognizable"
import { useEffect, useState } from "react"
import { Settings } from "../App"
import { PanRecognizer } from "../../core"

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
        <FormControl>
          <FormLabel fontSize="small">numInputs</FormLabel>
          <NumberInput
            defaultValue={settings.panNumInputs}
            min={1}
            max={99}
            size="sm"
            onChange={(valueString) =>
              setSettings((state) => ({
                ...state,
                panNumInputs: parseInt(valueString),
              }))
            }
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="small">posThreshold (px)</FormLabel>
          <NumberInput
            size="sm"
            defaultValue={settings.panPosThreshold}
            min={0}
            max={9999}
            onChange={(valueString) =>
              setSettings((state) => ({
                ...state,
                panPosThreshold: parseInt(valueString),
              }))
            }
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="small">delay (seconds)</FormLabel>
          <NumberInput
            size="sm"
            defaultValue={settings.panDelay}
            min={0}
            max={9999}
            onChange={(valueString) =>
              setSettings((state) => ({
                ...state,
                panDelay: parseInt(valueString),
              }))
            }
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
      </Stack>
    </ControlBox>
  )
}
