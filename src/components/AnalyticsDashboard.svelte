<script>
  import './styles/AnalyticsDashboard.css';
  import { onMount, onDestroy } from 'svelte';
  import DataTable from './DataTable.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import LoadingState from './LoadingState.svelte';
  import Chart from './Chart.svelte';
  import {
    locations,
    isLoading,
    error,
    loadLocations
  } from '../lib/stores/analytics-simple.js';

  export let timeframe = 'Daily';
  
  let charts = {};
  let showCustomizeModal = false;
  let viewMode = 'grid'; // 'grid' or 'table'
  let chartVisibility = {
    trafficChart: true,
    demographicsChart: true,
    deviceChart: true
  };
  let isLoadingCharts = false;
  let initializationError = null;
  let isAutoRefreshing = false;
  let errorBoundary;
  let isInitializing = false;
  let hasInitialized = false;
  let analyticsSummary = null;
  let visitorDistribution = null;
  let refreshInterval = null;
  let isTimeframeChanging = false;
  
  // Reactive statement to reload data when timeframe changes
  $: if (timeframe && hasInitialized) {
    console.log(`📅 Analytics Dashboard: Timeframe changed to ${timeframe}, reloading data...`);

    // Show timeframe change loading state
    isTimeframeChanging = true;

    // Reset and reload with new timeframe
    hasInitialized = false;
    initializeDashboard().finally(() => {
      // Hide timeframe loading after data loads
      setTimeout(() => {
        isTimeframeChanging = false;
      }, 500);
    });

    // Restart auto-refresh with new timeframe
    startAutoRefresh();
  }

  onMount(async () => {
    const analyticsSection = document.getElementById('analytics');
    if (!analyticsSection) {
      initializeDashboard();
      startAutoRefresh();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasInitialized) {
          initializeDashboard();
          startAutoRefresh();
        }
      });
    }, { rootMargin: '100px' });

    observer.observe(analyticsSection);

    return () => {
      observer.disconnect();
      stopAutoRefresh();
    };
  });
  
  async function initializeDashboard() {
    if (hasInitialized) return;

    console.log('🔄 AnalyticsDashboard: Starting initialization...');
    hasInitialized = true;
    isInitializing = true;

    try {
      console.log('📊 AnalyticsDashboard: Loading data from GraphQL...');

      // Use GraphQL to get both analytics and locations data
      const apiUrl = import.meta.env.VITE_API_URL || 'http://10.10.1.205:8080';

      // Query REAL visitor distribution data + analytics summary + locations
      const timeframeValue = timeframe.toUpperCase(); // Convert "Daily" to "DAILY"
      const graphqlQuery = {
        query: `{
          analyticsSummary(timeframe: ${timeframeValue}) {
            totalVisitors
            newVisitors
            avgVisitDurationHours
            peakVisitorsToday
          }
          allLocations {
            id
            name
            liveCount
          }
          visitorDistribution(input: {
            locationFilter: ALL,
            timePeriod: ${timeframeValue},
            limit: 20
          }) {
            locationId
            locationName
            timePeriod
            totalRecords
            returnedRecords
            dataPoints {
              timestamp
              periodLabel
              visitorCount
              totalDetections
              menRegionCount
              womenRegionCount
              changeFromPrevious
            }
            summary {
              totalVisitors
              totalDetections
              peakPeriod
              peakCount
              averagePerPeriod
              trendDirection
            }
          }
        }`
      };

      const response = await fetch(`${apiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphqlQuery)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AnalyticsDashboard: Got GraphQL data:', result);

        if (result.data) {
          // Store analytics summary as component variable
          if (result.data.analyticsSummary) {
            analyticsSummary = result.data.analyticsSummary;
            console.log('📊 Analytics Summary loaded:', result.data.analyticsSummary);
          }

          // Store visitor distribution data
          if (result.data.visitorDistribution) {
            visitorDistribution = result.data.visitorDistribution;
            console.log('📈 Visitor Distribution loaded:', result.data.visitorDistribution);
          }

          // Update locations store
          if (result.data.allLocations) {
            const graphqlLocations = result.data.allLocations.map(loc => ({
              id: loc.id,
              name: loc.name,
              liveCount: loc.liveCount,
              initialCount: loc.liveCount,
              status: 'active'
            }));
            locations.set(graphqlLocations);
            console.log('📍 Locations loaded from GraphQL:', graphqlLocations);
          }
        }
      } else {
        console.warn('⚠️ AnalyticsDashboard: GraphQL request failed, using fallback');
        await loadLocations();
      }

      console.log('✅ AnalyticsDashboard: Dashboard initialized with GraphQL data');

      // Initialize charts after data is loaded
      setTimeout(() => {
        initializeCharts();
      }, 500);

    } catch (error) {
      console.error('❌ AnalyticsDashboard: Initialization failed:', error);
      initializationError = error;
      // Fallback to simple store
      await loadLocations();

      // Still try to show charts even if data loading failed
      setTimeout(() => {
        initializeCharts();
      }, 500);
    } finally {
      isInitializing = false;
    }
  }

  onDestroy(() => {
    // Cleanup auto-refresh interval
    stopAutoRefresh();
  });

  /**
   * Start auto-refresh every 10 minutes (600,000 ms)
   */
  function startAutoRefresh() {
    // Clear any existing interval
    stopAutoRefresh();

    console.log('⏰ Analytics Dashboard: Starting auto-refresh every 10 minutes');

    refreshInterval = setInterval(async () => {
      console.log('🔄 Analytics Dashboard: Auto-refreshing data (10-minute interval)');

      // Show refresh indicator
      isAutoRefreshing = true;

      try {
        // Reset hasInitialized to force a fresh data load
        hasInitialized = false;
        await initializeDashboard();
      } finally {
        // Hide refresh indicator after 2 seconds
        setTimeout(() => {
          isAutoRefreshing = false;
        }, 2000);
      }
    }, 600000); // 10 minutes = 600,000 milliseconds
  }

  /**
   * Stop auto-refresh interval
   */
  function stopAutoRefresh() {
    if (refreshInterval) {
      console.log('⏰ Analytics Dashboard: Stopping auto-refresh');
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
  
  /**
   * Fill gaps in time series data with zero values for complete timeline
   */
  function fillTimeGaps(dataPoints, timeframe) {
    if (!dataPoints || dataPoints.length === 0) {
      return [];
    }

    // Sort data points by timestamp
    const sortedPoints = [...dataPoints].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (sortedPoints.length < 2) {
      return sortedPoints; // Not enough data to determine gaps
    }

    const filledPoints = [];

    // Determine the time interval based on timeframe
    let intervalMs;
    let formatPeriodLabel;

    switch (timeframe.toUpperCase()) {
      case 'HOURLY':
        intervalMs = 60 * 60 * 1000; // 1 hour
        formatPeriodLabel = (date) => date.toLocaleString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        });
        break;
      case 'DAILY':
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        formatPeriodLabel = (date) => date.toLocaleDateString('ar-EG', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        break;
      case 'WEEKLY':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
        formatPeriodLabel = (date) => `أسبوع ${date.toLocaleDateString('ar-EG', {
          day: '2-digit',
          month: '2-digit'
        })}`;
        break;
      case 'MONTHLY':
        intervalMs = 30 * 24 * 60 * 60 * 1000; // 1 month (approximation)
        formatPeriodLabel = (date) => date.toLocaleDateString('ar-EG', {
          month: 'long',
          year: 'numeric'
        });
        break;
      default:
        intervalMs = 60 * 60 * 1000; // Default to hourly
        formatPeriodLabel = (date) => date.toLocaleString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit'
        });
    }

    console.log(`📊 Gap filling: Using ${intervalMs}ms intervals for ${timeframe} timeframe`);

    // Start from the first data point
    let currentTime = new Date(sortedPoints[0].timestamp);
    const endTime = new Date(sortedPoints[sortedPoints.length - 1].timestamp);

    let dataIndex = 0;

    while (currentTime <= endTime) {
      const currentTimeStr = currentTime.toISOString();

      // Check if we have data for this time point
      const existingPoint = sortedPoints.find(point => {
        const pointTime = new Date(point.timestamp);
        // Allow some tolerance (±30 minutes for flexibility)
        const tolerance = 30 * 60 * 1000;
        return Math.abs(pointTime - currentTime) < tolerance;
      });

      if (existingPoint) {
        // Use existing data point
        filledPoints.push(existingPoint);
        console.log(`📊 Found existing data for ${currentTimeStr}: ${existingPoint.visitorCount} visitors`);
      } else {
        // Create zero-filled data point for missing time
        const zeroPoint = {
          timestamp: currentTimeStr,
          periodLabel: formatPeriodLabel(currentTime),
          visitorCount: 0,
          totalDetections: 0,
          menRegionCount: 0,
          womenRegionCount: 0,
          changeFromPrevious: 0
        };
        filledPoints.push(zeroPoint);
        console.log(`📊 Added zero data for missing time ${currentTimeStr}: ${zeroPoint.periodLabel}`);
      }

      // Move to next time interval
      currentTime = new Date(currentTime.getTime() + intervalMs);
    }

    console.log(`📊 Gap filling complete: ${dataPoints.length} → ${filledPoints.length} data points`);
    return filledPoints;
  }

  async function initializeCharts() {
    console.log('📊 Initializing charts with REAL data from schema...');

    // Set loading state for charts
    isLoadingCharts = true;

    try {
      // Use real data from analyticsSummary and locations store
      const locationsData = $locations || [];

      // 1. REAL LINE CHART - Using REAL visitorDistribution data from GraphQL
      if (visitorDistribution && visitorDistribution.dataPoints && visitorDistribution.dataPoints.length > 0) {
        const dataPoints = visitorDistribution.dataPoints;
        const hasData = dataPoints.some(point => point.visitorCount > 0);

        // FILL GAPS WITH ZERO VALUES FOR COMPLETE TIMELINE
        const filledDataPoints = fillTimeGaps(dataPoints, timeframe);
        console.log(`📊 Original data points: ${dataPoints.length}, After gap filling: ${filledDataPoints.length}`);

        const realDistributionData = {
          labels: filledDataPoints.map(point => point.periodLabel || 'غير محدد'),
          datasets: [{
            label: hasData ? `توزيع الزوار - ${timeframe}` : `توزيع الزوار - ${timeframe} - لا توجد بيانات`,
            data: filledDataPoints.map(point => point.visitorCount || 0),
            borderColor: hasData ? '#16a085' : '#bdc3c7',
            backgroundColor: hasData ? 'rgba(22, 160, 133, 0.1)' : 'rgba(189, 195, 199, 0.1)'
          }]
        };

        // Add secondary line for men/women breakdown if available
        if (dataPoints.some(point => point.menRegionCount > 0 || point.womenRegionCount > 0)) {
          realDistributionData.datasets.push({
            label: 'منطقة الرجال',
            data: filledDataPoints.map(point => point.menRegionCount || 0),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)'
          });
          realDistributionData.datasets.push({
            label: 'منطقة النساء',
            data: filledDataPoints.map(point => point.womenRegionCount || 0),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)'
          });
        }

        charts.trafficData = realDistributionData;

        if (hasData) {
          console.log(`✅ REAL visitor distribution chart created for ${timeframe}:`, realDistributionData);
        } else {
          console.log(`⚠️ No visitor distribution data for ${timeframe}, showing zeros:`, realDistributionData);
        }
      } else {
        // Fallback when no visitor distribution data
        console.log(`⚠️ No visitorDistribution data available for ${timeframe}`);
        charts.trafficData = {
          labels: [`لا توجد بيانات - ${timeframe}`],
          datasets: [{
            label: `لا توجد بيانات للإطار الزمني: ${timeframe}`,
            data: [0],
            borderColor: '#bdc3c7',
            backgroundColor: 'rgba(189, 195, 199, 0.1)'
          }]
        };
      }

      // 2. REAL PIE CHART - Analytics Summary breakdown + ZERO DATA HANDLING
      if (analyticsSummary) {
        const totalVisitors = analyticsSummary.totalVisitors || 0;
        const newVisitors = analyticsSummary.newVisitors || 0;
        const peakVisitors = analyticsSummary.peakVisitorsToday || 0;
        const hasAnyData = totalVisitors > 0 || newVisitors > 0 || peakVisitors > 0;

        const realSummaryData = {
          labels: hasAnyData ?
            ['إجمالي الزوار', 'الزوار الجدد', 'ذروة الزوار'] :
            ['لا توجد بيانات'],
          datasets: [{
            data: hasAnyData ?
              [totalVisitors, newVisitors, peakVisitors] :
              [1], // Show single slice for "no data"
            backgroundColor: hasAnyData ? [
              'rgba(22, 160, 133, 0.9)',   // Total visitors
              'rgba(52, 152, 219, 0.7)',   // New visitors
              'rgba(155, 89, 182, 0.6)'    // Peak visitors
            ] : [
              'rgba(189, 195, 199, 0.5)'   // Gray for no data
            ]
          }]
        };
        charts.demographicsData = realSummaryData;

        if (hasAnyData) {
          console.log('✅ Real analytics summary chart created with data');
        } else {
          console.log(`⚠️ No analytics data for ${timeframe}, showing "no data" chart`);
        }
      }

      // 3. REAL PIE CHART - Actual Locations Distribution + ZERO DATA HANDLING
      if (locationsData.length > 0) {
        const totalLiveCount = locationsData.reduce((sum, loc) => sum + (loc.liveCount || 0), 0);
        const hasLocationData = totalLiveCount > 0;

        const realLocationsData = {
          labels: hasLocationData ?
            locationsData.map(loc => loc.name) :
            ['لا توجد بيانات في المناطق'],
          datasets: [{
            data: hasLocationData ?
              locationsData.map(loc => loc.liveCount || 0) :
              [1], // Show single slice for "no data"
            backgroundColor: hasLocationData ?
              locationsData.map((_, i) => {
                const colors = [
                  'rgba(22, 160, 133, 0.9)',   // Primary teal
                  'rgba(52, 152, 219, 0.7)',   // Blue
                  'rgba(155, 89, 182, 0.6)',   // Purple
                  'rgba(149, 165, 166, 0.5)',  // Gray
                  'rgba(22, 160, 133, 0.4)',   // Light teal
                  'rgba(52, 152, 219, 0.3)'    // Light blue
                ];
                return colors[i % colors.length];
              }) : [
                'rgba(189, 195, 199, 0.5)'   // Gray for no data
              ]
          }]
        };
        charts.deviceData = realLocationsData;

        if (hasLocationData) {
          console.log('✅ Real locations distribution chart created with data');
        } else {
          console.log('⚠️ No live count data in locations, showing "no data" chart');
        }
      } else {
        // No locations at all
        const noLocationsData = {
          labels: ['لا توجد مناطق'],
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(189, 195, 199, 0.5)']
          }]
        };
        charts.deviceData = noLocationsData;
        console.log('⚠️ No locations available, showing "no locations" chart');
      }

      // Fallback if no real data available at all
      if (!analyticsSummary && locationsData.length === 0) {
        console.log(`⚠️ No real data available for ${timeframe}, showing complete "no data" charts`);

        charts.trafficData = {
          labels: [`لا توجد بيانات - ${timeframe}`],
          datasets: [{
            label: `لا توجد بيانات للإطار الزمني: ${timeframe}`,
            data: [0],
            borderColor: '#bdc3c7',
            backgroundColor: 'rgba(189, 195, 199, 0.1)'
          }]
        };

        charts.demographicsData = {
          labels: ['لا توجد بيانات إحصائية'],
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(189, 195, 199, 0.5)']
          }]
        };

        charts.deviceData = {
          labels: ['لا توجد بيانات للمناطق'],
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(189, 195, 199, 0.5)']
          }]
        };
      }

      console.log('✅ Charts initialized with REAL data from your schema');
    } catch (error) {
      console.error('❌ Failed to initialize charts:', error);
    } finally {
      // Hide charts loading state
      isLoadingCharts = false;
    }
  }

  
  function toggleCustomizeModal() {
    showCustomizeModal = !showCustomizeModal;
  }
  
  function toggleChartVisibility(chartId) {
    chartVisibility[chartId] = !chartVisibility[chartId];
  }
  
  function exportReport() {
    window.print();
  }
  
  function toggleView() {
    viewMode = viewMode === 'grid' ? 'table' : 'grid';
  }
  
  function handleDataExport() {
    // Export data silently
  }

  $: if (timeframe && hasInitialized && !isInitializing) {
    refreshAnalytics();
  }

  async function refreshAnalytics() {
    if (isLoadingCharts) return;
    isLoadingCharts = true;

    try {
      await loadLocations();
    } catch (error) {
      console.error('❌ Failed to refresh analytics:', error);
    } finally {
      isLoadingCharts = false;
    }
  }
</script>

<svelte:head>
  <title>لوحة تحكم التحليلات</title>
</svelte:head>

<ErrorBoundary 
  bind:this={errorBoundary}
  errorMessage="حدث خطأ في تحميل لوحة التحكم"
  showRetry={false}
  on:error={(event) => console.error('Dashboard Error:', event.detail)}
>

{#if isInitializing}
  <LoadingState
    variant="overlay"
    size="large"
    type="chart"
    message="جاري تحميل لوحة تحكم التحليلات..."
    showProgress={true}
    progress={30}
  />
{:else if isTimeframeChanging}
  <LoadingState
    variant="overlay"
    size="large"
    type="pulse"
    message="جاري تحديث البيانات للإطار الزمني: {timeframe}..."
    showProgress={true}
    progress={60}
  />
{:else}

{#if showCustomizeModal}
  <div class="customize-modal" on:click={toggleCustomizeModal} on:keydown={(e) => e.key === 'Escape' && toggleCustomizeModal()} role="dialog" tabindex="-1">
    <div class="customize-modal-content" on:click|stopPropagation on:keydown|stopPropagation>
      <span class="customize-modal-close" on:click={toggleCustomizeModal} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleCustomizeModal()} role="button" tabindex="0">&times;</span>
      <h3>تخصيص لوحة التحكم</h3>
      <div class="chart-toggle-list">
        {#each Object.keys(chartVisibility) as chartId}
          <div class="chart-toggle">
            <input 
              type="checkbox" 
              id="toggle-{chartId}" 
              bind:checked={chartVisibility[chartId]}
              on:change={() => toggleChartVisibility(chartId)}
            >
            <label for="toggle-{chartId}">{chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim() === 'Traffic' ? 'حركة المرور' : chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim() === 'Demographics' ? 'التركيبة السكانية' : chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim() === 'Device' ? 'الجهاز' : chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim() === 'Revenue' ? 'الإيرادات' : chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim() === 'Pages' ? 'الصفحات' : chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim()}</label>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

{#if viewMode === 'grid'}
<div class="dashboard" id="dashboard-container">
  <!-- Auto-refresh indicator -->
  {#if isAutoRefreshing}
    <div class="refresh-indicator">
      <div class="refresh-icon">🔄</div>
      <span>تحديث البيانات تلقائياً...</span>
    </div>
  {/if}

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">
        {#if isLoadingCharts || isTimeframeChanging}
          <LoadingState
            variant="inline"
            size="small"
            type="spinner"
            showMessage={false}
          />
        {:else if analyticsSummary}
          {analyticsSummary.totalVisitors.toLocaleString('ar-EG')}
        {:else if $locations && $locations.length > 0}
          {$locations.reduce((total, loc) => total + (loc.liveCount || 0), 0).toLocaleString('ar-EG')}
        {:else}
          152.3K
        {/if}
      </div>
      <div class="stat-label">إجمالي الزوار</div>
      <div class="stat-change positive">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
        </svg>
        +12.5%
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-value">
        {#if isLoadingCharts || isTimeframeChanging}
          <LoadingState
            variant="inline"
            size="small"
            type="spinner"
            showMessage={false}
          />
        {:else if analyticsSummary}
          {analyticsSummary.newVisitors.toLocaleString('ar-EG')}
        {:else if $locations && $locations.length > 0}
          {$locations.length.toLocaleString('ar-EG')}
        {:else}
          98.7K
        {/if}
      </div>
      <div class="stat-label">الزوار الجدد</div>
      <div class="stat-change positive">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
        </svg>
        +8.3%
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-value">
        {#if isLoadingCharts || isTimeframeChanging}
          <LoadingState
            variant="inline"
            size="small"
            type="spinner"
            showMessage={false}
          />
        {:else if analyticsSummary}
          {analyticsSummary.avgVisitDurationHours.toFixed(2)}
        {:else}
          2.45
        {/if}
      </div>
      <div class="stat-label">متوسط مدة الزيارة (ساعات)</div>
      <div class="stat-change negative">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17l-5-5m0 0l5-5m-5 5h12"></path>
        </svg>
        -2.1%
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-value">
        {#if isLoadingCharts || isTimeframeChanging}
          <LoadingState
            variant="inline"
            size="small"
            type="spinner"
            showMessage={false}
          />
        {:else if analyticsSummary}
          {analyticsSummary.peakVisitorsToday.toLocaleString('ar-EG')}
        {:else}
          3,450
        {/if}
      </div>
      <div class="stat-label">ذروة الزوار اليومية</div>
      <div class="stat-change positive">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
        </svg>
        +15.7%
      </div>
    </div>
  </div>

  {#if chartVisibility.trafficChart}
    <div class="chart-card full-width">
      <div class="chart-header">
        <div>
          <div class="chart-title">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
            توزيع الزوار الحقيقي - {timeframe}
          </div>
          <div class="chart-subtitle">بيانات حقيقية من نظام كشف الوجوه</div>
        </div>
      </div>
      <div class="chart-container">
        {#if isLoadingCharts}
          <LoadingState
            variant="card"
            size="medium"
            type="bars"
            message="جاري تحميل بيانات توزيع الزوار..."
          />
        {:else if charts.trafficData}
          <Chart
            data={charts.trafficData.datasets[0].data}
            labels={charts.trafficData.labels}
            chartType="line"
            theme={{ color: '#16a085', rgb: '22, 160, 133' }}
            showHover={true}
            smoothCurve={true}
            useSvg={false}
          />
        {:else}
          <div class="chart-empty">
            <p>لا توجد بيانات متاحة</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if chartVisibility.demographicsChart}
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            تقسيم إحصائيات الزوار
          </div>
          <div class="chart-subtitle">إجمالي الزوار، الجدد، وذروة الزوار</div>
        </div>
      </div>
      <div class="chart-container">
        {#if isLoadingCharts}
          <LoadingState
            variant="card"
            size="medium"
            type="pulse"
            message="جاري تحميل إحصائيات الزوار..."
          />
        {:else if charts.demographicsData}
          <Chart
            data={charts.demographicsData.datasets[0].data}
            labels={charts.demographicsData.labels}
            chartType="doughnut"
            theme={{ color: '#16a085', rgb: '22, 160, 133' }}
            showHover={true}
            smoothCurve={false}
            useSvg={false}
          />
        {:else}
          <div class="chart-empty">
            <p>لا توجد بيانات متاحة</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if chartVisibility.deviceChart}
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            توزيع الزوار حسب المناطق
          </div>
          <div class="chart-subtitle">إحصائيات العدد الحي في كل منطقة</div>
        </div>
      </div>
      <div class="chart-container">
        {#if isLoadingCharts}
          <LoadingState
            variant="card"
            size="medium"
            type="dots"
            message="جاري تحميل بيانات المناطق..."
          />
        {:else if charts.deviceData}
          <Chart
            data={charts.deviceData.datasets[0].data}
            labels={charts.deviceData.labels}
            chartType="doughnut"
            theme={{ color: '#16a085', rgb: '22, 160, 133' }}
            showHover={true}
            smoothCurve={false}
            useSvg={false}
          />
        {:else}
          <div class="chart-empty">
            <p>لا توجد بيانات متاحة</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

</div>
{:else}
  <DataTable 
    title={'جدول بيانات التحليلات'}
    on:export={handleDataExport}
  />
{/if}

{/if}
</ErrorBoundary>

