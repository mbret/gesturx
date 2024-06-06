import {
  Stack,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Text,
} from "@chakra-ui/react"
import { ControlBox } from "../controls/ControlBox"

export const TapControls = ({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) => {
  return (
    <ControlBox>
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
    </ControlBox>
  )
}
