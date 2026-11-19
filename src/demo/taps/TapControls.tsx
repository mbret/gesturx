import { Stack } from "@chakra-ui/react";
import { Field } from "../chakra/ui/field.tsx";
import {
	NumberInputField,
	NumberInputRoot,
} from "../chakra/ui/number-input.tsx";
import { ControlBox } from "../controls/ControlBox.tsx";

export const TapControls = ({
	value,
	onChange,
}: {
	value: number;
	onChange: (value: number) => void;
}) => {
	return (
		<ControlBox>
			<Stack>
				<Field label="max taps">
					<NumberInputRoot
						defaultValue={value.toString()}
						min={1}
						max={20}
						onValueChange={(e) => onChange(Number.parseInt(e.value, 10))}
					>
						<NumberInputField />
					</NumberInputRoot>
				</Field>
			</Stack>
		</ControlBox>
	);
};
