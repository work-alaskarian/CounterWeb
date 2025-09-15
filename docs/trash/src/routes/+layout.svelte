<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>CounterWeb - People Counting System</title>
</svelte:head>

{@render children?.()}

<style>
	:global(html) {
		height: 100%;
		width: 100%;
		direction: rtl;
	}
	
	:global(body) {
		margin: 0;
		font-family: 'Google Sans', 'Roboto', 'Segoe UI', 'Arial', 'Tahoma', sans-serif;
		background: #0d1117;
		color: #f0f6fc;
		overflow-x: hidden;
		height: 100%;
		width: 100%;
		direction: rtl;
	}
	
	:global(*) {
		box-sizing: border-box;
	}
	
	/* Professional scrollbar */
	:global(::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}
	
	:global(::-webkit-scrollbar-track) {
		background: #161b22;
	}
	
	:global(::-webkit-scrollbar-thumb) {
		background: #30363d;
		border-radius: 4px;
	}
	
	:global(::-webkit-scrollbar-thumb:hover) {
		background: #6e7681;
	}
	
	/* Dark theme focus outlines */
	:global(button:focus-visible, input:focus-visible, select:focus-visible) {
		outline: 2px solid #58a6ff;
		outline-offset: 2px;
	}
</style>
