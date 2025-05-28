<script lang="ts">
	import Panel from "$lib/components/visual/Panel.svelte";
	import { ChartColumnIcon, PauseIcon, PlayIcon } from "lucide-svelte";
	import type { ISettings } from "./index.svelte";
	import { effects } from "$lib/store/index.svelte";

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
			Privacy
		</h2>
		<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<p class="text-base font-bold">Plausible analytics</p>
					<p class="text-sm text-muted font-normal">
						We use <a
							href="https://plausible.io/privacy-focused-web-analytics"
							target="_blank"
							rel="noopener noreferrer">Plausible</a
						>, a privacy-focused analytics tool, to gather
						completely anonymous statistics. All data is anonymized
						and aggregated, and no identifiable information is ever
						sent or stored. You can view the analytics
						<a
							href="https://ats.vert.sh/vert.sh"
							target="_blank"
							rel="noopener noreferrer">here</a
						> and choose to opt out below.
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
							Opt-in
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
							Opt-out
						</button>
					</div>
				</div>
			</div>
		</div>
	</div></Panel
>
