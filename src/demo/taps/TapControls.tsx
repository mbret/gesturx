import { Stack } from "@chakra-ui/react";
import { Field } from "../chakra/ui/field";
import { NumberInputField, NumberInputRoot } from "../chakra/ui/number-input";
import { ControlBox } from "../controls/ControlBox";

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
						onValueChange={(e) => onChange(Number.parseInt(e.value))}
					>
						<NumberInputField />
					</NumberInputRoot>
				</Field>
			</Stack>
		</ControlBox>
	);
};
