import Vips from "wasm-vips";
import {
	initializeImageMagick,
	MagickFormat,
	MagickImage,
	MagickImageCollection,
	MagickReadSettings,
	type IMagickImage,
} from "@imagemagick/magick-wasm";
import { makeZip } from "client-zip";
import wasm from "@imagemagick/magick-wasm/magick.wasm?url";
import { parseAni } from "$lib/parse/ani";
import { Icns } from "@fiahfy/icns/dist";

const vipsPromise = Vips({
	dynamicLibraries: [],
});

const magickPromise = initializeImageMagick(new URL(wasm, import.meta.url));

const magickRequiredFormats = [
	".dng",
	".heic",
	".ico",
	".cur",
	".ani",
	".cr2",
	".nef",
];
const unsupportedFrom: string[] = [];
const unsupportedTo = [...magickRequiredFormats];

vipsPromise
	.then(() => {
		postMessage({ type: "loaded" });
	})
	.catch((error) => {
		postMessage({ type: "error", error });
	});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleMessage = async (message: any): Promise<any> => {
	const vips = await vipsPromise;
	switch (message.type) {
		case "convert": {
			if (!message.to.startsWith(".")) message.to = `.${message.to}`;
			console.log(message);
			if (unsupportedFrom.includes(message.input.from)) {
				return {
					type: "error",
					error: `Unsupported input format ${message.input.from}`,
				};
			}

			if (unsupportedTo.includes(message.to)) {
				return {
					type: "error",
					error: `Unsupported output format ${message.to}`,
				};
			}

			const buffer = await message.input.file.arrayBuffer();
			if (
				magickRequiredFormats.includes(message.input.from) ||
				magickRequiredFormats.includes(message.to)
			) {
				// only wait when we need to
				await magickPromise;

				// special ico handling to split them all into separate images
				if (message.input.from === ".ico") {
					const imgs = MagickImageCollection.create();

					while (true) {
						try {
							const img = MagickImage.create(
								new Uint8Array(buffer),
								new MagickReadSettings({
									format: MagickFormat.Ico,
									frameIndex: imgs.length,
								}),
							);
							imgs.push(img);
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
						} catch (_) {
							break;
						}
					}

					if (imgs.length === 0) {
						return {
							type: "error",
							error: `Failed to read ICO -- no images found inside?`,
						};
					}

					const convertedImgs: Uint8Array[] = [];
					await Promise.all(
						imgs.map(async (img, i) => {
							const output = await magickConvert(img, message.to);
							convertedImgs[i] = output;
						}),
					);

					const zip = makeZip(
						convertedImgs.map(
							(img, i) =>
								new File(
									[img],
									`image${i}.${message.to.slice(1)}`,
								),
						),
						"images.zip",
					);

					// read the ReadableStream to the end
					const zipBytes = await readToEnd(zip.getReader());

					imgs.dispose();

					return {
						type: "finished",
						output: zipBytes,
						zip: true,
					};
				} else if (message.input.from === ".ani") {
					console.log("Parsing ANI file");
					try {
						const parsedAni = parseAni(new Uint8Array(buffer));
						const files: File[] = [];
						await Promise.all(
							parsedAni.images.map(async (img, i) => {
								const blob = await magickConvert(
									MagickImage.create(
										img,
										new MagickReadSettings({
											format: MagickFormat.Ico,
										}),
									),
									message.to,
								);
								files.push(
									new File([blob], `image${i}${message.to}`),
								);
							}),
						);

						const zip = makeZip(files, "images.zip");
						const zipBytes = await readToEnd(zip.getReader());

						return {
							type: "finished",
							output: zipBytes,
							zip: true,
						};
					} catch (e) {
						console.error(e);
					}
				}

				console.log(message.input.from);

				const img = MagickImage.create(
					new Uint8Array(buffer),
					new MagickReadSettings({
						format: message.input.from
							.slice(1)
							.toUpperCase() as MagickFormat,
					}),
				);

				const converted = await magickConvert(img, message.to);

				return {
					type: "finished",
					output: converted,
				};
			}

			if (message.input.from === ".icns") {
				const icns = Icns.from(new Uint8Array(buffer));
				console.log(icns);
			}

			let image = vips.Image.newFromBuffer(buffer, "");

			// check if animated image & keep it animated when converting
			if (image.getTypeof("n-pages") > 0) {
				image = vips.Image.newFromBuffer(buffer, "[n=-1]");
			}

			const opts: { [key: string]: string } = {};
			if (typeof message.compression !== "undefined") {
				opts["Q"] = Math.min(100, message.compression + 1).toString();
			}

			const output = image.writeToBuffer(message.to, opts);
			image.delete();
			return {
				type: "finished",
				output: output.buffer,
			};
		}
	}
};

const readToEnd = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
	const chunks: Uint8Array[] = [];
	let done = false;
	while (!done) {
		const { value, done: d } = await reader.read();
		if (value) chunks.push(value);
		done = d;
	}
	const blob = new Blob(chunks, { type: "application/zip" });
	const arrayBuffer = await blob.arrayBuffer();
	return new Uint8Array(arrayBuffer);
};

const magickToBlob = async (img: IMagickImage): Promise<Blob> => {
	const canvas = new OffscreenCanvas(img.width, img.height);
	return new Promise<Blob>((resolve, reject) =>
		img.getPixels(async (p) => {
			const area = p.getArea(0, 0, img.width, img.height);
			const chunkSize = img.hasAlpha ? 4 : 3;
			const chunks = Math.ceil(area.length / chunkSize);
			const data = new Uint8ClampedArray(chunks * 4);

			for (let j = 0, k = 0; j < area.length; j += chunkSize, k += 4) {
				data[k] = area[j];
				data[k + 1] = area[j + 1];
				data[k + 2] = area[j + 2];
				data[k + 3] = img.hasAlpha ? area[j + 3] : 255;
			}

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			ctx.putImageData(new ImageData(data, img.width, img.height), 0, 0);

			const blob = await canvas.convertToBlob({
				type: "image/png",
			});

			resolve(blob);
		}),
	);
};

const magickConvert = async (img: IMagickImage, to: string) => {
	const vips = await vipsPromise;

	const intermediary = await magickToBlob(img);
	const buf = await intermediary.arrayBuffer();

	const imgVips = vips.Image.newFromBuffer(buf);
	const output = imgVips.writeToBuffer(to);

	imgVips.delete();
	img.dispose();

	return output;
};

onmessage = async (e) => {
	const message = e.data;
	try {
		const res = await handleMessage(message);
		if (!res) return;
		postMessage({
			...res,
			id: message.id,
		});
	} catch (e) {
		postMessage({
			type: "error",
			error: e,
			id: message.id,
		});
	}
};
