import App from './App.svelte';

console.log('🔍 MAIN: Starting app...');

const app = new App({
  target: document.body
});

console.log('✅ MAIN.JS: App created successfully!', app);

export default app;