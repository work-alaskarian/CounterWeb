<script>
  import './styles/LiveCounter.css';
  import { onMount, onDestroy } from 'svelte';
  import Chart from './Chart.svelte';
  import { getLocation, setupRealTimeUpdates, locations, updateLiveTimeframe, subscribeToLocationWithTimeframe, loadProgressiveSamples, loadChartDataViaWebSocket } from '../lib/stores/analytics.js';
  import analyticsAPI from '../lib/api/analytics.js';
  
  
  export let location = {
    id: 'default',
    name: 'Default Location', // Translate default location name
    initialCount: 0
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
  let unsubscribeLocations = null;
  
  // Progressive loading and animation state
  let isProgressiveLoading = false;
  let animatedCount = 0;
  let progressiveChartData = [];
  let animationFrame = null;
  
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
    updateContainerWidth();
    
    // Start with progressive loading for real locations on initial mount
    if (location.id && location.id !== 'default' && location.id !== 'all-data') {
      // Initialize with progressive loading
      isProgressiveLoading = true;
      animatedCount = 0;
      count = 0;
      
      // Request progressive sample loading for initial timeframe
      loadProgressiveSamples(location.id, timeframe, 50);
      
      summaryText = `تحميل البيانات الأولية...`;
      changeText = `جاري تحميل ${timeframe.toLowerCase()}`;
      changeDirection = 'positive';
    } else {
      // For default/all-data locations, use regular loading
      loadLocationData();
    }
    
    // Setup real-time updates
    unsubscribeRealTime = setupRealTimeUpdates();
    
    // Subscribe to location store changes for real-time updates
    unsubscribeLocations = locations.subscribe($locations => {
      if (isProgressiveLoading) {
        // Skip updates during progressive loading
        return;
      }
      
      if (location.id === 'all-data') {
        // For combined data, sum all regional locations
        const totalCount = $locations.reduce((sum, loc) => sum + (loc.liveCount || 0), 0);
        if (totalCount !== count) {
          count = totalCount;
          animatedCount = totalCount;
          console.log('🔥 LiveCounter: Updated combined count from real-time:', count);
        }
      } else if (location.id && location.id !== 'default') {
        // For specific location, find matching location
        const locationData = $locations.find(loc => loc.id === location.id);
        if (locationData && locationData.liveCount !== undefined && locationData.liveCount !== count) {
          count = locationData.liveCount;
          animatedCount = locationData.liveCount;
          console.log('🔥 LiveCounter: Updated count from real-time:', count, 'for', location.id);
        }
      }
    });
    
    // Setup chart data event listener
    const handleChartDataResponse = (event) => {
      if (event.detail.locationId === location.id) {
        console.log(`📈 LiveCounter: Received chart data for ${event.detail.locationId} (${event.detail.timeframe})`);
        chartData = event.detail.chartData;
        if (chartComponent) {
          chartComponent.updateData(chartData);
        }
      }
    };
    
    // Setup progressive loading event listeners
    const handleProgressiveSample = (event) => {
      if (event.detail.locationId === location.id) {
        console.log(`📈 LiveCounter: Received progressive sample ${event.detail.sampleIndex}/${event.detail.totalSamples}`);
        
        // Update animated counter with smooth progression
        animatedCount = event.detail.cumulativeCount;
        
        // Update chart data progressively
        if (showChart && event.detail.chartData) {
          progressiveChartData = [...progressiveChartData, event.detail.chartData];
          if (chartComponent) {
            chartComponent.updateData(progressiveChartData);
          }
        }
      }
    };
    
    const handleProgressiveComplete = (event) => {
      if (event.detail.locationId === location.id) {
        console.log(`✅ LiveCounter: Progressive loading complete, final count: ${event.detail.finalCount}`);
        
        // Set final count and stop progressive loading
        count = event.detail.finalCount;
        animatedCount = event.detail.finalCount;
        isProgressiveLoading = false;
        
        // Update chart with final data
        chartData = progressiveChartData;
        progressiveChartData = [];
      }
    };
    
    // Add event listeners
    window.addEventListener('chartDataResponse', handleChartDataResponse);
    window.addEventListener('progressiveSample', handleProgressiveSample);
    window.addEventListener('progressiveLoadingComplete', handleProgressiveComplete);
    
    // NO MORE PERIODIC REQUESTS - WebSocket provides real-time updates
    // Removed: updateInterval for periodic data refresh
    console.log('✅ LiveCounter: Using WebSocket-only updates (no periodic requests)');

    // Listen for resize events
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
      if (showChart && timeframe && !isProgressiveLoading) {
        loadChartDataWebSocket();
      }
    });

    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('chartDataResponse', handleChartDataResponse);
      window.removeEventListener('progressiveSample', handleProgressiveSample);
      window.removeEventListener('progressiveLoadingComplete', handleProgressiveComplete);
    };
  });
  
  onDestroy(() => {
    // No more updateInterval to clear - using WebSocket-only updates
    if (unsubscribeRealTime) {
      unsubscribeRealTime();
    }
    if (unsubscribeLocations) {
      unsubscribeLocations();
    }
    console.log('✅ LiveCounter: Cleaned up (WebSocket-only mode)');
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
    console.log('📊 LiveCounter: Loading location data for:', location.id);
    
    if (!location.id || location.id === 'default') {
      console.log('⚠️ LiveCounter: Using demo mode for default location');
      // For default/demo locations, load real analytics summary data
      try {
        const summaryData = await analyticsAPI.getAnalyticsSummary('DAILY');
        if (summaryData) {
          count = summaryData.totalVisitors || 0; // Use real data or zero
          console.log('✅ LiveCounter: Loaded analytics summary data, total visitors:', count);
        } else {
          count = 0; // No fake data - wait for real data
        }
      } catch (error) {
        console.error('❌ LiveCounter: Failed to load analytics summary:', error);
        count = 0; // No fake data - wait for real data
      }
      return;
    }

    if (location.id === 'all-data') {
      console.log('📊 LiveCounter: Loading combined data from all regional locations');
      try {
        const allLocations = await analyticsAPI.getAllLocations();
        console.log('✅ LiveCounter: Got all locations:', allLocations);
        
        // Calculate total count from all regional locations
        const totalCount = allLocations.reduce((sum, loc) => sum + (loc.liveCount || 0), 0);
        count = totalCount;
        summaryText = `Combined data from ${allLocations.length} regions`;
        changeText = 'Live updates from all locations';
        changeDirection = 'positive';
        
        console.log('✅ LiveCounter: Combined count from all regions:', count);
      } catch (error) {
        console.error('❌ LiveCounter: Failed to load all locations:', error);
        count = 0;
      }
      return;
    }

    isLoading = true;
    try {
      console.log('🔄 LiveCounter: Fetching location data for:', location.id);
      const locationData = await getLocation(location.id);
      
      if (locationData && locationData.liveCount !== undefined) {
        count = locationData.liveCount;
        summaryText = `Real-time data for ${locationData.name}`;
        changeText = 'Live updates';
        changeDirection = 'positive';
        console.log('✅ LiveCounter: Got live count:', count, 'for', locationData.name);
        
        if (locationData.summary) {
          summaryText = locationData.summary.text || summaryText;
          changeText = locationData.summary.changePercentage || changeText;
          changeDirection = locationData.summary.changeDirection || changeDirection;
        }
      } else {
        console.log('⚠️ LiveCounter: No live count data, using realtime API fallback');
        // Try to get realtime count data as fallback
        try {
          const realtimeData = await analyticsAPI.getRealtimeCount(location.id);
          if (realtimeData && realtimeData.locations) {
            const locationRealtime = realtimeData.locations.find(loc => loc.location_id === location.id);
            if (locationRealtime) {
              count = locationRealtime.live_count || 0;
              summaryText = `Real-time data for ${location.name}`;
              changeText = 'Realtime API';
              changeDirection = 'positive';
              console.log('✅ LiveCounter: Got realtime count:', count);
            } else {
              throw new Error('Location not found in realtime data');
            }
          } else {
            throw new Error('No realtime data available');
          }
        } catch (realtimeError) {
          console.log('⚠️ LiveCounter: Realtime fallback failed:', realtimeError.message);
          // Don't fallback to fake data - keep at 0 until real data comes
          count = 0;
          summaryText = `${location.name}`;
          changeText = 'Waiting for data...';
          changeDirection = 'neutral';
        }
      }
    } catch (error) {
      console.error('❌ LiveCounter: Failed to load location data:', error);
      count = 0;
      summaryText = location.name;
      changeText = 'Connection error';
      changeDirection = 'negative';
    } finally {
      isLoading = false;
    }
  }

  /**
   * Load chart data via WebSocket (replaces GraphQL API)
   */
  function loadChartDataWebSocket() {
    console.log('📈 LiveCounter: Requesting chart data via WebSocket for:', location.id, 'timeframe:', timeframe);
    
    if (!showChart) {
      console.log('⚠️ LiveCounter: Chart disabled, skipping chart data load');
      chartData = [];
      return;
    }

    if (!location.id || location.id === 'default') {
      console.log('⚠️ LiveCounter: Default location - chart data will come via WebSocket analytics summary');
      // For default locations, data comes via analytics summary
      return;
    }

    if (location.id === 'all-data') {
      console.log('⚠️ LiveCounter: All-data location - chart data will be aggregated');
      // For all-data, we might need special handling
      return;
    }

    // Request chart data via WebSocket
    const timeframeMap = {
      'Hourly': 'HOURLY',
      'Daily': 'DAILY', 
      'Weekly': 'WEEKLY',
      'Monthly': 'MONTHLY'
    };
    
    const apiTimeframe = timeframeMap[timeframe] || 'HOURLY';
    loadChartDataViaWebSocket(location.id, apiTimeframe);
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
  
  async function resetView(newTimeframe) {
    console.log('🔄 LiveCounter: Timeframe changed to:', newTimeframe);
    
    // Start progressive loading for real locations
    if (location.id && location.id !== 'default' && location.id !== 'all-data') {
      // Start progressive loading
      isProgressiveLoading = true;
      animatedCount = 0;
      progressiveChartData = [];
      
      // Reset counter to 0 for smooth animation
      count = 0;
      
      // Request progressive sample loading (50 samples for smooth animation)
      loadProgressiveSamples(location.id, newTimeframe, 50);
      
      summaryText = `تحميل البيانات...`;
      changeText = `جاري تحميل ${newTimeframe.toLowerCase()}`;
      changeDirection = 'positive';
    }
    
    // Update WebSocket subscription to new timeframe
    updateLiveTimeframe(newTimeframe);
    
    // Subscribe to this specific location with the new timeframe for immediate data
    subscribeToLocationWithTimeframe(location.id, newTimeframe);
    
    // For default/all-data locations, use regular loading
    if (location.id === 'default' || location.id === 'all-data') {
      await loadTimeframeData(newTimeframe);
      
      // Load chart data for new timeframe via WebSocket
      if (showChart) {
        loadChartDataWebSocket();
      }
    }
    
    console.log('✅ LiveCounter: Timeframe reset complete for:', newTimeframe);
  }
  
  /**
   * Load initial aggregated count for the selected timeframe period
   * The WebSocket will provide timeframe-aware counts, so we just need to request fresh data
   */
  async function loadTimeframeData(timeframe) {
    console.log('📊 LiveCounter: Loading timeframe data for:', location.id, 'timeframe:', timeframe);
    
    if (!location.id || location.id === 'default' || location.id === 'all-data') {
      // For these cases, keep existing behavior
      loadLocationData();
      return;
    }
    
    // Update summary text for the timeframe
    const arabicTimeframes = {
      'Hourly': 'الساعة الحالية',
      'Daily': 'اليوم الحالي', 
      'Weekly': 'الأسبوع الحالي',
      'Monthly': 'الشهر الحالي'
    };
    
    summaryText = `${arabicTimeframes[timeframe]} - ${location.name}`;
    changeText = 'التحديثات المباشرة مع إجمالي الفترة';
    changeDirection = 'positive';
    
    // The WebSocket will automatically send the correct timeframe-aware count
    // So we just need to wait for it. In the meantime, load regular data.
    loadLocationData();
    
    console.log('✅ LiveCounter: Timeframe reset complete, waiting for WebSocket data');
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
    <span class="counter-value" class:loading={isLoading || isProgressiveLoading} class:animating={isProgressiveLoading}>
      {isProgressiveLoading ? animatedCount.toLocaleString('en-US') : count.toLocaleString('en-US')}
      {#if isLoading || isProgressiveLoading}
        <span class="loading-spinner">⟳</span>
      {/if}
    </span>
    <span class="counter-label">
      {#if isProgressiveLoading}
        جاري التحميل... 
      {:else}
        إجمالي العدد
      {/if}
    </span>
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
