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
import { HoldRecognizer } from "../../core/hold/HoldRecognizer"
import { Settings } from "../App"

export const HoldControls = ({
  recognizable,
  setSettings,
  settings,
}: {
  recognizable: AppRecognizable
  settings: Settings
  setSettings: (stateUpdate: (state: Settings) => Settings) => void
}) => {
  const [isHolding, setIsHolding] = useState(false)
  const { holdDelay, holdNumInputs, holdPosThreshold } = settings
  const holdRecognizer = recognizable.recognizers.find(
    (recognizer): recognizer is HoldRecognizer =>
      recognizer instanceof HoldRecognizer,
  )

  useEffect(() => {
    holdRecognizer?.update({
      options: {
        numInputs: holdNumInputs,
        posThreshold: holdPosThreshold,
        delay: holdDelay,
      },
    })
  }, [holdRecognizer, holdDelay, holdNumInputs, holdPosThreshold])

  useEffect(() => {
    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "holdStart") {
        setIsHolding(true)
      }

      if (e.type === "holdEnd") {
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
        <Text fontSize="small">Hold: {isHolding ? "true" : "false"}</Text>
        <FormControl>
          <FormLabel fontSize="small">numInputs</FormLabel>
          <NumberInput
            defaultValue={settings.holdNumInputs}
            min={1}
            max={5}
            size="sm"
            onChange={(valueString) =>
              setSettings((state) => ({
                ...state,
                holdNumInputs: parseInt(valueString) || 0,
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
            defaultValue={settings.holdPosThreshold}
            min={0}
            max={100}
            onChange={(valueString) =>
              setSettings((state) => ({
                ...state,
                holdPosThreshold: parseInt(valueString) || 0,
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
            defaultValue={settings.holdDelay}
            min={0}
            max={9999}
            onChange={(valueString) =>
              setSettings((state) => ({
                ...state,
                holdDelay: parseInt(valueString) || 0,
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
