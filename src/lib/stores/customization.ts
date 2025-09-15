import { writable } from 'svelte/store';

export const customization = writable({
  showCustomization: false,
  gridSize: 'medium' // small, medium, large
});