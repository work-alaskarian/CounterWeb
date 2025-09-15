<script>
  import './styles/LiveCounter.css';
  import { onMount, onDestroy } from 'svelte';
  import Chart from './Chart.svelte';
  
  
  export let location = {
    id: 'default',
    name: 'Default Location', // Translate default location name
    initialCount: 1000
  };
  export let theme = { color: '#3b82f6', rgb: '59, 130, 246' };
  export let timeframe = 'Hourly';
  export let showChart = true;
  export let showHover = false;
  export let smoothCurve = false;
  export let useSvg = false;
  export let cardSize = 'normal'; // 'small', 'normal', 'large'
  
  let count = 0;
  let currentDate = '';
  let summaryText = '';
  let changeText = '';
  let changeDirection = 'positive';
  let chartComponent;
  let updateInterval;
  let chartData = [];
  let chartContainer;
  let containerWidth = 300;
  
  function getTimeframeConfig(width) {
    // Base points calculation based on width (more width = more points for better resolution)
    const basePoints = Math.min(Math.max(Math.floor(width / 8), 30), 150);
    
    return {
      Hourly: { points: basePoints, base: 500, variance: 20, delay: 500 },
      Daily: { points: Math.floor(basePoints * 0.8), base: 12000, variance: 500, delay: 800 },
      Weekly: { points: Math.floor(basePoints * 1.2), base: 84000, variance: 3000, delay: 1200 },
      Monthly: { points: Math.floor(basePoints * 1.5), base: 330000, variance: 10000, delay: 1500 }
    };
  }
  
  onMount(() => {
    displayDate();
    initializeLocation();
    updateContainerWidth();
    
    if (showChart) {
      resetView(timeframe);
    }
    
    // Start live updates with real-time chart updates
    updateInterval = setInterval(() => {
      const increment = Math.floor(Math.random() * 10) + 1;
      count += increment;
      
      // Update chart data with new point
      if (showChart && chartData.length > 0) {
        const newPoint = chartData[chartData.length - 1] + (Math.random() * 40 - 20);
        chartData = [...chartData.slice(1), Math.max(0, newPoint)];
        
        if (chartComponent) {
          chartComponent.updateData(chartData);
        }
      }
    }, 1500);

    // Listen for resize events
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
      if (showChart && timeframe) {
        resetView(timeframe);
      }
    });

    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }

    return () => {
      resizeObserver.disconnect();
    };
  });
  
  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
  
  function displayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    currentDate = today.toLocaleDateString('en-US', options);
  }
  
  function initializeLocation() {
    count = location.initialCount || 1000;
  }
  
  function updateContainerWidth() {
    if (chartContainer) {
      containerWidth = chartContainer.offsetWidth;
    }
  }
  
  function generateRandomData(points, base, variance) {
    let data = [];
    let lastVal = base;
    for (let i = 0; i < points; i++) {
      let newVal = lastVal + (Math.random() * variance * 2) - variance;
      lastVal = newVal > 0 ? newVal : 0;
      data.push(Math.round(lastVal));
    }
    return data;
  }
  
  function updateSummaryText(timeframeValue) {
    const percentChange = (Math.random() * 30 + 5).toFixed(1);
    const isPositive = Math.random() > 0.3;
    changeDirection = isPositive ? 'positive' : 'negative';
    
    // Arabic translations for timeframes
    const arabicTimeframes = {
      'Hourly': { current: 'الساعة', period: 'الساعة' },
      'Daily': { current: 'اليوم', period: 'اليوم' },
      'Weekly': { current: 'الأسبوع', period: 'الأسبوع' },
      'Monthly': { current: 'الشهر', period: 'الشهر' }
    };
    
    const timeframe = arabicTimeframes[timeframeValue] || { current: 'الفترة', period: 'الفترة' };
    summaryText = `ملخص ${timeframe.current} الماضية`;
    changeText = `${percentChange}% مقارنة بـ${timeframe.period} السابقة`;
  }
  
  function resetView(newTimeframe) {
    const config = getTimeframeConfig(containerWidth)[newTimeframe];
    count = location.initialCount + (Math.random() * config.variance * 4) - (config.variance * 2);
    count = Math.round(count);
    
    updateSummaryText(newTimeframe);
    
    // Generate chart data based on current container width
    chartData = generateRandomData(config.points, config.base, config.variance);
    
    if (chartComponent) {
      chartComponent.updateData(chartData);
      chartComponent.updateTheme(theme);
    }
  }
  
  // Reactive updates
  $: if (timeframe) resetView(timeframe);
  $: if (chartComponent && theme) {
    chartComponent.updateTheme(theme);
  }
</script>

<div class="location-card {cardSize}">
  <div class="card-header">
    <div class="title-section">
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <div class="title-content">
        <h3 class="card-title">{location.name}</h3>
        <span class="card-date">{currentDate}</span>
      </div>
    </div>
    <div class="status-indicator active"></div>
  </div>
  
  <div class="counter-display">
    <span class="counter-value">{count.toLocaleString('en-US')}</span>
    <span class="counter-label">إجمالي العدد</span>
  </div>
  
  {#if showChart}
    <div class="chart-section" bind:this={chartContainer}>
      <Chart 
        bind:this={chartComponent}
        data={chartData}
        chartType="line"
        {theme}
        {useSvg}
        {smoothCurve}
        {showHover}
        on:mount={(e) => { chartComponent = e.detail; }}
      />
    </div>
  {/if}
  
  {#if summaryText || changeText}
    <div class="summary-section">
      <div class="summary-text">{summaryText}</div>
      <div class="summary-change {changeDirection}">
        <span>{changeDirection === 'positive' ? '↑' : '↓'}</span>
        <span>{changeText}</span>
      </div>
    </div>
  {/if}
</div>
