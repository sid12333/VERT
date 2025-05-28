import type { VertFile } from "$lib/types";

export class FormatInfo {
	public name: string;

	constructor(
		name: string,
		public fromSupported = true,
		public toSupported = true,
		public isNative = true,
	) {
		this.name = name;
		if (!this.name.startsWith(".")) {
			this.name = `.${this.name}`;
		}

		if (!this.fromSupported && !this.toSupported) {
			throw new Error("Format must support at least one direction");
		}
	}
}

/**
 * Base class for all converters.
 */
export class Converter {
	/**
	 * The public name of the converter.
	 */
	public name: string = "Unknown";
	/**
	 * List of supported formats.
	 */
	public supportedFormats: FormatInfo[] = [];
	/**
	 * Convert a file to a different format.
	 * @param input The input file.
	 * @param to The format to convert to. Includes the dot.
	 */
	public ready: boolean = $state(false);
	public readonly reportsProgress: boolean = false;

	public async convert(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		input: VertFile,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		to: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
		...args: any[]
	): Promise<VertFile> {
		throw new Error("Not implemented");
	}

	public async valid(): Promise<boolean> {
		return true;
	}

	public formatStrings(predicate?: (f: FormatInfo) => boolean) {
		if (predicate) {
			return this.supportedFormats.filter(predicate).map((f) => f.name);
		}
		return this.supportedFormats.map((f) => f.name);
	}
}
