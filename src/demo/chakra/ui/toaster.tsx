import {
	Toaster as ChakraToaster,
	Portal,
	Spinner,
	Stack,
	Toast,
	createToaster,
} from "@chakra-ui/react";
import { memo } from "react";

export const toaster = createToaster({
	placement: "bottom",
	pauseOnPageIdle: true,
	overlap: true,
});

export const Toaster = memo(() => {
	return (
		<Portal>
			<ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
				{(toast) => {
					return (
						<Toast.Root width={{ md: "sm" }}>
							{toast.type === "loading" ? (
								<Spinner size="sm" color="blue.solid" />
							) : (
								<Toast.Indicator />
							)}
							<Stack gap="1" flex="1" maxWidth="100%">
								{toast.title && <Toast.Title>{toast.title}</Toast.Title>}
								{toast.description && (
									<Toast.Description>{toast.description}</Toast.Description>
								)}
							</Stack>
							{toast.action && (
								<Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
							)}
							{toast.closable && <Toast.CloseTrigger />}
						</Toast.Root>
					);
				}}
			</ChakraToaster>
		</Portal>
	);
});
