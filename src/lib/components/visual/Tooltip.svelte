<script lang="ts">
	import { fade } from "$lib/animation";

	interface Props {
		children: () => any;
		text: string;
		position?: "top" | "bottom" | "left" | "right";
	}

	let { children, text, position = "top" }: Props = $props();
	let showTooltip = $state(false);
	let timeout: number = 0;

	function show() {
		timeout = setTimeout(() => {
			showTooltip = true;
		}, 500);
	}

	function hide() {
		showTooltip = false;
		clearTimeout(timeout);
	}
</script>

<div
	class="relative inline-block"
	onmouseenter={show}
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
	ontouchstart={show}
	ontouchend={hide}
	role="tooltip"
>
	{@render children()}
	{#if showTooltip}
		<div
			class="tooltip tooltip-{position}"
			transition:fade={{
				duration: 100,
			}}
		>
			{text}
		</div>
	{/if}
</div>

<style>
	.tooltip {
		--border-size: 1px;
		@apply absolute z-10 bg-panel-alt text-foreground border border-stone-400 dynadark:border-white drop-shadow-lg text-xs px-4 py-2 rounded-full whitespace-nowrap pointer-events-none;
	}

	.tooltip-top {
		@apply bottom-full left-1/2 -translate-x-1/2 mb-3;
	}

	.tooltip-top::after {
		@apply content-[""] absolute top-full left-1/2 -translate-x-1/2 border-8 border-x-transparent border-b-transparent;
	}

	.tooltip-top::before {
		border-width: calc(var(--border-size) + 8px);
		margin-left: calc(-1 * (var(--border-size) + 8px));
		@apply content-[""] absolute top-full left-1/2 border-x-transparent border-b-transparent border-t-inherit;
	}

	.tooltip-bottom {
		@apply top-full left-1/2 -translate-x-1/2 mt-3;
	}

	.tooltip-bottom::after {
		@apply content-[""] absolute bottom-full left-1/2 -ml-2 border-8 border-x-transparent border-t-transparent;
	}

	.tooltip-bottom::before {
		border-width: calc(var(--border-size) + 8px);
		margin-left: calc(-1 * (var(--border-size) + 8px));
		@apply content-[""] absolute bottom-full left-1/2 border-x-transparent border-t-transparent border-b-inherit;
	}

	.tooltip-left {
		@apply right-full top-1/2 -translate-y-1/2 mr-3;
	}

	.tooltip-left::after {
		@apply content-[""] absolute top-1/2 left-full -mt-2 border-8 border-y-transparent border-r-transparent border-l-inherit;
	}

	.tooltip-right {
		@apply left-full top-1/2 -translate-y-1/2 ml-3;
	}

	.tooltip-right::after {
		margin-right: -2px;
		@apply content-[""] absolute top-1/2 right-full -mt-2 border-8 border-y-transparent border-l-transparent;
	}

	.tooltip-right::before {
		margin-right: -2px;
		border-width: calc(var(--border-size) + 8px);
		margin-top: calc(-1 * (var(--border-size) + 8px));
		@apply content-[""] absolute top-1/2 right-full border-y-transparent border-l-transparent border-r-inherit;
	}
</style>
