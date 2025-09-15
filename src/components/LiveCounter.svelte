<script>
  import './styles/LiveCounter.css';
  import { onMount, onDestroy } from 'svelte';
  import Chart from './Chart.svelte';
  import { getLocation, getLocationChartData, setupRealTimeUpdates } from '../lib/stores/analytics.js';
  
  
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
  let isLoading = false;
  let unsubscribeRealTime = null;
  
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
    loadLocationData();
    updateContainerWidth();
    
    // Setup real-time updates
    unsubscribeRealTime = setupRealTimeUpdates();
    
    // Start periodic data refresh
    updateInterval = setInterval(() => {
      loadLocationData();
    }, 10000); // Refresh every 10 seconds

    // Listen for resize events
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
      if (showChart && timeframe) {
        loadChartData();
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
    if (unsubscribeRealTime) {
      unsubscribeRealTime();
    }
  });
  
  function displayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    currentDate = today.toLocaleDateString('en-US', options);
  }
  
  /**
   * Load real location data from API
   */
  async function loadLocationData() {
    if (!location.id || location.id === 'default') {
      // For default/demo locations, start with 0 and wait for real data
      count = 0;
      return;
    }

    isLoading = true;
    try {
      const locationData = await getLocation(location.id);
      if (locationData) {
        count = locationData.liveCount;
        if (locationData.summary) {
          summaryText = locationData.summary.text || '';
          changeText = locationData.summary.changePercentage || '';
          changeDirection = locationData.summary.changeDirection || 'positive';
        }
      }
    } catch (error) {
      console.error('Failed to load location data:', error);
      // Don't fallback to fake data - keep at 0 until real data comes
      count = 0;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Load chart data from API
   */
  async function loadChartData() {
    if (!showChart || !location.id || location.id === 'default') {
      // For default/demo locations, show empty chart instead of mock data
      chartData = [];
      return;
    }

    try {
      const timeframeMap = {
        'Hourly': 'HOURLY',
        'Daily': 'DAILY', 
        'Weekly': 'WEEKLY',
        'Monthly': 'MONTHLY'
      };
      
      const apiTimeframe = timeframeMap[timeframe] || 'HOURLY';
      const data = await getLocationChartData(location.id, apiTimeframe);
      
      if (data && data.length > 0) {
        chartData = data;
        if (chartComponent) {
          chartComponent.updateData(chartData);
        }
      } else {
        // No data available - show empty chart
        chartData = [];
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      // On error, show empty chart instead of fake data
      chartData = [];
    }
  }

  function initializeLocation() {
    // Start with 0, don't use fake initial data
    count = 0;
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
  
  /**
   * Generate mock chart data as fallback
   */
  function generateMockChartData() {
    const config = getTimeframeConfig(containerWidth)[timeframe];
    chartData = generateRandomData(config.points, config.base, config.variance);
    
    if (chartComponent) {
      chartComponent.updateData(chartData);
      chartComponent.updateTheme(theme);
    }
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
    // Load real data instead of generating random data
    loadLocationData();
    if (showChart) {
      loadChartData();
    }
    
    // Only show summary if we have real data - no fake summaries
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
    <span class="counter-value" class:loading={isLoading}>
      {count.toLocaleString('en-US')}
      {#if isLoading}
        <span class="loading-spinner">⟳</span>
      {/if}
    </span>
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
