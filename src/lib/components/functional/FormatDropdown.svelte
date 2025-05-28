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
	let dropdown = $state<HTMLDivElement>();
	let currentCategory = $state<string | null>();
	let searchQuery = $state("");

	// initialize current category
	$effect(() => {
		if (!currentCategory) {
			if (selected) {
				const foundCat = Object.keys(categories).find((cat) =>
					categories[cat].formats.includes(selected),
				);
				currentCategory =
					foundCat || Object.keys(categories)[0] || null;
			} else {
				// find category based on file types
				const fileFormats = files.files.map((f) => f.from);
				const foundCat = Object.keys(categories).find((cat) =>
					fileFormats.some((format) =>
						categories[cat].formats.includes(format),
					),
				);
				currentCategory =
					foundCat || Object.keys(categories)[0] || null;
			}
		}
	});

	// other available categories based on current category (e.g. converting between video and audio)
	const availableCategories = $derived.by(() => {
		if (!currentCategory) return Object.keys(categories);

		return Object.keys(categories).filter(
			(cat) =>
				cat === currentCategory ||
				categories[cat].canConvertTo?.includes(currentCategory || ""),
		);
	});

	const filteredData = $derived.by(() => {
		if (!searchQuery) {
			return {
				categories: availableCategories,
				formats: currentCategory
					? categories[currentCategory].formats
					: [],
			};
		}

		// filter formats across all available categories
		const allFormats = availableCategories.flatMap((cat) =>
			categories[cat].formats.filter((format) =>
				format.toLowerCase().includes(searchQuery.toLowerCase()),
			),
		);

		// filter categories that have matching formats
		const matchingCategories = availableCategories.filter((cat) =>
			categories[cat].formats.some((format) =>
				format.toLowerCase().includes(searchQuery.toLowerCase()),
			),
		);

		return {
			categories: matchingCategories,
			formats: allFormats,
		};
	});

	const selectOption = (option: string) => {
		selected = option;
		open = false;
		onselect?.(option);
	};

	const selectCategory = (category: string) => {
		if (categories[category]) {
			currentCategory = category;
			// clear search when switching categories
			searchQuery = "";
		}
	};

	const handleSearch = (event: Event) => {
		searchQuery = (event.target as HTMLInputElement).value;
	};

	onMount(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdown && !dropdown.contains(e.target as Node)) {
				open = false;
			}
		};

		window.addEventListener("click", handleClickOutside);
		return () => window.removeEventListener("click", handleClickOutside);
	});

	// initialize selected format if none chosen
	$effect(() => {
		if (
			!selected &&
			currentCategory &&
			categories[currentCategory]?.formats?.length > 0
		) {
			const from = files.files[0]?.from;
			const firstDiff = categories[currentCategory].formats.find(
				(f) => f !== from,
			);
			selected = firstDiff || categories[currentCategory].formats[0];
		}
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
						bind:value={searchQuery}
						oninput={handleSearch}
					/>
					<span
						class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center"
					>
						<SearchIcon class="w-4 h-4" />
					</span>
				</div>
			</div>

			<!-- available categories -->
			<div class="flex items-center justify-between">
				{#each filteredData.categories as category}
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

			<!-- available formats -->
			<div class="max-h-80 overflow-y-auto grid grid-cols-3 gap-2 p-2">
				{#each filteredData.formats as format}
					<button
						class="w-full p-2 text-center rounded-xl
                        {format === selected
							? 'bg-accent text-black'
							: 'hover:bg-panel'}"
						onclick={() => selectOption(format)}
					>
						{format}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
