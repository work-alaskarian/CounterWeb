<script>
  import './styles/GlobalControls.css';
  import { createEventDispatcher } from 'svelte';
  
  export let timeframe = 'Hourly';
  export let theme = 'blue';
  export let showThemeSelector = true;
  
  const dispatch = createEventDispatcher();
  
  function handleTimeframeChange(event) {
    dispatch('timeframe-change', event.target.value);
  }
  
  function handleThemeChange(event) {
    dispatch('theme-change', event.target.value);
  }
</script>

<div class="global-controls">
  <select bind:value={timeframe} on:change={handleTimeframeChange}>
    <option value="Hourly">ساعي</option>
    <option value="Daily">يومي</option>
    <option value="Weekly">أسبوعي</option>
    <option value="Monthly">شهري</option>
  </select>
  
  {#if showThemeSelector}
    <select bind:value={theme} on:change={handleThemeChange}>
      <option value="blue">السمة الافتراضية</option>
      <option value="green">السمة الخضراء</option>
      <option value="purple">السمة الأرجوانية</option>
    </select>
  {/if}
</div>

