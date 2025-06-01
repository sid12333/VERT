import type { Categories } from "$lib/types";
import type { Converter } from "./converter.svelte";
import { FFmpegConverter } from "./ffmpeg.svelte";
import { PandocConverter } from "./pandoc.svelte";
import { VertdConverter } from "./vertd.svelte";
import { VipsConverter } from "./vips.svelte";

export const converters = [
	new VipsConverter(),
	new FFmpegConverter(),
	new VertdConverter(),
	new PandocConverter(),
];

export function getConverterByFormat(format: string) {
	for (const converter of converters) {
		if (converter.supportedFormats.some((f) => f.name === format)) {
			return converter;
		}
	}
	return null;
}

export const categories: Categories = {
	image: { formats: [""], canConvertTo: [] },
	video: { formats: [""], canConvertTo: ["audio"] },
	audio: { formats: [""], canConvertTo: ["video"] },
	docs: { formats: [""], canConvertTo: [] },
};

categories.audio.formats =
	converters
		.find((c) => c.name === "ffmpeg")
		?.supportedFormats.filter((f) => f.toSupported && f.isNative)
		.map((f) => f.name) || [];
categories.video.formats =
	converters
		.find((c) => c.name === "vertd")
		?.supportedFormats.filter((f) => f.toSupported && f.isNative)
		.map((f) => f.name) || [];
categories.image.formats =
	converters
		.find((c) => c.name === "libvips")
		?.supportedFormats.filter((f) => f.toSupported && f.isNative)
		.map((f) => f.name) || [];
categories.docs.formats =
	converters
		.find((c) => c.name === "pandoc")
		?.supportedFormats.filter((f) => f.toSupported && f.isNative)
		.map((f) => f.name) || [];

export const byNative = (format: string) => {
	return (a: Converter, b: Converter) => {
		const aFormat = a.supportedFormats.find((f) => f.name === format);
		const bFormat = b.supportedFormats.find((f) => f.name === format);

		if (aFormat && bFormat) {
			return aFormat.isNative ? -1 : 1;
		}
		return 0;
	};
};
