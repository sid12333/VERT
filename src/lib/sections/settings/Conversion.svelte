<script lang="ts">
	import FancyTextInput from "$lib/components/functional/FancyInput.svelte";
	import Panel from "$lib/components/visual/Panel.svelte";
	import { RefreshCwIcon } from "lucide-svelte";
	import type { ISettings } from "./index.svelte";
	import {
		CONVERSION_BITRATES,
		type ConversionBitrate,
	} from "$lib/converters/ffmpeg.svelte";
	import { m } from "$lib/paraglide/messages";
	import Dropdown from "$lib/components/functional/Dropdown.svelte";
	import FancyInput from "$lib/components/functional/FancyInput.svelte";

	const { settings }: { settings: ISettings } = $props();
</script>

<Panel class="flex flex-col gap-8 p-6">
	<div class="flex flex-col gap-3">
		<h2 class="text-2xl font-bold">
			<RefreshCwIcon
				size="40"
				class="inline-block -mt-1 mr-2 bg-accent p-2 rounded-full"
				color="black"
			/>
			{m["settings.conversion.title"]()}
		</h2>
		<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<p class="text-base font-bold">
						{m["settings.conversion.filename_format"]()}
					</p>
					<p class="text-sm text-muted font-normal">
						{@html m["settings.conversion.filename_description"]()}
					</p>
				</div>
				<FancyTextInput
					placeholder="VERT_%name%"
					bind:value={settings.filenameFormat}
					extension=".ext"
					type="text"
				/>
			</div>
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<p class="text-base font-bold">
						{m["settings.conversion.quality"]()}
					</p>
					<p class="text-sm text-muted font-normal">
						{m["settings.conversion.quality_description"]()}
					</p>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-2">
						<p class="text-sm font-bold">
							{m["settings.conversion.quality_images"]()}
						</p>
						<FancyInput
							bind:value={
								settings.magickQuality as unknown as string
							}
							type="number"
							min={1}
							max={100}
							extension={"%"}
						/>
					</div>
					<div class="flex flex-col gap-2">
						<p class="text-sm font-bold">
							{m["settings.conversion.quality_audio"]()}
						</p>
						<Dropdown
							options={CONVERSION_BITRATES.map((b) =>
								b.toString(),
							)}
							selected={settings.ffmpegQuality.toString()}
							onselect={(option: string) =>
								(settings.ffmpegQuality =
									option as ConversionBitrate)}
							settingsStyle
						/>
					</div>
				</div>
			</div>
		</div>
	</div></Panel
>
