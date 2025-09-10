import { writable } from "svelte/store";

type DialogType = "success" | "error" | "info" | "warning";

export interface Dialog {
	id: number;
	title: string;
	message: string;
	buttons: {
		text: string;
		action: () => void;
	}[];
	type: DialogType;
}

const dialogs = writable<Dialog[]>([]);

let dialogId = 0;

function addDialog(
	title: string,
	message: string,
	buttons: Dialog["buttons"],
	type: DialogType,
) {
	const id = dialogId++;

	const newDialog: Dialog = {
		id,
		title,
		message,
		buttons,
		type,
	};
	dialogs.update((currentDialogs) => [...currentDialogs, newDialog]);

	return id;
}

function removeDialog(id: number) {
	dialogs.update((currentDialogs) =>
		currentDialogs.filter((dialog) => dialog.id !== id),
	);
}

export { dialogs, addDialog, removeDialog };
