<script lang="ts">
	import { duration, fade, transition } from "$lib/animation";
	import { files } from "$lib/store/index.svelte";
	import type { Categories } from "$lib/types";
	import { ChevronDown, SearchIcon } from "lucide-svelte";
	import { onMount } from "svelte";
	import { quintOut } from "svelte/easing";

	type Props = {
		categories: Categories;
		selected?: string;
		onselect?: (option: string) => void;
		disabled?: boolean;
		settingsStyle?: boolean;
	};

	let {
		categories,
		selected = $bindable(""),
		onselect,
		disabled,
		settingsStyle,
	}: Props = $props();

	let open = $state(false);
	let hover = $state(false);
	let isUp = $state(false);
	let dropdown = $state<HTMLDivElement>();
	let currentCategory = $state<string | null>();
	let shownCategories = $state<string[]>(Object.keys(categories));

	const selectOption = (option: string) => {
		const oldIndex =
			currentCategory &&
			categories[currentCategory]?.formats.indexOf(selected || "");
		const newIndex =
			currentCategory &&
			categories[currentCategory]?.formats.indexOf(option);
		isUp = (oldIndex ?? 0) > (newIndex ?? 0);
		selected = option;
		open = false;
		onselect?.(option);
	};

	const selectCategory = (category: string) => {
		if (categories[category]) {
			currentCategory = category;
			console.log(`Selected category: ${category}`);
			console.log(`Formats: ${categories[category].formats.join(", ")}`);
		}
	};

	const search = (event: Event) => {
		const query = (event.target as HTMLInputElement).value;
		console.log(`Searching for: ${query}`);
		// TODO: search logic
	};

	onMount(() => {
		const click = (e: MouseEvent) => {
			if (dropdown && !dropdown.contains(e.target as Node)) {
				open = false;
			}
		};

		window.addEventListener("click", click);

		// depending on selected, find category
		if (selected) {
			currentCategory = Object.keys(categories).find((cat) =>
				categories[cat].formats.includes(selected),
			);
			if (!currentCategory) {
				currentCategory = Object.keys(categories)[0] || null;
			}

			shownCategories = Object.keys(categories).filter(
				(cat) =>
					cat === currentCategory ||
					categories[cat].canConvertTo?.includes(
						currentCategory || "",
					),
			);
		} else {
			// find current category based on files
			const fileCategories = [
				...new Set(
					files.files
						.map(f =>
							Object.keys(categories).find(cat =>
								categories[cat].formats.includes(f.from),
							),
						)
						.filter(Boolean),
				),
			];
			currentCategory = fileCategories[0] || Object.keys(categories)[0] || null;

			// only show categories that can convert to current category / itself
			shownCategories = Object.keys(categories).filter(
				cat =>
					cat === currentCategory ||
					categories[cat].canConvertTo?.includes(currentCategory || ""),
			);

			// if no selected format, select first format of current category
			if (
				!selected &&
				currentCategory &&
				categories[currentCategory].formats.length > 0
			)
				selected = categories[currentCategory].formats[0];
		}

		return () => window.removeEventListener("click", click);
	});
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
		onclick={() => (open = !open)}
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
			{#if currentCategory}
				{#each categories[currentCategory].formats as option}
					<p
						class="col-start-1 row-start-1 invisible pointer-events-none"
					>
						{option}
					</p>
				{/each}
			{/if}
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
			class="w-[250%] min-w-full shadow-xl bg-panel-alt shadow-black/25 absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 rounded-2xl overflow-hidden"
		>
			<!-- search box -->
			<div class="p-3 w-full">
				<div class="relative">
					<input
						type="text"
						placeholder="Search format"
						class="flex-grow w-full !pl-11 !pr-3 rounded-lg bg-panel text-foreground"
						oninput={search}
					/>
					<span
						class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center"
					>
						<SearchIcon class="w-4 h-4" />
					</span>
				</div>
			</div>

			<!-- categories and formats -->
			<div class="flex items-center justify-between">
				{#each shownCategories as category}
					<button
						class="flex-grow text-lg text-muted hover:text-muted/20 border-b-[1px] pb-2 capitalize
                        {currentCategory === category
							? 'text-accent border-b-accent'
							: 'border-b-separator'}"
						onclick={() => selectCategory(category)}
					>
						{category}
					</button>
				{/each}
			</div>

			<div class="max-h-80 overflow-y-auto grid grid-cols-3 gap-2 p-2">
				{#if currentCategory}
					{#each categories[currentCategory].formats as option}
						<button
							class="w-full p-2 text-center rounded-xl
                            {option === selected
								? 'bg-accent text-black'
								: 'hover:bg-panel'}"
							onclick={() => selectOption(option)}
						>
							{option}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
