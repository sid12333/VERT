import {
	ImageMagick,
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
import { parseIcns } from "vert-wasm";

const magickPromise = initializeImageMagick(new URL(wasm, import.meta.url));

magickPromise
	.then(() => {
		postMessage({ type: "loaded" });
	})
	.catch((error) => {
		postMessage({ type: "error", error });
	});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleMessage = async (message: any): Promise<any> => {
	switch (message.type) {
		case "convert": {
			const compression: number | undefined = message.compression;
			if (!message.to.startsWith(".")) message.to = `.${message.to}`;
			message.to = message.to.toLowerCase();
			if (message.to === ".jfif") message.to = ".jpeg";
			if (message.input.from === ".jfif") message.input.from = ".jpeg";
			if (message.input.from === ".fit") message.input.from = ".fits";

			const buffer = await message.input.file.arrayBuffer();
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
						const output = await magickConvert(img, message.to, compression);
						convertedImgs[i] = output;
					}),
				);

				const zip = makeZip(
					convertedImgs.map(
						(img, i) =>
							new File(
								[new Uint8Array(img)],
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
								compression
							);
							files.push(
								new File(
									[new Uint8Array(blob)],
									`image${i}${message.to}`,
								),
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
			} else if (message.input.from === ".icns") {
				const icns: Uint8Array[] = parseIcns(new Uint8Array(buffer));
				if (typeof icns === "string") {
					return {
						type: "error",
						error: `Failed to read ICNS -- ${icns}`,
					};
				}

				const formats = [
					MagickFormat.Png,
					MagickFormat.Jpeg,
					MagickFormat.Rgba,
					MagickFormat.Rgb,
				];
				const outputs: Uint8Array[] = [];
				for (const file of icns) {
					for (const format of formats) {
						try {
							const img = MagickImage.create(
								file,
								new MagickReadSettings({
									format: format,
								}),
							);
							const converted = await magickConvert(
								img,
								message.to,
								compression
							);
							outputs.push(converted);
							break;
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
						} catch (_) {
							continue;
						}
					}
				}

				const zip = makeZip(
					outputs.map(
						(img, i) =>
							new File(
								[new Uint8Array(img)],
								`image${i}.${message.to.slice(1)}`,
							),
					),
					"images.zip",
				);
				const zipBytes = await readToEnd(zip.getReader());
				return {
					type: "finished",
					output: zipBytes,
					zip: true,
				};
			}

			// build frames of animated formats (webp/gif)
			// APNG does not work on magick-wasm since it needs ffmpeg built-in (not in magick-wasm) - handle in ffmpeg
			if (
				(message.input.from === ".webp" ||
					message.input.from === ".gif") &&
				(message.to === ".gif" || message.to === ".webp")
			) {
				const collection = MagickImageCollection.create(
					new Uint8Array(buffer),
				);
				const format =
					message.to === ".gif"
						? MagickFormat.Gif
						: MagickFormat.WebP;
				const result = await new Promise<Uint8Array>((resolve) => {
					collection.write(format, (output) => {
						resolve(structuredClone(output));
					});
				});
				collection.dispose();
				return {
					type: "finished",
					output: result,
				};
			}

			const img = MagickImage.create(
				new Uint8Array(buffer),
				new MagickReadSettings({
					format: message.input.from
						.slice(1)
						.toUpperCase() as MagickFormat,
				}),
			);

			const converted = await magickConvert(img, message.to, compression);

			return {
				type: "finished",
				output: converted,
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
	const blob = new Blob(
		chunks.map((chunk) => new Uint8Array(chunk)),
		{ type: "application/zip" },
	);
	const arrayBuffer = await blob.arrayBuffer();
	return new Uint8Array(arrayBuffer);
};

const magickToBlob = async (img: IMagickImage): Promise<Blob> => {
	const canvas = new OffscreenCanvas(img.width, img.height);
	return new Promise<Blob>((resolve, reject) =>
		img.getPixels(async (p) => {
			// const area = p.getArea(0, 0, img.width, img.height);
			// const chunkSize = img.hasAlpha ? 4 : 3;
			// const chunks = Math.ceil(area.length / chunkSize);
			// const data = new Uint8ClampedArray(chunks * 4);

			// for (let j = 0, k = 0; j < area.length; j += chunkSize, k += 4) {
			// 	data[k] = area[j];
			// 	data[k + 1] = area[j + 1];
			// 	data[k + 2] = area[j + 2];
			// 	data[k + 3] = img.hasAlpha ? area[j + 3] : 255;
			// }

			// const ctx = canvas.getContext("2d");
			// if (!ctx) {
			// 	reject(new Error("Failed to get canvas context"));
			// 	return;
			// }

			// console.log(img.width, img.height);

			// console.log(data.length, img.width * img.height * 4);

			// ctx.putImageData(new ImageData(data, img.width, img.height), 0, 0);

			// const blob = await canvas.convertToBlob({
			// 	type: "image/png",
			// });

			const data = p.toByteArray(0, 0, img.width, img.height, "RGBA");
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			if (!data) {
				reject(new Error("Pixel data is null"));
				return;
			}
			const imageData = new ImageData(
				new Uint8ClampedArray(data),
				img.width,
				img.height,
			);

			ctx.putImageData(imageData, 0, 0);
			const blob = await canvas.convertToBlob({
				type: "image/png",
			});

			resolve(blob);
		}),
	);
};

const magickConvert = async (
	img: IMagickImage,
	to: string,
	compression?: number,
) => {
	const intermediary = await magickToBlob(img);
	const buf = new Uint8Array(await intermediary.arrayBuffer());
	let fmt = to.slice(1).toUpperCase();
	if (fmt === "JFIF") fmt = "JPEG";

	const result = await new Promise<Uint8Array>((resolve) => {
		ImageMagick.read(buf, MagickFormat.Png, (image) => {
			// magick-wasm automatically clamps (https://github.com/dlemstra/magick-wasm/blob/76fc6f2b0c0497d2ddc251bbf6174b4dc92ac3ea/src/magick-image.ts#L2480)
			if (compression) image.quality = compression;
			image.write(fmt as unknown as MagickFormat, (o) => {
				resolve(structuredClone(o));
			});
		});
	});

	return result;
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
