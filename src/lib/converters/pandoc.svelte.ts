import { VertFile } from "$lib/types";
import { Converter, FormatInfo } from "./converter.svelte";
import { browser } from "$app/environment";
import PandocWorker from "$lib/workers/pandoc?worker";

export class PandocConverter extends Converter {
	public name = "pandoc";
	public ready = $state(false);
	public wasm: ArrayBuffer = null!;

	constructor() {
		super();
		if (!browser) return;
		(async () => {
			this.wasm = await fetch("/pandoc.wasm").then((r) =>
				r.arrayBuffer(),
			);
			this.ready = true;
		})();
	}

	public async convert(input: VertFile, to: string): Promise<VertFile> {
		const worker = new PandocWorker();
		worker.postMessage({ type: "load", wasm: this.wasm });
		await waitForMessage(worker, "loaded");
		worker.postMessage({
			type: "convert",
			to,
			file: input.file,
		});
		const result = await waitForMessage(worker);
		if (result.type === "error") {
			worker.terminate();
			// throw new Error(result.error);
			switch (result.errorKind) {
				case "PandocUnknownReaderError": {
					throw new Error(
						`${input.from} is not a supported input format for documents.`,
					);
				}

				case "PandocUnknownWriterError": {
					throw new Error(
						`${to} is not a supported output format for documents.`,
					);
				}

				default:
					if (result.errorKind)
						throw new Error(
							`[${result.errorKind}] ${result.error}`,
						);
					else throw new Error(result.error);
			}
		}
		worker.terminate();
		if (!to.startsWith(".")) to = `.${to}`;
		return new VertFile(
			new File([result.output], input.name),
			result.isZip ? ".zip" : to,
		);
	}

	public supportedFormats = [
		new FormatInfo("docx"),
		new FormatInfo("doc"),
		new FormatInfo("md"),
		new FormatInfo("html"),
		new FormatInfo("rtf"),
		new FormatInfo("csv"),
		new FormatInfo("tsv"),
		new FormatInfo("json"),
		new FormatInfo("rst"),
		new FormatInfo("epub"),
		new FormatInfo("odt"),
		new FormatInfo("docbook"),
	];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function waitForMessage(worker: Worker, type?: string): Promise<any> {
	return new Promise((resolve) => {
		const onMessage = (e: MessageEvent) => {
			if (type && e.data.type === type) {
				worker.removeEventListener("message", onMessage);
				resolve(e.data);
			} else {
				worker.removeEventListener("message", onMessage);
				resolve(e.data);
			}
		};
		worker.addEventListener("message", onMessage);
	});
}
