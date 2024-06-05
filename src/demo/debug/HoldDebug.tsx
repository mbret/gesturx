import { Stack, Text } from "@chakra-ui/react"
import { DebugBox } from "./DebugBox"

export const HoldDebug = ({ isHolding }: { isHolding: boolean }) => {
  return (
    <DebugBox>
      <Stack>
        <Text>Hold: {isHolding ? "true" : "false"}</Text>
      </Stack>
    </DebugBox>
  )
}
