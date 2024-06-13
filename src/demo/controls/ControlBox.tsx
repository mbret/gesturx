import { Box } from "@chakra-ui/react"
import { ReactNode } from "react"

export const ControlBox = ({ children }: { children: ReactNode }) => {
  return (
    <Box bgColor="white" p={0} px={0}>
      {children}
    </Box>
  )
}
