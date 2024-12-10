import { Stack, Text } from "@chakra-ui/react"
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
      <Text color="white">Select me to cancel pan/swipe</Text>
      <img src="/image.jpg" height={100} width={100} />
      {children}
    </Stack>
  )
}
