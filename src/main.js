import App from './App.svelte';

console.info('🔍 App starting...');

const app = new App({
  target: document.body
});

console.info('✅ App initialized');

export default app;