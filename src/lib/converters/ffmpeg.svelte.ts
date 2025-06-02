import { VertFile } from "$lib/types";
import { Converter, FormatInfo } from "./converter.svelte";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { browser } from "$app/environment";
import { error, log } from "$lib/logger";
import { addToast } from "$lib/store/ToastProvider";

const videoFormats = [".mkv", ".mp4", ".avi", ".mov", ".webm", ".ts", ".mts", ".m2ts", ".wmv"];

export class FFmpegConverter extends Converter {
	private ffmpeg: FFmpeg = null!;
	public name = "ffmpeg";
	public ready = $state(false);

	public supportedFormats = [
		new FormatInfo("mp3", true, true),
		new FormatInfo("wav", true, true),
		new FormatInfo("flac", true, true),
		new FormatInfo("ogg", true, true),
		new FormatInfo("aac", true, true),
		new FormatInfo("m4a", true, true),
		new FormatInfo("wma", true, true),
		new FormatInfo("amr", true, true),
		new FormatInfo("ac3", true, true),
		new FormatInfo("alac", true, true),
		new FormatInfo("aiff", true, true),
		...videoFormats.map((f) => new FormatInfo(f, true, true, false)),
	];

	public readonly reportsProgress = true;

	constructor() {
		super();
		log(["converters", this.name], `created converter`);
		if (!browser) return;
		try {
			// this is just to cache the wasm and js for when we actually use it. we're not using this ffmpeg instance
			this.ffmpeg = new FFmpeg();
			(async () => {
				const baseURL =
					"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
				await this.ffmpeg.load({
					coreURL: `${baseURL}/ffmpeg-core.js`,
					wasmURL: `${baseURL}/ffmpeg-core.wasm`,
				});
				this.ready = true;
			})();
		} catch (err) {
			error(["converters", this.name], `error loading ffmpeg: ${err}`);
			addToast(
				"error",
				`Error loading ffmpeg, some features may not work.`,
			);
		}
	}

	public async convert(input: VertFile, to: string): Promise<VertFile> {
		if (!to.startsWith(".")) to = `.${to}`;
		const ffmpeg = new FFmpeg();
		ffmpeg.on("progress", (progress) => {
			input.progress = progress.progress * 100;
		});
		ffmpeg.on("log", (l) => {
			log(["converters", this.name], l.message);

			if (l.message.includes("Stream map '0:a:0' matches no streams.")) {
				error(
					["converters", this.name],
					`No audio stream found in ${input.name}.`,
				);
				addToast("error", `No audio stream found in ${input.name}.`);
			}
		});
		const baseURL =
			"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
		await ffmpeg.load({
			coreURL: `${baseURL}/ffmpeg-core.js`,
			wasmURL: `${baseURL}/ffmpeg-core.wasm`,
		});
		const buf = new Uint8Array(await input.file.arrayBuffer());
		await ffmpeg.writeFile("input", buf);
		log(
			["converters", this.name],
			`wrote ${input.name} to ffmpeg virtual fs`,
		);
		if (videoFormats.includes(input.from.slice(1))) {
			// create an audio track from the video
			await ffmpeg.exec(["-i", "input", "-map", "0:a:0", "output" + to]);
		} else if (videoFormats.includes(to.slice(1))) {
			// nab the album art
			await ffmpeg.exec([
				"-i",
				"input",
				"-an",
				"-vcodec",
				"copy",
				"cover.png",
			]);
			const cmd = [
				"-i",
				"input",
				"-i",
				"cover.png",
				"-loop",
				"1",
				"-pix_fmt",
				"yuv420p",
				...toArgs(to),
				"output" + to,
			];
			console.log(cmd);
			await ffmpeg.exec(cmd);
		} else {
			await ffmpeg.exec(["-i", "input", "output" + to]);
		}

		log(["converters", this.name], `executed ffmpeg command`);
		const output = (await ffmpeg.readFile(
			"output" + to,
		)) as unknown as Uint8Array;
		log(
			["converters", this.name],
			`read ${input.name.split(".").slice(0, -1).join(".") + to} from ffmpeg virtual fs`,
		);
		ffmpeg.terminate();
		return new VertFile(new File([output], input.name), to);
	}
}

// and here i was, thinking i'd be done with ffmpeg after finishing vertd
// but OH NO we just HAD to have someone suggest to allow album art video generation.
//
// i hate you SO much.
// - love, maddie
const toArgs = (ext: string): string[] => {
	const encoder = getEncoder(ext);
	const args = ["-c:v", encoder];
	switch (encoder) {
		case "libx264": {
			args.push(
				"-preset",
				"ultrafast",
				"-crf",
				"18",
				"-tune",
				"stillimage",
				"-c:a",
				"aac",
			);
			break;
		}

		case "libvpx": {
			args.push("-c:v", "libvpx-vp9", "-c:a", "libvorbis");
			break;
		}
	}

	return args;
};

const getEncoder = (ext: string): string => {
	switch (ext) {
		case ".mkv":
		case ".mp4":
		case ".avi":
		case ".mov":
			return "libx264";
		case ".webm":
			return "libvpx";
		default:
			return "copy";
	}
};
