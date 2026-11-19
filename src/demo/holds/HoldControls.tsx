import { Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { HoldRecognizer } from "../../core/index.ts";
import type { Settings } from "../App.tsx";
import { Field } from "../chakra/ui/field.tsx";
import {
	NumberInputField,
	NumberInputRoot,
} from "../chakra/ui/number-input.tsx";
import { ControlBox } from "../controls/ControlBox.tsx";
import type { AppRecognizable } from "../useRecognizable.ts";

export const HoldControls = ({
	recognizable,
	setSettings,
	settings,
}: {
	recognizable: AppRecognizable;
	settings: Settings;
	setSettings: (stateUpdate: (state: Settings) => Settings) => void;
}) => {
	const [isHolding, setIsHolding] = useState(false);
	const { holdDelay, holdNumInputs, holdPosThreshold } = settings;
	const holdRecognizer = recognizable.recognizers.find(
		(recognizer): recognizer is HoldRecognizer =>
			recognizer instanceof HoldRecognizer,
	);

	useEffect(() => {
		holdRecognizer?.update({
			options: {
				numInputs: holdNumInputs,
				posThreshold: holdPosThreshold,
				delay: holdDelay,
			},
		});
	}, [holdRecognizer, holdDelay, holdNumInputs, holdPosThreshold]);

	useEffect(() => {
		const clickSub = recognizable.events$.subscribe(({ event }) => {
			if (event.type === "holdStart") {
				setIsHolding(true);
			}

			if (event.type === "holdEnd") {
				setIsHolding(false);
			}
		});

		return () => {
			clickSub.unsubscribe();
		};
	}, [recognizable]);

	return (
		<ControlBox>
			<Stack>
				<Text fontSize="small">Hold: {isHolding ? "true" : "false"}</Text>

				<Field label="numInputs" mt={1}>
					<NumberInputRoot
						defaultValue={settings.holdNumInputs.toString()}
						min={1}
						max={5}
						onValueChange={(e) =>
							setSettings((state) => ({
								...state,
								holdNumInputs: Number.parseInt(e.value, 10),
							}))
						}
					>
						<NumberInputField />
					</NumberInputRoot>
				</Field>

				<Field label="posThreshold (px)" mt={1}>
					<NumberInputRoot
						defaultValue={settings.holdPosThreshold.toString()}
						min={0}
						max={100}
						onValueChange={(e) =>
							setSettings((state) => ({
								...state,
								holdPosThreshold: Number.parseInt(e.value, 10),
							}))
						}
					>
						<NumberInputField />
					</NumberInputRoot>
				</Field>

				<Field label="delay (seconds)" mt={1}>
					<NumberInputRoot
						defaultValue={settings.holdDelay.toString()}
						min={0}
						max={9999}
						onValueChange={(e) =>
							setSettings((state) => ({
								...state,
								holdDelay: Number.parseInt(e.value, 10),
							}))
						}
					>
						<NumberInputField />
					</NumberInputRoot>
				</Field>
			</Stack>
		</ControlBox>
	);
};
