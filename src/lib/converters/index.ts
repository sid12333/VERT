import type { Categories } from "$lib/types";
import { FFmpegConverter } from "./ffmpeg.svelte";
import { PandocConverter } from "./pandoc.svelte";
import { VertdConverter } from "./vertd.svelte";
import { MagickConverter } from "./magick.svelte";

export const converters = [
	new MagickConverter(),
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
	video: { formats: [""], canConvertTo: [] }, // add "audio" when "nullptr/experimental-audio-to-video" is implemented
	audio: { formats: [""], canConvertTo: [] }, // add "video" when "nullptr/experimental-audio-to-video" is implemented
	docs: { formats: [""], canConvertTo: [] },
};

categories.audio.formats =
	converters
		.find((c) => c.name === "ffmpeg")
		?.formatStrings((f) => f.toSupported) || [];
categories.video.formats =
	converters
		.find((c) => c.name === "vertd")
		?.formatStrings((f) => f.toSupported) || [];
categories.image.formats =
	converters
		.find((c) => c.name === "imagemagick")
		?.formatStrings((f) => f.toSupported) || [];
categories.docs.formats =
	converters
		.find((c) => c.name === "pandoc")
		?.formatStrings((f) => f.toSupported) || [];
