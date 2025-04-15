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
