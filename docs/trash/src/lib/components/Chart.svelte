<script lang="ts">
  import type { CountData } from '../types';
  
  export let data: CountData[] = [];
  export let title: string = '';
  export let height: number = 200;
  export let showGrid: boolean = true;
  export let color: string = '#3b82f6';
  
  $: maxValue = Math.max(...data.map(d => d.count), 1);
  $: minValue = Math.min(...data.map(d => d.count), 0);
  $: range = maxValue - minValue || 1;
  
  function getY(value: number): number {
    return height - ((value - minValue) / range) * (height - 40);
  }
  
  function getX(index: number): number {
    return (index / (data.length - 1 || 1)) * 300;
  }
  
  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  $: pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.count)}`).join(' ');
</script>

<div class="chart-container">
  {#if title}
    <h4 class="chart-title">{title}</h4>
  {/if}
  
  <div class="chart-wrapper">
    <svg width="320" {height} viewBox="0 0 320 {height}">
      <!-- Grid lines -->
      {#if showGrid}
        <defs>
          <pattern id="grid-{title}" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="300" height="{height-20}" fill="url(#grid-{title})" x="10" y="10" />
      {/if}
      
      <!-- Data line -->
      {#if data.length > 1}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        
        <!-- Data points -->
        {#each data as point, i}
          <circle
            cx={getX(i)}
            cy={getY(point.count)}
            r="3"
            fill={color}
            class="data-point"
          />
        {/each}
      {/if}
      
      <!-- Y-axis labels -->
      <text x="5" y="15" class="axis-label" text-anchor="start">{maxValue}</text>
      <text x="5" y="{height-5}" class="axis-label" text-anchor="start">{minValue}</text>
    </svg>
    
    <!-- X-axis time labels -->
    <div class="time-labels">
      {#if data.length > 0}
        <span>{formatTime(data[0].timestamp)}</span>
        <span>{formatTime(data[data.length - 1].timestamp)}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .chart-container {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .chart-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    text-align: center;
  }
  
  .chart-wrapper {
    position: relative;
  }
  
  .data-point {
    cursor: pointer;
    transition: r 0.2s ease;
  }
  
  .data-point:hover {
    r: 6;
  }
  
  .axis-label {
    font-size: 10px;
    fill: rgba(255, 255, 255, 0.6);
  }
  
  .time-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    padding: 0 10px;
  }
</style>