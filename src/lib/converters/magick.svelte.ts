import { browser } from "$app/environment";
import { error, log } from "$lib/logger";
import { m } from "$lib/paraglide/messages";
import { addToast } from "$lib/store/ToastProvider";
import type { OmitBetterStrict, WorkerMessage } from "$lib/types";
import { VertFile } from "$lib/types";
import MagickWorker from "$lib/workers/magick?worker&url";
import { Converter, FormatInfo } from "./converter.svelte";
import { imageFormats } from "./magick-automated";

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
		new FormatInfo("svg", false, true), // converting from SVG unsupported my magick-wasm - suggested to let browser draw with canvas and read image to "convert" (gh issues)
		new FormatInfo("jxl", true, true),
		new FormatInfo("avif", true, true),
		new FormatInfo("heic", true, false), // seems to be unreliable? HEIC/HEIF is very weird if it will actually work
		new FormatInfo("heif", true, false),
		// TODO: .ico files can encode multiple images at various
		// sizes, bitdepths, etc. we should support that in future
		new FormatInfo("ico", true, true),
		new FormatInfo("bmp", true, true),
		new FormatInfo("cur", true, true),
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
		new FormatInfo("ppm", true, true),
		new FormatInfo("tif", true, true),
		new FormatInfo("tiff", true, true),
		new FormatInfo("jfif", true, true),
		new FormatInfo("eps", false, true),
		new FormatInfo("arw", true, false),
		new FormatInfo("psd", true, true),

		// formats added from maya's somewhat automated testing
		...imageFormats,
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
					m["workers.errors.magick"](),
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
