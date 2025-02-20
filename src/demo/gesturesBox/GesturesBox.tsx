import { Box } from "@chakra-ui/react";
import type { Settings } from "../App";
import type { AppRecognizable } from "../useRecognizable";
import { usePan } from "./usePan";
import { usePinch } from "./usePinch";
import { useRotate } from "./useRotate";

export const GesturesBox = ({
	recognizable,
	settings,
}: {
	recognizable: AppRecognizable;
	settings: Settings;
}) => {
	/**
	 * Move the box with fingers
	 */
	const { position } = usePan({ recognizable, settings });
	/**
	 * Zoom in/out the box
	 */
	const { boxScale } = usePinch({ recognizable, settings });
	/**
	 * Rotate the box
	 */
	const { boxAngle } = useRotate({ recognizable, settings });

	return (
		<Box id="boxContainer" left={`${position.x}px`} top={`${position.y}px`}>
			<Box
				height="148px"
				width="148px"
				bgColor="red"
				style={{
					transform: `rotate(${boxAngle}deg) scale(${boxScale})`,
				}}
			/>
		</Box>
	);
};
