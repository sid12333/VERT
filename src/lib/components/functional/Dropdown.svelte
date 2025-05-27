<script lang="ts">
	import { duration, fade, transition } from "$lib/animation";
	import type { Categories } from "$lib/types";
	import { ChevronDown, SearchIcon } from "lucide-svelte";
	import { onMount } from "svelte";
	import { quintOut } from "svelte/easing";

	type Props = {
		options: string[];
		categories: Categories;
		selected?: string;
		onselect?: (option: string) => void;
		disabled?: boolean;
		settingsStyle?: boolean;
	};

	let {
		options,
		selected = $bindable(options[0]),
		onselect,
		disabled,
		settingsStyle,
	}: Props = $props();

	let open = $state(false);
	let hover = $state(false);
	let isUp = $state(false);
	let dropdown = $state<HTMLDivElement>();

	const toggle = () => {
		open = !open;
	};

	const select = (option: string) => {
		const oldIndex = options.indexOf(selected || "");
		const newIndex = options.indexOf(option);
		isUp = oldIndex > newIndex;
		selected = option;
		onselect?.(option);
		toggle();
	};

	onMount(() => {
		const click = (e: MouseEvent) => {
			if (dropdown && !dropdown.contains(e.target as Node)) {
				open = false;
			}
		};

		window.addEventListener("click", click);
		return () => window.removeEventListener("click", click);
	});

	function search(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		// TODO: search logic
		console.log(`Searching for: ${query}`);
	}
</script>

<div
	class="relative w-full min-w-fit {settingsStyle
		? 'font-normal'
		: 'text-xl font-medium'} text-center"
	bind:this={dropdown}
>
	<button
		class="font-display w-full {settingsStyle
			? 'justify-between'
			: 'justify-center'} overflow-hidden relative cursor-pointer {settingsStyle
			? 'px-4'
			: 'px-3'} py-3.5 bg-button {disabled
			? 'opacity-50 cursor-auto'
			: 'cursor-pointer'} flex items-center {settingsStyle
			? 'rounded-xl'
			: 'rounded-full'} focus:!outline-none"
		onclick={toggle}
		onmouseenter={() => (hover = true)}
		onmouseleave={() => (hover = false)}
		{disabled}
	>
		<!-- <p>{selected}</p> -->
		<div class="grid grid-cols-1 grid-rows-1 w-fit flex-grow-0">
			{#key selected}
				<p
					in:fade={{
						duration,
						easing: quintOut,
					}}
					out:fade={{
						duration,
						easing: quintOut,
					}}
					class="col-start-1 row-start-1 {settingsStyle
						? 'text-left'
						: 'text-center'} font-body {settingsStyle
						? 'font-normal'
						: 'font-medium'}"
				>
					{selected}
				</p>
			{/key}
			{#each options as option}
				<p
					class="col-start-1 row-start-1 invisible pointer-events-none"
				>
					{option}
				</p>
			{/each}
		</div>
		<ChevronDown
			class="w-4 h-4 ml-4 mt-0.5 flex-shrink-0"
			style="transform: rotate({open
				? 180
				: 0}deg); transition: transform {duration}ms {transition};"
		/>
	</button>
	{#if open}
		<!-- TODO: fix positioning for mobile -->
		<div
			style={hover ? "will-change: opacity, fade, transform" : ""}
			transition:fade={{
				duration,
				easing: quintOut,
			}}
			class="w-[250%] min-w-full shadow-xl bg-panel-alt shadow-black/25 absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 rounded-xl overflow-hidden"
		>
			<!-- search box -->
			<div class="p-3">
				<div class="flex w-full items-center">
					<div
						class="flex-shrink-0 flex-grow-0 basis-1/6 flex justify-center"
					>
						<SearchIcon class="w-4 h-4 text-text-secondary" />
					</div>
					<input
						type="text"
						placeholder="Search format"
						class="flex-grow basis-5/6 rounded-lg bg-panel text-foreground"
						oninput={search}
					/>
				</div>
			</div>

			<!-- categories and formats -->
			<div class="max-h-80 overflow-y-auto">
				{#each options as option}
					<button
						class="w-full p-2 px-4 text-left hover:bg-panel"
						onclick={() => select(option)}
					>
						{option}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
