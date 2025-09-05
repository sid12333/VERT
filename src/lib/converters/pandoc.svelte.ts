import { VertFile } from "$lib/types";
import { Converter, FormatInfo } from "./converter.svelte";
import { browser } from "$app/environment";
import PandocWorker from "$lib/workers/pandoc?worker&url";
import { addToast } from "$lib/store/ToastProvider";

export class PandocConverter extends Converter {
	public name = "pandoc";
	public ready = $state(false);
	public wasm: ArrayBuffer = null!;

	constructor() {
		super();
		if (!browser) return;
		(async () => {
			try {
				this.status = "downloading";
				this.wasm = await fetch("/pandoc.wasm").then((r) =>
					r.arrayBuffer(),
				);

				this.status = "ready";
			} catch (err) {
				this.status = "error";
				addToast("error", `Failed to load Pandoc worker: ${err}`);
			}
		})();
	}

	public async convert(input: VertFile, to: string): Promise<VertFile> {
		const worker = new Worker(PandocWorker, {
			type: "module",
		});
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
			const error = result.error.toString();
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

				case "PandocParseError": {
					if (error.includes("JSON missing pandoc-api-version")) {
						throw new Error(
							`This JSON file is not a pandoc-converted JSON file. It must be converted with pandoc / VERT to be converted again.`,
						);
					}
				}

				// eslint-disable-next-line no-fallthrough
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
		new FormatInfo("docx", true, true),
		new FormatInfo("doc", true, true),
		new FormatInfo("md", true, true),
		new FormatInfo("html", true, true),
		new FormatInfo("rtf", true, true),
		new FormatInfo("csv", true, true),
		new FormatInfo("tsv", true, true),
		new FormatInfo("json", true, true), // must be a pandoc-converted json
		new FormatInfo("rst", true, true),
		new FormatInfo("epub", true, true),
		new FormatInfo("odt", true, true),
		new FormatInfo("docbook", true, true),
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
