import { Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { type PinchEvent, PinchRecognizer } from "../../core";
import type { Settings } from "../App";
import { Field } from "../chakra/ui/field";
import { NumberInputField, NumberInputRoot } from "../chakra/ui/number-input";
import { ControlBox } from "../controls/ControlBox";
import type { AppRecognizable } from "../useRecognizable";

export const PinchControls = ({
	recognizable,
	settings,
	setSettings,
}: {
	recognizable: AppRecognizable;
	settings: Settings;
	setSettings: (stateUpdate: (state: Settings) => Settings) => void;
}) => {
	const [event, setEvent] = useState<PinchEvent | undefined>(undefined);
	const { pinchPosThreshold } = settings;
	const pinchRecognizer = recognizable.recognizers.find(
		(recognizer): recognizer is PinchRecognizer =>
			recognizer instanceof PinchRecognizer,
	);

	/**
	 * Update settings from controls
	 */
	useEffect(() => {
		pinchRecognizer?.update({
			options: {
				posThreshold: pinchPosThreshold,
			},
		});
	}, [pinchRecognizer, pinchPosThreshold]);

	useEffect(() => {
		const sub = recognizable.events$.subscribe((e) => {
			if (
				e.type === "pinchEnd" ||
				e.type === "pinchMove" ||
				e.type === "pinchStart"
			) {
				setEvent(e);
			}

			if (e.type === "pinchEnd") {
				setEvent(undefined);
			}
		});

		return () => {
			sub.unsubscribe();
		};
	}, [recognizable]);

	return (
		<ControlBox>
			<Text fontSize="xs">scale: {(event?.scale ?? 1).toFixed(1)}% </Text>
			<Text fontSize="xs">
				scaleDelta {(event?.deltaDistanceScale ?? 1).toFixed(5)}%{" "}
			</Text>
			<Text fontSize="xs">distance {(event?.distance ?? 0).toFixed(0)}px</Text>
			<Field label="posThreshold (px)" mt={1}>
				<NumberInputRoot
					defaultValue={settings.pinchPosThreshold.toString()}
					min={0}
					max={9999}
					onValueChange={(e) => {
						setSettings((state) => ({
							...state,
							pinchPosThreshold: Number.parseInt(e.value),
						}));
					}}
				>
					<NumberInputField />
				</NumberInputRoot>
			</Field>
		</ControlBox>
	);
};
