import { Stack } from "@chakra-ui/react"
import { ReactNode } from "react"

export const Pan = ({
  containerRef,
  children,
}: {
  containerRef: React.Dispatch<
    React.SetStateAction<HTMLElement | null | undefined>
  >
  children: ReactNode
}) => {
  return (
    <Stack
      flex={1}
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
      ref={containerRef}
    >
      {children}
    </Stack>
  )
}
