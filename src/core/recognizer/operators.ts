import { filter, type Observable } from "rxjs";
import { isPointerOffEvent } from "../utils/events.ts";

export const filterPointerOff = (stream: Observable<PointerEvent>) =>
	stream.pipe(filter(isPointerOffEvent));
