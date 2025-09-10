<script lang="ts">
	import { duration, fade } from "$lib/animation";
	import { quintOut } from "svelte/easing";
	import Dialog from "../functional/Dialog.svelte";
	import {
		type Dialog as DialogType,
		dialogs,
	} from "$lib/store/DialogProvider";

	let dialogList = $state<DialogType[]>([]);

	dialogs.subscribe((value) => {
		dialogList = value as DialogType[];
	});
</script>

{#if dialogList.length > 0}
	<div
		class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-40"
		in:fade={{
			duration,
			easing: quintOut,
		}}
		out:fade={{
			duration,
			easing: quintOut,
		}}
	>
		{#each dialogList as { id, title, message, buttons, type }, i}
			{#if i === 0}
				<Dialog {id} {title} {message} {buttons} {type} />
			{/if}
		{/each}
	</div>
{/if}
