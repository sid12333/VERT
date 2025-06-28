import { browser } from "$app/environment";
import { error, log } from "$lib/logger";
import { addToast } from "$lib/store/ToastProvider";
import type { OmitBetterStrict, WorkerMessage } from "$lib/types";
import { VertFile } from "$lib/types";
import MagickWorker from "$lib/workers/magick?worker&url";
import { Converter, FormatInfo } from "./converter.svelte";

export class MagickConverter extends Converter {
	private worker: Worker = browser
		? new Worker(MagickWorker, {
				type: "module",
			})
		: null!;
	private id = 0;
	public name = "imagemagick";
	public ready = $state(false);

	public supportedFormats = [
		new FormatInfo("png", true, true),
		new FormatInfo("jpeg", true, true),
		new FormatInfo("jpg", true, true),
		new FormatInfo("webp", true, true),
		new FormatInfo("gif", true, true),
		new FormatInfo("heic", true, false),
		// TODO: .ico files can encode multiple images at various
		// sizes, bitdepths, etc. we should support that in future
		new FormatInfo("ico", true, true),
		new FormatInfo("bmp", true, false),
		new FormatInfo("cur", true, false),
		new FormatInfo("ani", true, false),
		new FormatInfo("icns", true, false),
		new FormatInfo("nef", true, false),
		new FormatInfo("cr2", true, false),
		new FormatInfo("hdr", true, true),
		new FormatInfo("jpe", true, true),
		new FormatInfo("dng", true, false),
		new FormatInfo("mat", true, true),
		new FormatInfo("pbm", true, true),
		new FormatInfo("pfm", true, true),
		new FormatInfo("pgm", true, true),
		new FormatInfo("pnm", true, true),
		new FormatInfo("ppm", false, true),
		new FormatInfo("tif", true, true),
		new FormatInfo("tiff", true, true),
		new FormatInfo("jfif", true, true),
	];

	public readonly reportsProgress = false;

	constructor() {
		super();
		log(["converters", this.name], `created converter`);
		if (!browser) return;
		log(["converters", this.name], `loading worker @ ${MagickWorker}`);
		this.worker.onmessage = (e) => {
			const message: WorkerMessage = e.data;
			log(["converters", this.name], `received message ${message.type}`);
			if (message.type === "loaded") {
				this.ready = true;
			} else if (message.type === "error") {
				error(
					["converters", this.name],
					`error in worker: ${message.error}`,
				);
				addToast(
					"error",
					`Error in Magick worker, image conversion may not work as expected.`,
				);
				throw new Error(message.error);
			}
		};
	}

	public async convert(
		input: VertFile,
		to: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		...args: any[]
	): Promise<VertFile> {
		const compression: number | undefined = args.at(0);
		log(["converters", this.name], `converting ${input.name} to ${to}`);
		const msg = {
			type: "convert",
			input: {
				file: input.file,
				name: input.name,
				to: input.to,
				from: input.from,
			},
			to,
			compression,
		} as WorkerMessage;
		const res = await this.sendMessage(msg);

		if (res.type === "finished") {
			log(["converters", this.name], `converted ${input.name} to ${to}`);
			return new VertFile(
				new File([res.output as unknown as BlobPart], input.name),
				res.zip ? ".zip" : to,
			);
		}

		if (res.type === "error") {
			throw new Error(res.error);
		}

		throw new Error("Unknown message type");
	}

	private sendMessage(
		message: OmitBetterStrict<WorkerMessage, "id">,
	): Promise<OmitBetterStrict<WorkerMessage, "id">> {
		const id = this.id++;
		let resolved = false;
		return new Promise((resolve) => {
			const onMessage = (e: MessageEvent) => {
				if (e.data.id === id) {
					this.worker.removeEventListener("message", onMessage);
					resolve(e.data);
					resolved = true;
				}
			};

			setTimeout(() => {
				if (!resolved) {
					this.worker.removeEventListener("message", onMessage);
					throw new Error("Timeout");
				}
			}, 60000);

			this.worker.addEventListener("message", onMessage);
			const msg = { ...message, id, worker: null };
			try {
				this.worker.postMessage(msg);
			} catch (e) {
				error(["converters", this.name], e);
			}
		});
	}
}
