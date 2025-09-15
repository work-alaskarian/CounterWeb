<script>
  import './styles/Panel.css';
  export let title;
  export let date = '';
  export let counter = 0;
  export let summaryText = '';
  export let changeText = '';
  export let changeDirection = 'positive';
  export let showIcon = false;
  export let iconColor = '#5a9fd4';
</script>

<div class="panel">
  <div class="panel-header">
    <div class="panel-title-container">
      {#if showIcon}
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      {/if}
      <span class="panel-title">{title}</span>
    </div>
    <span class="panel-date">{date}</span>
  </div>
  
  <div class="counter">{counter.toLocaleString('en-US')}</div>
  
  <div class="chart-container">
    <slot name="chart"></slot>
  </div>
  
  {#if summaryText || changeText}
    <div class="sessions-summary">
      <div class="sessions-subtitle">{summaryText}</div>
      <div class="sessions-change {changeDirection}">
        <span>{changeDirection === 'positive' ? '↑' : '↓'}</span>
        <span>{changeText}</span>
      </div>
    </div>
  {/if}
</div>