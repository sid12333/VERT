<script lang="ts">
	import Panel from "$lib/components/visual/Panel.svelte";
	import { ChartColumnIcon, PauseIcon, PlayIcon } from "lucide-svelte";
	import type { ISettings } from "./index.svelte";
	import { effects } from "$lib/store/index.svelte";
	import { m } from "$lib/paraglide/messages";
	import { link } from "$lib/store/index.svelte";

	const { settings }: { settings: ISettings } = $props();
</script>

<Panel class="flex flex-col gap-8 p-6">
	<div class="flex flex-col gap-3">
		<h2 class="text-2xl font-bold">
			<ChartColumnIcon
				size="40"
				class="inline-block -mt-1 mr-2 bg-accent-blue p-2 rounded-full"
				color="black"
			/>
			{m["settings.privacy.title"]()}
		</h2>
		<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<p class="text-base font-bold">
						{m["settings.privacy.plausible_title"]()}
					</p>
					<p class="text-sm text-muted font-normal">
						{@html link(
							["plausible_link", "analytics_link"],
							m["settings.privacy.plausible_description"](),
							[
								"https://plausible.io/privacy-focused-web-analytics",
								"https://ats.vert.sh/vert.sh",
							],
						)}
					</p>
				</div>
				<div class="flex flex-col gap-3 w-full">
					<div class="flex gap-3 w-full">
						<button
							onclick={() => (settings.plausible = true)}
							class="btn {$effects
								? ''
								: '!scale-100'} {settings.plausible
								? 'selected'
								: ''} flex-1 p-4 rounded-lg text-black dynadark:text-white flex items-center justify-center"
						>
							<PlayIcon size="24" class="inline-block mr-2" />
							{m["settings.privacy.opt_in"]()}
						</button>

						<button
							onclick={() => (settings.plausible = false)}
							class="btn {$effects
								? ''
								: '!scale-100'} {settings.plausible
								? ''
								: 'selected'} flex-1 p-4 rounded-lg text-black dynadark:text-white flex items-center justify-center"
						>
							<PauseIcon size="24" class="inline-block mr-2" />
							{m["settings.privacy.opt_out"]()}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div></Panel
>
