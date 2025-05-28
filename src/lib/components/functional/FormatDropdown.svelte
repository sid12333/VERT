<script lang="ts">
	import { duration, fade, transition } from "$lib/animation";
	import { isMobile, files } from "$lib/store/index.svelte";
	import type { Categories } from "$lib/types";
	import { ChevronDown, SearchIcon } from "lucide-svelte";
	import { onMount } from "svelte";
	import { quintOut } from "svelte/easing";

	type Props = {
		categories: Categories;
		selected?: string;
		onselect?: (option: string) => void;
		disabled?: boolean;
	};

	let {
		categories,
		selected = $bindable(""),
		onselect,
		disabled,
	}: Props = $props();
	let open = $state(false);
	let hover = $state(false);
	let dropdown = $state<HTMLDivElement>();
	let initialCategory = $state<string | null>();
	let currentCategory = $state<string | null>();
	let searchQuery = $state("");
	let dropdownMenu: HTMLElement | undefined = $state();

	// initialize current category
	$effect(() => {
		if (!currentCategory) {
			if (selected) {
				const foundCat = Object.keys(categories).find((cat) =>
					categories[cat].formats.includes(selected),
				);
				currentCategory =
					foundCat || Object.keys(categories)[0] || null;
				initialCategory = currentCategory;
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
				initialCategory = currentCategory;
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

	const shouldShowFormat = (format: string, category: string): boolean => {
		const currentFileExt = files.files[0]?.from;
		if (!currentFileExt) return true;

		if (category === initialCategory) {
			return true;
		} else if (
			initialCategory &&
			categories[initialCategory].formats.includes(format)
		) {
			return false;
		}

		const formatInOtherCategories = Object.keys(categories)
			.filter((cat) => cat !== category)
			.some((cat) => categories[cat].formats.includes(format));

		if (formatInOtherCategories) {
			const nativeCategory = Object.keys(categories).find((cat) =>
				cat.toLowerCase().includes(format.slice(1)),
			);

			return category === nativeCategory;
		}

		return true;
	};

	const filteredData = $derived.by(() => {
		// if no query, return formats for current category
		if (!searchQuery) {
			return {
				categories: availableCategories,
				formats: currentCategory
					? categories[currentCategory].formats.filter((format) =>
							shouldShowFormat(format, currentCategory || ""),
						)
					: [],
			};
		}
		const searchLower = searchQuery.toLowerCase();

		// find all categories that have formats matching the search query
		const matchingCategories = availableCategories.filter((cat) =>
			categories[cat].formats.some(
				(format) =>
					format.toLowerCase().includes(searchLower) &&
					shouldShowFormat(format, cat),
			),
		);
		if (matchingCategories.length === 0) {
			return {
				categories: availableCategories,
				formats: [],
			};
		}

		// find all matching formats across all categories
		const allMatchingFormats = matchingCategories.flatMap((cat) => {
			return categories[cat].formats
				.filter(
					(format) =>
						format.toLowerCase().includes(searchLower) &&
						shouldShowFormat(format, cat),
				)
				.map((format) => ({ format, category: cat }));
		});

		// if current category has no matches, switch to first category that does
		const currentCategoryHasMatches =
			currentCategory &&
			allMatchingFormats.some(
				(item) => item.category === currentCategory,
			);
		if (!currentCategoryHasMatches && matchingCategories.length > 0) {
			const newCategory = matchingCategories[0];
			currentCategory = newCategory;
		}

		// return formats only from the current category that match the search
		const filteredFormats = currentCategory
			? categories[currentCategory].formats.filter(
					(format) =>
						format.toLowerCase().includes(searchLower) &&
						shouldShowFormat(format, currentCategory || ""),
				)
			: [];
		return {
			categories:
				matchingCategories.length > 0
					? matchingCategories
					: availableCategories,
			formats: filteredFormats,
		};
	});

	const selectOption = (option: string) => {
		selected = option;
		open = false;

		// find the category of this option if it's not in the current category
		if (
			currentCategory &&
			!categories[currentCategory].formats.includes(option)
		) {
			const formatCategory = Object.keys(categories).find((cat) =>
				categories[cat].formats.includes(option),
			);

			if (formatCategory) {
				currentCategory = formatCategory;
			}
		}

		onselect?.(option);
	};

	const selectCategory = (category: string) => {
		if (!categories[category]) return;
		currentCategory = category;
	};

	const handleSearch = (event: Event) => {
		const query = (event.target as HTMLInputElement).value;
		searchQuery = query;

		// find which categories have matching formats & switch
		if (query) {
			const queryLower = query.toLowerCase();
			const categoriesWithMatches = availableCategories.filter((cat) =>
				categories[cat].formats.some(
					(format) =>
						format.toLowerCase().includes(queryLower) &&
						shouldShowFormat(format, cat),
				),
			);

			if (categoriesWithMatches.length > 0) {
				const currentHasMatches =
					currentCategory &&
					categories[currentCategory].formats.some(
						(format) =>
							format.toLowerCase().includes(queryLower) &&
							shouldShowFormat(format, currentCategory || ""),
					);

				if (!currentHasMatches) {
					currentCategory = categoriesWithMatches[0];
				}
			}
		}
	};

	const clickDropdown = () => {
		open = !open;
		if (open) {
			setTimeout(() => {
				if (dropdownMenu) {
					const searchInput = dropdownMenu.querySelector(
						"#format-search",
					) as HTMLInputElement;
					if (searchInput) {
						searchInput.focus();
						searchInput.select();
					}
				}
			}, 0); // let dropdown open first
		}
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
	class="relative w-full min-w-fit text-xl font-medium text-center"
	bind:this={dropdown}
>
	<button
		class="relative flex items-center justify-center w-full font-display  px-3 py-3.5 bg-button rounded-full overflow-hidden cursor-pointer focus:!outline-none
		{disabled ? 'opacity-50 cursor-auto' : 'cursor-pointer'}"
		onclick={() => clickDropdown()}
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
					class="col-start-1 row-start-1 text-center font-body font-medium"
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
		<div
			bind:this={dropdownMenu}
			transition:fade={{
				duration,
				easing: quintOut,
			}}
			class={$isMobile
				? "fixed inset-x-0 bottom-0 w-full z-[200] shadow-xl bg-panel-alt shadow-black/25 rounded-t-2xl overflow-hidden"
				: "w-[250%] min-w-full shadow-xl bg-panel-alt shadow-black/25 absolute -translate-x-1/2 top-full mt-2 z-50 rounded-2xl overflow-hidden"}
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
						onfocus={() => {}}
						id="format-search"
						autocomplete="off"
					/>
					<span
						class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center"
					>
						<SearchIcon class="w-4 h-4" />
					</span>
					{#if searchQuery}
						<span
							class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted"
							style="font-size: 0.7rem;"
						>
							{filteredData.formats.length}
							{filteredData.formats.length === 1
								? "result"
								: "results"}
						</span>
					{/if}
				</div>
			</div>
			<!-- available categories -->
			<div class="flex items-center justify-between">
				{#each filteredData.categories as category}
					<button
						class="flex-grow text-lg hover:text-muted/20 border-b-[1px] pb-2 capitalize
                        {currentCategory === category
							? 'text-accent border-b-accent'
							: 'border-b-separator text-muted'}"
						onclick={() => selectCategory(category)}
					>
						{category}
					</button>
				{/each}
			</div>
			<!-- available formats -->
			<div class="max-h-80 overflow-y-auto grid grid-cols-3 gap-2 p-2">
				{#if filteredData.formats.length > 0}
					{#each filteredData.formats as format}
						<button
							class="w-full p-2 text-center rounded-xl
							{format === selected ? 'bg-accent text-black' : 'hover:bg-panel'}"
							onclick={() => selectOption(format)}
						>
							{format}
						</button>
					{/each}
				{:else}
					<div class="col-span-3 text-center p-4 text-muted">
						{searchQuery
							? "No formats match your search"
							: "No formats available"}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
