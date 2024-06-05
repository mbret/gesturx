import { Box } from "@chakra-ui/react"
import { ReactNode } from "react"

export const DebugBox = ({ children }: { children: ReactNode }) => {
  return (
    <Box bgColor="white" p={1} px={2}>
      {children}
    </Box>
  )
}
