<script lang="ts">
	import Uploader from "$lib/components/functional/Uploader.svelte";
	import Tooltip from "$lib/components/visual/Tooltip.svelte";
	import { converters } from "$lib/converters";
	import { vertdLoaded } from "$lib/store/index.svelte";
	import clsx from "clsx";
	import { AudioLines, BookText, Check, Film, Image } from "lucide-svelte";
	import { m } from "$lib/paraglide/messages";
	import { OverlayScrollbarsComponent } from "overlayscrollbars-svelte";
	import { browser } from "$app/environment";
	import "overlayscrollbars/overlayscrollbars.css";
	import { onMount } from "svelte";

	const getSupportedFormats = (name: string) =>
		converters
			.find((c) => c.name === name)
			?.supportedFormats.map(
				(f) =>
					`${f.name}${f.fromSupported && f.toSupported ? "" : "*"}`,
			)
			.join(", ") || "none";

	const status: {
		[key: string]: {
			ready: boolean;
			formats: string;
			icon: typeof Image;
			title: string;
		};
	} = $derived({
		Images: {
			ready:
				converters.find((c) => c.name === "imagemagick")?.ready ||
				false,
			formats: getSupportedFormats("imagemagick"),
			icon: Image,
			title: m["upload.cards.images"](),
		},
		Audio: {
			ready: converters.find((c) => c.name === "ffmpeg")?.ready || false,
			formats: getSupportedFormats("ffmpeg"),
			icon: AudioLines,
			title: m["upload.cards.audio"](),
		},
		Documents: {
			ready: converters.find((c) => c.name === "pandoc")?.ready || false,
			formats: getSupportedFormats("pandoc"),
			icon: BookText,
			title: m["upload.cards.documents"](),
		},
		Video: {
			ready:
				converters.find((c) => c.name === "vertd")?.ready ||
				(false && $vertdLoaded),
			formats: getSupportedFormats("vertd"),
			icon: Film,
			title: m["upload.cards.video"](),
		},
	});

	const getTooltip = (format: string) => {
		const converter = converters.find((c) =>
			c.supportedFormats.some((sf) => sf.name === format),
		);

		const formatInfo = converter?.supportedFormats.find(
			(sf) => sf.name === format,
		);

		if (formatInfo) {
			const direction = formatInfo.fromSupported
				? m["upload.tooltip.direction_input"]()
				: m["upload.tooltip.direction_output"]();
			return m["upload.tooltip.partial_support"]({ direction });
		}
		return "";
	};

	let scrollContainers: HTMLElement[] = $state([]);
	// svelte-ignore state_referenced_locally
	let showBlur = $state(Array(Object.keys(status).length).fill(false));

	onMount(() => {
		const handleResize = () => {
			for (let i = 0; i < scrollContainers.length; i++) {
				// show bottom blur if scrollable
				const container = scrollContainers[i];
				if (!container) return;
				showBlur[i] = container.scrollHeight > container.clientHeight;
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	});
</script>

<div class="max-w-6xl w-full mx-auto px-6 md:px-8">
	<div class="flex items-center justify-center pb-10 md:py-16">
		<div
			class="flex items-center h-auto gap-12 md:gap-24 md:flex-row flex-col"
		>
			<div class="flex-grow w-full text-center md:text-left">
				<h1
					class="text-4xl px-12 md:p-0 md:text-6xl flex-wrap tracking-tight leading-tight md:leading-[72px] mb-4 md:mb-6"
				>
					{m["upload.title"]()}
				</h1>
				<p
					class="font-normal px-5 md:p-0 text-lg md:text-xl text-black text-muted dynadark:text-muted"
				>
					{m["upload.subtitle"]()}
				</p>
			</div>
			<div class="flex-grow w-full h-72">
				<Uploader class="w-full h-full" />
			</div>
		</div>
	</div>

	<hr />

	<div class="mt-10 md:mt-16">
		<h2 class="text-center text-4xl">{m["upload.cards.title"]()}</h2>

		<div class="flex gap-4 mt-8 md:flex-row flex-col">
			{#if browser}
				{#each Object.entries(status) as [key, s], i}
					{@const Icon = s.icon}
					<div class="file-category-card w-full flex flex-col gap-4">
						<div class="file-category-card-inner">
							<div
								class={clsx("icon-container", {
									"bg-accent-blue": key === "Images",
									"bg-accent-purple": key === "Audio",
									"bg-accent-green": key === "Documents",
									"bg-accent-red": key === "Video",
								})}
							>
								<Icon size="20" />
							</div>
							<span>{s.title}</span>
						</div>

						<div
							class="file-category-card-content flex-grow relative"
						>
							<OverlayScrollbarsComponent
								options={{
									scrollbars: {
										autoHide: "move",
										autoHideDelay: 1500,
									},
								}}
								defer
							>
								<div
									class="flex flex-col gap-4 h-[12.25rem] relative"
									bind:this={scrollContainers[i]}
								>
									{#if key === "Video"}
										<p
											class="flex tems-center justify-center gap-2"
										>
											<Check size="20" />
											<Tooltip
												text={m[
													"upload.tooltip.video_server_processing"
												]()}
											>
												<span>
													<a
														href="https://github.com/VERT-sh/VERT/blob/main/docs/VIDEO_CONVERSION.md"
														target="_blank"
														rel="noopener noreferrer"
													>
														{m[
															"upload.cards.video_server_processing"
														]()}
													</a>
													<span
														class="text-red-500 -ml-0.5"
														>*</span
													>
												</span>
											</Tooltip>
										</p>
									{:else}
										<p
											class="flex tems-center justify-center gap-2"
										>
											<Check size="20" />
											{m[
												"upload.cards.local_supported"
											]()}
										</p>
									{/if}
									<p>
										{@html m["upload.cards.status.text"]({
											status: s.ready
												? m[
														"upload.cards.status.ready"
													]()
												: m[
														"upload.cards.status.not_ready"
													](),
										})}
									</p>
									<div class="flex flex-col items-center relative">
										<b
											>{m[
												"upload.cards.supported_formats"
											]()}&nbsp;</b
										>
										<p
											class="flex flex-wrap justify-center leading-tight px-2"
										>
											{#each s.formats.split(", ") as format, index}
												{@const isPartial =
													format.endsWith("*")}
												{@const formatName = isPartial
													? format.slice(0, -1)
													: format}
												<span
													class="text-sm font-normal flex items-center relative"
												>
													{#if isPartial}
														<Tooltip
															text={getTooltip(
																formatName,
															)}
														>
															{formatName}<span
																class="text-red-500"
																>*</span
															>
														</Tooltip>
													{:else}
														{formatName}
													{/if}
													{#if index < s.formats.split(", ").length - 1}
														<span>,&nbsp;</span>
													{/if}
												</span>
											{/each}
										</p>
									</div>
								</div>
							</OverlayScrollbarsComponent>
							<!-- blur at bottom if scrollable - positioned relative to the card container -->
							{#if showBlur[i]}
								<div
									class="absolute left-0 bottom-0 w-full h-10 pointer-events-none"
									style={`background: linear-gradient(to top, var(--bg-panel), transparent 100%);`}
								></div>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.file-category-card {
		@apply bg-panel rounded-2xl p-5 shadow-panel relative;
	}

	.file-category-card p {
		@apply font-normal text-center text-sm;
	}

	.file-category-card-inner {
		@apply flex items-center justify-center gap-3 text-xl;
	}

	.file-category-card-content {
		@apply flex flex-col text-center justify-between;
	}

	.icon-container {
		@apply p-2 rounded-full text-on-accent;
	}
</style>
