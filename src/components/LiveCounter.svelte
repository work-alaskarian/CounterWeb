<script>
  import './styles/LiveCounter.css';
  import { onMount, onDestroy } from 'svelte';
  import Chart from './Chart.svelte';
  import { DotLottieSvelte } from '@lottiefiles/dotlottie-svelte';
  import { getLocation, getLocationChartData, setupRealTimeUpdates, locations, updateLiveTimeframe, subscribeToLocationWithTimeframe, loadProgressiveSamples, loadChartDataViaWebSocket, websocketHealthy, fallbackMode } from '../lib/stores/analytics.js';
  import analyticsAPI from '../lib/api/analytics.js';
  import { getWebSocketManager } from '../lib/workers/websocket-manager.js';
  
  
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
  
  // Component-level WebSocket isolation
  let componentId = `livecounter_${location.id}_${Math.random().toString(36).substring(7)}`;
  let isWebSocketHealthy = true;
  let isInFallbackMode = false;

  // Dedicated WebSocket worker for this component
  let wsManager = null;
  let wsWorker = null;
  let wsUnsubscribe = null;

  // Animation state
  let counterAnimationKey = 0;
  let showCountUpAnimation = false;
  let previousCount = 0;
  let displayCount = 0;
  let countUpInterval = null;
  
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

  function animateCounterUp(fromCount, toCount, duration = 1000) {
    if (countUpInterval) {
      clearInterval(countUpInterval);
    }

    if (fromCount === toCount) {
      displayCount = toCount;
      return;
    }

    const startTime = Date.now();
    const countDifference = toCount - fromCount;
    showCountUpAnimation = true;

    countUpInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      displayCount = Math.round(fromCount + (countDifference * easeOutQuart));

      if (progress >= 1) {
        displayCount = toCount;
        showCountUpAnimation = false;
        clearInterval(countUpInterval);
        countUpInterval = null;
        // Trigger bounce animation
        counterAnimationKey++;
      }
    }, 16); // ~60fps
  }
  
  onMount(() => {
    displayDate();
    updateContainerWidth();

    // Initialize display count
    displayCount = count;
    
    // Initialize dedicated WebSocket worker for real locations
    if (location.id && location.id !== 'default' && location.id !== 'all-data') {
      
      // Get WebSocket manager and create worker for this location
      wsManager = getWebSocketManager();
      
      // Subscribe to this location with dedicated worker
      wsUnsubscribe = wsManager.subscribeToLocation(
        location.id,
        timeframe,
        // onUpdate handler - receives live count updates
        (updateData) => {
          console.log(`📈 ${componentId}: Worker update:`, updateData);
          
          // Use cumulative count, never show 0
          const newCount = updateData.cumulativeCount || updateData.count || count;

          if (newCount !== count) {
            previousCount = count;
            count = newCount;
            animatedCount = newCount;

            // Animate the counter change
            animateCounterUp(displayCount, newCount, 800);
            
            // Update summary text for cumulative display with data source indicator
            const sourceText = updateData.source === 'indexeddb' ? '(مُحفوظ)' : 
                             updateData.source === 'offline_sync' ? '(مُزامن)' : '';
            summaryText = `إجمالي تراكمي - ${location.name} ${sourceText}`;
            
            // Update change text based on data source and type
            if (updateData.isPersisted || updateData.source === 'indexeddb') {
              changeText = 'بيانات محفوظة محلياً';
              changeDirection = 'neutral';
            } else if (updateData.isSync || updateData.source === 'offline_sync') {
              changeText = 'تم استعادة البيانات';
              changeDirection = 'positive';
            } else {
              changeText = updateData.isCumulative ? 'العد التراكمي' : 'تحديث مباشر';
              changeDirection = 'positive';
            }
          }
          
          // Stop progressive loading if it was active or if we got any data
          if (isProgressiveLoading && (updateData.isComplete || updateData.count > 0 || updateData.cumulativeCount > 0)) {
            console.log(`✅ ${componentId}: Completing progressive loading with data:`, updateData);
            isProgressiveLoading = false;
          }
        },
        // onChartData handler - receives chart updates
        (chartUpdate) => {
          console.log(`📊 ${componentId}: Worker chart update:`, chartUpdate);
          
          if (showChart && chartUpdate.chartData) {
            chartData = chartUpdate.isCumulative ? chartUpdate.chartData : chartUpdate.rawData || chartUpdate.chartData;
            
            if (chartComponent) {
              const chartValues = chartData.map(item => 
                typeof item === 'number' ? item : (item.count || item.value || 0)
              );
              chartComponent.updateData(chartValues);
            }
          }
        },
        // onError handler - handle worker errors
        (error) => {
          console.error(`❌ ${componentId}: Worker error:`, error);
          isWebSocketHealthy = false;
          isInFallbackMode = true;
          
          // Fall back to regular loading
          enableFallbackMode();
        }
      );
      
      // Initialize loading state
      isProgressiveLoading = true;
      animatedCount = 0;
      count = 0;

      summaryText = `تحميل البيانات التراكمية...`;
      changeText = `جاري تحميل ${timeframe.toLowerCase()}`;
      changeDirection = 'positive';

      // Set timeout to stop progressive loading if it takes too long
      setTimeout(() => {
        if (isProgressiveLoading) {
          console.log(`⏰ ${componentId}: Progressive loading timeout, forcing completion`);
          isProgressiveLoading = false;
          summaryText = `العدد التراكمي الإجمالي - ${location.name}`;
          changeText = 'البيانات متاحة';
          changeDirection = 'positive';
        }
      }, 5000); // 5 second timeout
      
    } else if (location.id === 'all-data') {
      // For all-data, load backend total calculation
      loadAllDataFromBackend();
    } else {
      // For default locations, use regular loading
      loadLocationData();
    }
    
    // Setup real-time updates with component isolation
    unsubscribeRealTime = setupRealTimeUpdates();
    
    // Monitor WebSocket health for fallback system
    const unsubscribeWebSocketHealth = websocketHealthy.subscribe(healthy => {
      isWebSocketHealthy = healthy;
      if (!healthy && !isInFallbackMode) {
        isInFallbackMode = true;
        enableFallbackMode();
      } else if (healthy && isInFallbackMode) {
        console.log(`✅ ${componentId}: WebSocket recovered, disabling fallback mode`);
        isInFallbackMode = false;
        disableFallbackMode();
      }
    });
    
    // Monitor fallback mode
    const unsubscribeFallbackMode = fallbackMode.subscribe(inFallback => {
      isInFallbackMode = inFallback;
    });
    
    // Subscribe to location store changes for real-time updates
    unsubscribeLocations = locations.subscribe($locations => {
      if (location.id === 'all-data') {
        // For combined data, sum all regional locations
        const totalCount = $locations.reduce((sum, loc) => sum + (loc.liveCount || 0), 0);

        if (totalCount !== count) {
          previousCount = count;
          count = totalCount;
          animatedCount = totalCount;

          // Animate the counter change
          animateCounterUp(displayCount, totalCount, 1000);

          // Complete loading if we got data
          if (isProgressiveLoading && totalCount > 0) {
            console.log(`✅ ${componentId}: Completing loading from store data for all-data: ${totalCount}`);
            isProgressiveLoading = false;
            summaryText = `إجمالي جميع المناطق`;
            changeText = 'البيانات محدثة';
            changeDirection = 'positive';
          }
        }
      } else if (location.id && location.id !== 'default') {
        // For specific location, find matching location
        const locationData = $locations.find(loc => loc.id === location.id);
        if (locationData && locationData.liveCount !== undefined && locationData.liveCount !== count) {
          previousCount = count;
          count = locationData.liveCount;
          animatedCount = locationData.liveCount;

          // Animate the counter change
          animateCounterUp(displayCount, locationData.liveCount, 1000);

          // Complete loading if we got data
          if (isProgressiveLoading) {
            console.log(`✅ ${componentId}: Completing loading from store data for ${location.id}: ${locationData.liveCount}`);
            isProgressiveLoading = false;
            summaryText = `العدد التراكمي الإجمالي - ${location.name}`;
            changeText = 'البيانات محدثة';
            changeDirection = 'positive';
          }
        }
      }
    });
    
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
    
    // Handle real-time chart data updates from WebSocket
    const handleChartDataUpdate = (event) => {
      if (event.detail.locationId === location.id && showChart) {
        console.log(`📈 LiveCounter: Real-time chart data update for ${location.id}`, event.detail.chartData);
        
        // Transform data format if needed
        const transformedData = Array.isArray(event.detail.chartData) 
          ? event.detail.chartData.map(item => ({
              time: item.time || item.timestamp,
              count: item.count || item.value || 0
            }))
          : [];
        
        // Update chart with new data
        if (chartComponent && transformedData.length > 0) {
          chartData = transformedData;
          chartComponent.updateData(transformedData.map(item => item.count));
        }
      }
    };
    
    // Handle chart data response from WebSocket requests
    const handleChartDataResponse = (event) => {
      if (event.detail.locationId === location.id && showChart) {
        console.log(`📊 LiveCounter: Chart data response for ${location.id}`, event.detail.chartData);
        
        // Transform data format
        const transformedData = Array.isArray(event.detail.chartData) 
          ? event.detail.chartData 
          : [];
        
        // Update chart with response data
        if (chartComponent && transformedData.length > 0) {
          chartData = transformedData;
          chartComponent.updateData(transformedData.map(item => item.count || 0));
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('progressiveSample', handleProgressiveSample);
    window.addEventListener('progressiveLoadingComplete', handleProgressiveComplete);
    window.addEventListener('chartDataUpdate', handleChartDataUpdate);
    window.addEventListener('chartDataResponse', handleChartDataResponse);
    
    // NO MORE PERIODIC UPDATES FOR LOCATION DATA
    // Non-realtime data (location info) handled by 5-minute GraphQL periodic refresh in analytics store
    // Only fallback mode uses periodic updates for live counts/charts

    // Listen for resize events
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
      if (showChart && timeframe && !isProgressiveLoading) {
        loadChartData();
      }
    });

    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('progressiveSample', handleProgressiveSample);
      window.removeEventListener('progressiveLoadingComplete', handleProgressiveComplete);
      window.removeEventListener('chartDataUpdate', handleChartDataUpdate);
      window.removeEventListener('chartDataResponse', handleChartDataResponse);
      if (unsubscribeWebSocketHealth) unsubscribeWebSocketHealth();
      if (unsubscribeFallbackMode) unsubscribeFallbackMode();
    };
  });
  
  onDestroy(() => {

    // Cleanup animations
    if (countUpInterval) {
      clearInterval(countUpInterval);
    }

    // Cleanup WebSocket worker
    if (wsUnsubscribe) {
      wsUnsubscribe();
      wsUnsubscribe = null;
    }

    if (updateInterval) {
      clearInterval(updateInterval);
    }
    if (unsubscribeRealTime) {
      unsubscribeRealTime();
    }
    if (unsubscribeLocations) {
      unsubscribeLocations();
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
  /**
   * Load all-data total from backend calculation
   */
  async function loadAllDataFromBackend() {
    try {
      isLoading = true;

      // Get backend-calculated total
      const totalData = await analyticsAPI.getAllLocationsTotal();

      count = totalData.liveCount || 0;
      animatedCount = count;

      summaryText = `${totalData.name} - ${count} شخص`;
      changeText = 'إجمالي محسوب من الخادم';
      changeDirection = 'positive';

      // Complete progressive loading
      if (isProgressiveLoading) {
        console.log(`✅ ${componentId}: Completing progressive loading from backend data`);
        isProgressiveLoading = false;
      }

    } catch (error) {
      console.error(`❌ ${componentId}: Failed to load backend total:`, error);
      summaryText = 'خطأ في تحميل الإجمالي';
      changeText = 'فشل في التحميل';
      changeDirection = 'negative';

      // Still complete progressive loading even on error
      if (isProgressiveLoading) {
        isProgressiveLoading = false;
      }
    } finally {
      isLoading = false;
    }
  }

  async function loadLocationData() {
    console.log(`📊 ${componentId}: Loading location data for:`, location.id, 'Current count:', count);
    
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
      console.log('📊 LiveCounter: All-data will use centralized location store (no direct API calls)');
      // For all-data, we rely ONLY on the location store updates from periodic refresh
      // The location store subscription will calculate the total automatically
      // NO direct API calls to avoid data conflicts
      summaryText = `Combined data from all regions`;
      changeText = 'Live updates from all locations';
      changeDirection = 'positive';
      count = 0; // Will be updated by location store subscription
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
      // Also complete progressive loading if it's still active
      if (isProgressiveLoading) {
        console.log(`✅ ${componentId}: Completing progressive loading from loadLocationData`);
        isProgressiveLoading = false;
      }
    }
  }

  /**
   * Load chart data from API
   */
  async function loadChartData() {
    console.log('📈 LiveCounter: Loading chart data for:', location.id, 'timeframe:', timeframe);
    
    if (!showChart) {
      console.log('⚠️ LiveCounter: Chart disabled, skipping chart data load');
      chartData = [];
      return;
    }

    if (!location.id || location.id === 'default') {
      console.log('⚠️ LiveCounter: Using visitor trends for default location');
      // For default/demo locations, use visitor trends data
      try {
        const chartResult = await analyticsAPI.getVisitorTrendsChart('DAILY');
        if (chartResult && chartResult.labels && chartResult.datasets) {
          // Convert chart format to expected format
          chartData = chartResult.labels.map((label, index) => ({
            time: label,
            count: chartResult.datasets[0]?.data[index] || 0
          }));
          console.log('✅ LiveCounter: Loaded visitor trends data:', chartData.length, 'points');
          if (chartComponent) {
            chartComponent.updateData(chartData);
          }
        } else {
          chartData = [];
        }
      } catch (error) {
        console.error('❌ LiveCounter: Failed to load visitor trends:', error);
        chartData = [];
      }
      return;
    }

    // For real locations, request chart data via WebSocket for real-time updates
    if (location.id === 'all-data') {
      console.log(`📊 ${componentId}: All-data skips direct chart loading (uses combined chart data)`);
      // For all-data, we could combine chart data from all regions, but for now skip
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
      
      // First, try to get initial chart data via WebSocket request
      console.log(`📊 LiveCounter: Requesting chart data via WebSocket for ${location.id}, timeframe: ${apiTimeframe}`);
      loadChartDataViaWebSocket(location.id, apiTimeframe);
      
      // Fallback to GraphQL if WebSocket fails or as backup
      try {
        const data = await getLocationChartData(location.id, apiTimeframe);
        
        if (data && data.length > 0) {
          chartData = data;
          console.log('✅ LiveCounter: Loaded fallback chart data via GraphQL:', data.length, 'points');
          if (chartComponent) {
            chartComponent.updateData(chartData.map(item => item.count || 0));
          }
        } else {
          console.log('⚠️ LiveCounter: No GraphQL chart data available');
          chartData = [];
        }
      } catch (graphqlError) {
        console.warn('⚠️ LiveCounter: GraphQL chart data fallback failed:', graphqlError);
        chartData = [];
      }
      
    } catch (error) {
      console.error('❌ LiveCounter: Failed to load chart data:', error);
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
  
  /**
   * Enable fallback mode - use GraphQL periodic updates for live counts/charts
   */
  function enableFallbackMode() {
    console.log(`🔄 ${componentId}: Enabling fallback mode with 30-second GraphQL updates`);
    
    // Start periodic updates for live counts when WebSocket fails
    // BUT skip for 'all-data' to avoid conflicts with centralized store
    if (location.id !== 'all-data') {
      updateInterval = setInterval(() => {
        if (!isProgressiveLoading) {
          console.log(`📊 ${componentId}: Fallback mode - refreshing via GraphQL`);
          loadLocationData();
          if (showChart) {
            loadChartData();
          }
        }
      }, 30000); // 30 seconds in fallback mode
    } else {
      console.log(`📊 ${componentId}: All-data component skips fallback mode (uses centralized store)`);
    }
  }
  
  /**
   * Disable fallback mode - return to WebSocket real-time updates
   */
  function disableFallbackMode() {
    console.log(`✅ ${componentId}: Disabling fallback mode, returning to WebSocket`);
    
    // Stop periodic updates when WebSocket recovers
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
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
    
    // Update WebSocket worker timeframe for real locations
    if (location.id && location.id !== 'default' && location.id !== 'all-data' && wsManager) {
      console.log(`🔄 ${componentId}: Updating worker timeframe to ${newTimeframe}`);
      
      // Update worker timeframe
      wsManager.updateWorkerTimeframe(location.id, newTimeframe);
      
      // Keep current count but update display text
      summaryText = `إجمالي تراكمي - ${location.name}`;
      changeText = `${newTimeframe.toLowerCase()} - العد التراكمي`;
      changeDirection = 'positive';
      
      // Don't reset count to 0 - keep cumulative value
      console.log(`📊 ${componentId}: Timeframe updated, keeping cumulative count: ${count}`);
    }
    
    // Update WebSocket subscription to new timeframe
    updateLiveTimeframe(newTimeframe);
    
    // Subscribe to this specific location with the new timeframe for immediate data
    subscribeToLocationWithTimeframe(location.id, newTimeframe);
    
    // For default locations, use regular loading
    // For all-data, skip to avoid conflicts with centralized store
    if (location.id === 'default') {
      await loadTimeframeData(newTimeframe);
      
      // Load chart data for new timeframe
      if (showChart) {
        loadChartData();
      }
    } else if (location.id === 'all-data') {
      console.log(`📊 ${componentId}: All-data skips timeframe loading (uses centralized store)`);
      // Load chart data for new timeframe via WebSocket
      if (showChart) {
        loadChartData();
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
    <div class="status-indicator {isInFallbackMode ? 'fallback' : 'active'}" 
         title="{isInFallbackMode ? 'Fallback mode - using periodic updates' : 'Real-time mode'}"></div>
  </div>
  
  <div class="counter-display">
    <div class="counter-container">
      {#if isLoading || isProgressiveLoading}
        <div class="loading-animation">
          <!-- You can replace this with a Lottie loading animation -->
          <!-- <DotLottieSvelte src="path/to/loading-animation.lottie" loop autoplay /> -->
          <div class="css-loading-spinner">
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
          </div>
        </div>
      {:else}
        <span
          class="counter-value"
          class:counting-up={showCountUpAnimation}
          class:bounce={counterAnimationKey > 0}
          key={counterAnimationKey}
        >
          {displayCount.toLocaleString('en-US')}
        </span>
      {/if}

      {#if previousCount > 0 && displayCount > previousCount}
        <div class="count-change-indicator" class:visible={showCountUpAnimation}>
          <span class="change-arrow">↗</span>
          <span class="change-amount">+{(displayCount - previousCount).toLocaleString('en-US')}</span>
        </div>
      {/if}
    </div>

    <span class="counter-label">
      {#if isProgressiveLoading}
        جاري التحميل...
      {:else if wsWorker && wsWorker.hasReceivedData}
        العدد التراكمي الإجمالي
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
        <span>{changeDirection === 'positive' ? '↑' : changeDirection === 'negative' ? '↓' : '💾'}</span>
        <span>{changeText}</span>
      </div>
    </div>
  {/if}
</div>
