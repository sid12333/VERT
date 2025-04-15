import { VertFile } from "./file.svelte";

interface ConvertMessage {
	type: "convert";
	input: VertFile;
	to: string;
	compression: number | null;
}

interface FinishedMessage {
	type: "finished";
	output: ArrayBufferLike;
	zip?: boolean;
}

interface LoadedMessage {
	type: "loaded";
}

interface ErrorMessage {
	type: "error";
	error: string;
}

export type WorkerMessage = (
	| ConvertMessage
	| FinishedMessage
	| LoadedMessage
	| ErrorMessage
) & {
	id: number;
};
