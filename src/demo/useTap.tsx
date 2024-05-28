import { useEffect, useState } from "react"
import {
  FormControl,
  FormLabel,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react"
import { DebugBox } from "./DebugBox"
import { TapRecognizer } from "../core"
import { AppRecognizable } from "./useRecognizable"

const TapDebug = ({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) => {
  return (
    <DebugBox>
      <Stack>
        <Text>Tap:</Text>
        <FormControl>
          <FormLabel>max taps</FormLabel>
          <NumberInput
            defaultValue={value}
            min={1}
            max={20}
            onChange={(valueString) => onChange(parseInt(valueString))}
            maxWidth={100}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      </Stack>
    </DebugBox>
  )
}

export const useTap = (recognizable: AppRecognizable) => {
  const toast = useToast()
  const [maxTaps, setMaxTaps] = useState(3)
  const tapRecognizer = recognizable.recognizers.find(
    (recognizer) => recognizer instanceof TapRecognizer,
  )

  useEffect(() => {
    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "tap") {
        toast({
          title: "Click",
          description: (
            <Stack>
              <Text display="flex" gap={4}>
                Taps: <b>{e.taps}</b>
              </Text>
            </Stack>
          ),
        })
      }
    })

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable, toast])

  useEffect(() => {
    tapRecognizer?.update({ maxTaps })
  }, [maxTaps, tapRecognizer])

  const tapDebug = (
    <TapDebug value={maxTaps} onChange={(value) => setMaxTaps(value)} />
  )

  return { tapDebug }
}
