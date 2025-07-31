<script lang="ts">
	import { fade, fly } from "$lib/animation";
	import {
		BanIcon,
		CheckIcon,
		InfoIcon,
		TriangleAlert,
		XIcon,
	} from "lucide-svelte";
	import { quintOut } from "svelte/easing";
	import { removeToast } from "$lib/store/ToastProvider";

	type Props = {
		id: number;
		type: "success" | "error" | "info" | "warning";
		message: string;
		durations: {
			enter: number;
			stay: number;
			exit: number;
		};
	};

	let { id, type, message, durations }: Props = $props();

	const colors = {
		success: "purple",
		error: "red",
		info: "blue",
		warning: "pink",
	};

	const Icons = {
		success: CheckIcon,
		error: BanIcon,
		info: InfoIcon,
		warning: TriangleAlert,
	};

	let color = $derived(colors[type]);
	let Icon = $derived(Icons[type]);

	// intentionally unused. this is so tailwind can generate the css for these colours as it doesn't detect if it's dynamically loaded
	// this would lead to the colours not being generated in the final css file by tailwind
	const colourVariants = [
		"border-accent-pink-alt",
		"border-accent-red-alt",
		"border-accent-purple-alt",
		"border-accent-blue-alt",
	];
</script>

<div
	class="flex items-center justify-between max-w-[100%] md:max-w-md p-4 gap-4 bg-accent-{color} border-accent-{color}-alt border-l-4 rounded-lg shadow-md"
	in:fly={{
		duration: durations.enter,
		easing: quintOut,
		x: 0,
		y: 100,
	}}
	out:fade={{
		duration: durations.exit,
		easing: quintOut,
	}}
>
	<div class="flex items-center gap-4">
		<Icon
			class="w-6 h-6 text-black flex-shrink-0"
			size="32"
			stroke="2"
			fill="none"
		/>
		<p class="text-black font-normal whitespace-pre-wrap break-all">
			{message}
		</p>
	</div>
	<button
		class="text-gray-600 hover:text-black flex-shrink-0"
		onclick={() => removeToast(id)}
	>
		<XIcon size="16" />
	</button>
</div>
