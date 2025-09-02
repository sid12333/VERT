import { browser } from "$app/environment";
import { error, log } from "$lib/logger";
import { m } from "$lib/paraglide/messages";
import { addToast } from "$lib/store/ToastProvider";
import type { OmitBetterStrict, WorkerMessage } from "$lib/types";
import { VertFile } from "$lib/types";
import MagickWorker from "$lib/workers/magick?worker&url";
import { Converter, FormatInfo } from "./converter.svelte";
import { imageFormats } from "./magick-automated";
import { Settings } from "$lib/sections/settings/index.svelte";

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
		// manually tested formats
		new FormatInfo("png", true, true),
		new FormatInfo("jpeg", true, true),
		new FormatInfo("jpg", true, true),
		new FormatInfo("webp", true, true),
		new FormatInfo("gif", true, true),
		new FormatInfo("svg", true, true),
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
		new FormatInfo("mat", true, true),
		new FormatInfo("pbm", true, true),
		new FormatInfo("pfm", true, true),
		new FormatInfo("pgm", true, true),
		new FormatInfo("pnm", true, true),
		new FormatInfo("ppm", true, true),
		new FormatInfo("tiff", true, true),
		new FormatInfo("jfif", true, true),
		new FormatInfo("eps", false, true),
		new FormatInfo("psd", true, true),

		// raw camera formats
		new FormatInfo("arw", true, false),
		new FormatInfo("tif", true, true),
		new FormatInfo("dng", true, false),
		new FormatInfo("xcf", true, false),
		new FormatInfo("rw2", true, false),
		new FormatInfo("raf", true, false),
		new FormatInfo("orf", true, false),
		new FormatInfo("pef", true, false),
		new FormatInfo("mos", true, false),
		new FormatInfo("raw", true, false),
		new FormatInfo("dcr", true, false),
		new FormatInfo("crw", true, false),
		new FormatInfo("cr3", true, false),
		new FormatInfo("3fr", true, false),
		new FormatInfo("erf", true, false),
		new FormatInfo("mrw", true, false),
		new FormatInfo("mef", true, false),
		new FormatInfo("nrw", true, false),
		new FormatInfo("srw", true, false),
		new FormatInfo("sr2", true, false),
		new FormatInfo("srf", true, false),

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
				addToast("error", m["workers.errors.magick"]());
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
		let compression: number | undefined = args.at(0);
		if (!compression) {
			compression = Settings.instance.settings.magickQuality ?? 100;
			log(["converters", this.name], `using user setting for quality: ${compression}%`);
		}
		log(["converters", this.name], `converting ${input.name} to ${to}`);

		// handle converting from SVG manually because magick-wasm doesn't support it
		if (input.from === ".svg") {
			try {
				const blob = await this.svgToImage(input);
				const pngFile = new VertFile(
					new File([blob], input.name.replace(/\.svg$/i, ".png")),
					input.to,
				);
				if (to === ".png") return pngFile; // if target is png, return it directly
				return await this.convert(pngFile, to, ...args); // otherwise, recursively convert png to user's target format
			} catch (err) {
				error(
					["converters", this.name],
					`SVG conversion failed: ${err}`,
				);
				throw err;
			}
		}

		// every other format handled by magick worker
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

	private async svgToImage(input: VertFile): Promise<Blob> {
		log(["converters", this.name], `converting SVG to image (PNG)`);

		const svgText = await input.file.text();
		const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
		const svgUrl = URL.createObjectURL(svgBlob);

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get canvas context");

		const img = new Image();

		// try to extract dimensions from SVG, and if not fallback to default
		let width = 512;
		let height = 512;
		const widthMatch = svgText.match(/width=["'](\d+)["']/);
		const heightMatch = svgText.match(/height=["'](\d+)["']/);
		const viewBoxMatch = svgText.match(
			/viewBox=["'][^"']*\s+(\d+)\s+(\d+)["']/,
		);

		if (widthMatch && heightMatch) {
			width = parseInt(widthMatch[1]);
			height = parseInt(heightMatch[1]);
		} else if (viewBoxMatch) {
			width = parseInt(viewBoxMatch[1]);
			height = parseInt(viewBoxMatch[2]);
		}

		return new Promise((resolve, reject) => {
			img.onload = () => {
				try {
					canvas.width = img.naturalWidth || width;
					canvas.height = img.naturalHeight || height;

					ctx.drawImage(img, 0, 0);

					canvas.toBlob((blob) => {
						URL.revokeObjectURL(svgUrl);
						if (blob) {
							resolve(blob);
						} else {
							reject(
								new Error("Failed to convert canvas to Blob"),
							);
						}
					}, "image/png");
				} catch (err) {
					URL.revokeObjectURL(svgUrl);
					reject(err);
				}
			};

			img.onerror = () => {
				URL.revokeObjectURL(svgUrl);
				reject(new Error("Failed to load SVG image"));
			};

			img.src = svgUrl;
		});
	}
}
