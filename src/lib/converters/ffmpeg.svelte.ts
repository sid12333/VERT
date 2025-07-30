import { VertFile } from "$lib/types";
import { Converter, FormatInfo } from "./converter.svelte";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { browser } from "$app/environment";
import { error, log } from "$lib/logger";
import { addToast } from "$lib/store/ToastProvider";
import { m } from "$lib/paraglide/messages";

// TODO: differentiate in UI? (not native formats)
const videoFormats = [
	"mkv",
	"mp4",
	"avi",
	"mov",
	"webm",
	"ts",
	"mts",
	"m2ts",
	"wmv",
	"mpg",
	"mpeg",
	"flv",
	"f4v",
	"vob",
	"m4v",
	"3gp",
	"3g2",
	"mxf",
	"ogv",
	"rm",
	"rmvb",
	"divx",
];

export class FFmpegConverter extends Converter {
	private ffmpeg: FFmpeg = null!;
	public name = "ffmpeg";
	public ready = $state(false);

	public supportedFormats = [
		new FormatInfo("mp3", true, true),
		new FormatInfo("wav", true, true),
		new FormatInfo("flac", true, true),
		new FormatInfo("ogg", true, true),
		new FormatInfo("mogg", true, false),
		new FormatInfo("oga", true, true),
		new FormatInfo("opus", true, true),
		new FormatInfo("aac", true, true),
		new FormatInfo("m4a", true, true),
		new FormatInfo("wma", true, true),
		new FormatInfo("amr", true, true),
		new FormatInfo("ac3", true, true),
		new FormatInfo("alac", true, true),
		new FormatInfo("aiff", true, true),
		new FormatInfo("aif", true, true),
		new FormatInfo("mp1", true, false),
		new FormatInfo("mp2", true, true),
		new FormatInfo("mpc", true, false), // unknown if it works, can't find sample file but ffmpeg should support i think?
		//new FormatInfo("raw", true, false), // usually pcm
		new FormatInfo("dsd", true, false), // dsd
		new FormatInfo("dsf", true, false), // dsd
		new FormatInfo("dff", true, false), // dsd
		new FormatInfo("mqa", true, false),
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
			addToast("error", m["workers.errors.ffmpeg"]());
		}
	}

	public async convert(input: VertFile, to: string): Promise<VertFile> {
		if (!to.startsWith(".")) to = `.${to}`;

		const ffmpeg = await this.setupFFmpeg(input);
		const buf = new Uint8Array(await input.file.arrayBuffer());
		await ffmpeg.writeFile("input", buf);
		log(
			["converters", this.name],
			`wrote ${input.name} to ffmpeg virtual fs`,
		);

		const command = await this.buildConversionCommand(ffmpeg, input, to);
		log(["converters", this.name], `FFmpeg command: ${command.join(" ")}`);
		await ffmpeg.exec(command);
		log(["converters", this.name], "executed ffmpeg command");

		const output = (await ffmpeg.readFile(
			"output" + to,
		)) as unknown as Uint8Array;
		const outputFileName =
			input.name.split(".").slice(0, -1).join(".") + to;
		log(
			["converters", this.name],
			`read ${outputFileName} from ffmpeg virtual fs`,
		);
		ffmpeg.terminate();

		return new VertFile(new File([output], input.name), to);
	}

	private async setupFFmpeg(input: VertFile): Promise<FFmpeg> {
		const ffmpeg = new FFmpeg();

		ffmpeg.on("progress", (progress) => {
			input.progress = progress.progress * 100;
		});

		ffmpeg.on("log", (l) => {
			log(["converters", this.name], l.message);
			if (l.message.includes("Stream map '0:a:0' matches no streams.")) {
				const fileName = input.name;
				error(
					["converters", this.name],
					`No audio stream found in ${fileName}.`,
				);
				addToast("error", `No audio stream found in ${fileName}.`);
			}
		});

		const baseURL =
			"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
		await ffmpeg.load({
			coreURL: `${baseURL}/ffmpeg-core.js`,
			wasmURL: `${baseURL}/ffmpeg-core.wasm`,
		});

		return ffmpeg;
	}

	private async buildConversionCommand(
		ffmpeg: FFmpeg,
		input: VertFile,
		to: string,
	): Promise<string[]> {
		const inputFormat = input.from.slice(1);
		const outputFormat = to.slice(1);

		// video to audio
		if (videoFormats.includes(inputFormat)) {
			log(
				["converters", this.name],
				`Converting video ${input.from} to audio ${to}`,
			);
			return ["-i", "input", "-map", "0:a:0", "output" + to];
		}

		// audio to video
		if (videoFormats.includes(outputFormat)) {
			log(
				["converters", this.name],
				`Converting audio ${input.from} to video ${to}`,
			);

			const hasAlbumArt = await this.extractAlbumArt(ffmpeg);

			if (hasAlbumArt) {
				log(
					["converters", this.name],
					"Using album art as video background",
				);
				const codecArgs = toArgs(to);
				return [
					"-loop",
					"1",
					"-i",
					"cover.jpg",
					"-i",
					"input",
					"-vf",
					"scale=trunc(iw/2)*2:trunc(ih/2)*2",
					"-shortest",
					"-pix_fmt",
					"yuv420p",
					"-r",
					"1",
					...codecArgs,
					"output" + to,
				];
			} else {
				log(["converters", this.name], "Using solid color background");
				const codecArgs = toArgs(to);
				return [
					"-f",
					"lavfi",
					"-i",
					"color=c=black:s=512x512:rate=1",
					"-i",
					"input",
					"-shortest",
					"-pix_fmt",
					"yuv420p",
					"-r",
					"1",
					...codecArgs,
					"output" + to,
				];
			}
		}

		// fallback
		log(["converters", this.name], `Converting ${input.from} to ${to}`);
		return ["-i", "input", "output" + to];
	}

	private async extractAlbumArt(ffmpeg: FFmpeg): Promise<boolean> {
		//  extract using stream mapping (should work for most)
		if (
			await this.tryExtractAlbumArt(ffmpeg, [
				"-i",
				"input",
				"-map",
				"0:1",
				"-c:v",
				"copy",
				"-update",
				"1",
				"cover.jpg",
			])
		) {
			log(
				["converters", this.name],
				"Successfully extracted album art from stream 0:1",
			);
			return true;
		}

		// fallback: extract without stream mapping (this probably won't happen)
		if (
			await this.tryExtractAlbumArt(ffmpeg, [
				"-i",
				"input",
				"-an",
				"-c:v",
				"copy",
				"-update",
				"1",
				"cover.jpg",
			])
		) {
			log(
				["converters", this.name],
				"Successfully extracted album art (fallback method)",
			);
			return true;
		}

		log(
			["converters", this.name],
			"No album art found, will create solid color background",
		);
		return false;
	}

	private async tryExtractAlbumArt(
		ffmpeg: FFmpeg,
		command: string[],
	): Promise<boolean> {
		try {
			await ffmpeg.exec(command);
			const coverData = await ffmpeg.readFile("cover.jpg");
			return !!(coverData && (coverData as Uint8Array).length > 0);
		} catch {
			return false;
		}
	}
}

// and here i was, thinking i'd be done with ffmpeg after finishing vertd
// but OH NO we just HAD to have someone suggest to allow album art video generation.
//
// i hate you SO much.
// - love, maddie
const toArgs = (ext: string): string[] => {
	const codecs = getCodecs(ext);
	const args = ["-c:v", codecs.video];

	switch (codecs.video) {
		case "libx264": {
			args.push(
				"-preset",
				"ultrafast",
				"-crf",
				"18",
				"-tune",
				"stillimage",
			);
			break;
		}

		case "libvpx": {
			args.push("-c:v", "libvpx-vp9");
			break;
		}

		case "mpeg4": {
			// for avi and divx
			break;
		}

		case "mpeg2video": {
			// for mpeg, mpg, vob, mxf
			if (ext === ".mxf") args.push("-ar", "48000"); // force 48kHz sample rate
			break;
		}

		case "libtheora": {
			// for ogv
			break;
		}

		case "wmv2": {
			// for wmv
			break;
		}
	}

	args.push("-c:a", codecs.audio);

	if (codecs.audio === "aac") args.push("-strict", "experimental");

	if (ext === ".divx") args.unshift("-f", "avi");
	if (ext === ".mxf") args.push("-strict", "unofficial");

	return args;
};

const getCodecs = (ext: string): { video: string; audio: string } => {
	switch (ext) {
		case ".mp4":
		case ".mkv":
		case ".mov":
		case ".mts":
		case ".ts":
		case ".m2ts":
		case ".flv":
		case ".f4v":
		case ".m4v":
		case ".3gp":
		case ".3g2":
			return { video: "libx264", audio: "aac" };

		case ".wmv":
			return { video: "wmv2", audio: "wmav2" };

		case ".webm":
		case ".ogv":
			return {
				video: ext === ".webm" ? "libvpx" : "libtheora",
				audio: "libvorbis",
			};

		case ".avi":
		case ".divx":
			return { video: "mpeg4", audio: "libmp3lame" };

		case ".mpg":
		case ".mpeg":
		case ".vob":
			return { video: "mpeg2video", audio: "mp2" };

		case ".mxf":
			return { video: "mpeg2video", audio: "pcm_s16le" };

		default:
			return { video: "libx264", audio: "aac" };
	}
};
