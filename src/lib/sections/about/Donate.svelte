<script lang="ts" module>
	export interface Donor {
		name: string;
		amount: number;
		avatar: string;
	}
</script>

<script lang="ts">
	import { PUB_STRIPE_KEY, PUB_DONATION_API } from "$env/static/public";
	import { fade } from "$lib/animation";
	import FancyInput from "$lib/components/functional/FancyInput.svelte";
	import Panel from "$lib/components/visual/Panel.svelte";
	import { effects } from "$lib/store/index.svelte";
	import { addToast } from "$lib/store/ToastProvider";
	import clsx from "clsx";
	import {
		CalendarHeartIcon,
		HandCoinsIcon,
		HeartIcon,
		WalletIcon,
	} from "lucide-svelte";
	import { onMount, tick } from "svelte";
	import { quintOut } from "svelte/easing";

	type Props = {
		donors: Donor[];
	};

	let { donors }: Props = $props();

	let amount = $state(1);
	let customAmount = $state("");
	let type = $state("one-time");

	const presetAmounts = [1, 10, 25];

	let paying = $state(false);
	let clientSecret = $state<string | null>(null);

	const amountClick = (preset: number) => {
		amount = preset;
		customAmount = "";
	};

	const paymentClick = async () => {};

	$effect(() => {
		if (customAmount) {
			amount = parseFloat(customAmount);
		}
	});

	const payDuration = 400;
	const transition = "cubic-bezier(0.23, 1, 0.320, 1)";
</script>

{#snippet donor(name: string, amount: number | string, avatar: string)}
	<div class="flex items-center bg-button rounded-full overflow-hidden">
		<img
			src={avatar}
			alt={name}
			title={name}
			class="w-9 h-9 rounded-full"
		/>
		<p class="text-sm text-black dynadark:text-white px-4">${amount}</p>
	</div>
{/snippet}

<Panel class="flex flex-col gap-8 p-6">
	<div class="flex flex-col gap-3">
		<h2 class="text-2xl font-bold flex items-center">
			<div
				class="rounded-full bg-accent-red p-2 inline-block mr-3 w-10 h-10"
			>
				<HeartIcon color="black" />
			</div>
			Donate to VERT
		</h2>
		<p class="text-base font-normal">
			With your support, we can keep maintaining and improving VERT.
		</p>
	</div>

	<div
		class="flex flex-col gap-3 w-full overflow-visible"
		style="height: {paying ? 0 : 124}px;
		transform: scaleY({paying ? 0 : 1});
		opacity: {paying ? 0 : 1};
		filter: blur({paying ? 4 : 0}px);
		transition: height {payDuration}ms {transition}, 
					opacity {payDuration - 200}ms {transition}, 
					transform {payDuration}ms {transition},
					filter {payDuration}ms {transition};"
	>
		<div class="flex gap-3 w-full">
			<button
				onclick={() => (type = "one-time")}
				class={clsx(
					"btn flex-1 p-4 rounded-lg flex items-center justify-center",
					{
						"!scale-100": !$effects,
						"bg-accent-red text-black": type === "one-time",
					},
				)}
			>
				<HandCoinsIcon size="24" class="inline-block mr-2" />
				One-time
			</button>

			<button
				disabled
				onclick={() => (type = "monthly")}
				class={clsx(
					"btn flex-1 p-4 rounded-lg flex items-center justify-center",
					{
						"!scale-100": !$effects,
						"bg-accent-red text-black": type === "monthly",
					},
				)}
			>
				<CalendarHeartIcon size="24" class="inline-block mr-2" />
				Monthly
			</button>
		</div>
		<div class="flex gap-3 w-full">
			{#each presetAmounts as preset}
				<button
					onclick={() => amountClick(preset)}
					class={clsx(
						"btn flex-1 p-4 rounded-lg flex items-center justify-center",
						{
							"!scale-100": !$effects,
							"bg-accent-red text-black": amount === preset,
						},
					)}
				>
					${preset} USD
				</button>
			{/each}
			<div class="flex-[2] flex items-center justify-center">
				<FancyInput
					bind:value={customAmount}
					placeholder="Custom"
					prefix="$"
					type="number"
				/>
			</div>
		</div>
	</div>

	<div class="flex flex-row justify-center w-full">
		<div
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === "Enter") {
					paymentClick();
				}
			}}
			onclick={paymentClick}
			class={clsx(
				"btn flex-1 p-3 relative rounded-3xl bg-accent-red border-2 border-accent-red h-14 text-black",
				{
					"h-64 rounded-2xl bg-transparent cursor-auto !scale-100 -mt-10 -mb-2":
						paying,
					"!scale-100": !$effects,
				},
			)}
			style="transition: height {payDuration}ms {transition}, border-radius {payDuration}ms {transition}, background-color {payDuration}ms {transition}, transform {payDuration}ms {transition}, margin {payDuration}ms {transition};"
		>
			<WalletIcon size="24" class="inline-block mr-2" />
			Pay now
		</div>
	</div>

	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1">
			<h2 class="text-base font-bold">Our top donors</h2>
			{#if donors && donors.length > 0}
				<p class="text-base text-muted font-normal">
					People like these fuel the things we love to do. Thank you
					so much!
				</p>
			{:else}
				<p class="text-base text-muted font-normal italic">
					Seems like no one has donated yet... so if you do, you will
					pop up here!
				</p>
			{/if}
		</div>

		{#if donors && donors.length > 0}
			<div class="flex flex-row flex-wrap gap-2">
				{#each donors as dono}
					{@const { name, amount, avatar } = dono}
					{@render donor(name, amount || "0.00", avatar)}
				{/each}
			</div>
		{/if}
	</div>
</Panel>

<style>
	:global(
		.StripeElement,
		.StripeElement *,
		iframe[name="__privateStripeFrame39314"]
	) {
		width: 50px !important;
		height: 50px !important;
	}
</style>
