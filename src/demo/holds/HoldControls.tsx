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

export const HoldControls = ({
  recognizable,
  numInputsHold,
  setNumInputsHold,
  posThreshold,
  setPosThreshold,
  delay,
  setDelay,
}: {
  recognizable: AppRecognizable
  numInputsHold: number
  posThreshold: number
  setPosThreshold: (value: number) => void
  setNumInputsHold: (value: number) => void
  delay: number
  setDelay: (value: number) => void
}) => {
  const [isHolding, setIsHolding] = useState(false)

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
            defaultValue={numInputsHold}
            min={1}
            max={5}
            size="sm"
            onChange={(valueString) => setNumInputsHold(parseInt(valueString))}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="small">posThreshold (px)</FormLabel>
          <NumberInput
            size="sm"
            defaultValue={posThreshold}
            min={0}
            max={100}
            onChange={(valueString) => setPosThreshold(parseInt(valueString))}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="small">delay (seconds)</FormLabel>
          <NumberInput
            size="sm"
            defaultValue={delay}
            min={0}
            max={9999}
            onChange={(valueString) => setDelay(parseInt(valueString))}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
      </Stack>
    </ControlBox>
  )
}
