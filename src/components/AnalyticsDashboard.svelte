<script>
  import './styles/AnalyticsDashboard.css';
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import DataTable from './DataTable.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import LoadingState from './LoadingState.svelte';
  import { 
    analyticsSummary,
    loadAnalyticsSummary,
    getAnalyticsChart,
    getHistoryData,
    loadAllChartsData,
    chartData,
    cameras,
    loadCameras
  } from '../lib/stores/analytics.js';
  import analyticsAPI from '../lib/api/analytics.js';
  
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
  let errorBoundary;
  let isInitializing = false;
  let hasInitialized = false;
  let isVisible = false;
  
  // Component created - only show warnings and errors
  
  // Intersection Observer to detect when analytics section is visible
  let analyticsSection;
  
  onMount(async () => {
    // Find the analytics section
    analyticsSection = document.getElementById('analytics');
    
    if (analyticsSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasInitialized) {
            isVisible = true;
            initializeDashboard();
          }
        });
      }, {
        rootMargin: '100px' // Start loading 100px before the section becomes visible
      });
      
      observer.observe(analyticsSection);
      
      return () => {
        observer.disconnect();
      };
    } else {
      // Fallback: initialize immediately if section not found
      console.warn('⚠️ Analytics section not found, initializing immediately');
      initializeDashboard();
    }
  });
  
  async function initializeDashboard() {
    if (hasInitialized) return;
    
    hasInitialized = true;
    isInitializing = true;
    
    try {
      // Load analytics summary
      try {
        await loadAnalyticsSummary(mapTimeframe(timeframe));
      } catch (summaryError) {
        console.error('❌ Failed to load analytics summary:', summaryError);
      }
      
      // Load chart data
      try {
        await loadAllChartsData(mapTimeframe(timeframe));
      } catch (chartError) {
        console.error('❌ Failed to load chart data:', chartError);
      }
      
      // Load cameras
      try {
        await loadCameras();
      } catch (cameraError) {
        console.error('❌ Failed to load cameras:', cameraError);
      }
      
      // Initialize charts
      try {
        await initializeCharts();
      } catch (chartInitError) {
        console.error('❌ Chart initialization failed:', chartInitError);
      }
      
    } catch (error) {
      console.error('❌ AnalyticsDashboard: Initialization failed:', error);
      initializationError = error;
    } finally {
      isInitializing = false;
    }
  }

  onDestroy(() => {
    // Clean up charts
    Object.values(charts).forEach(chart => {
      if (chart) chart.destroy();
    });
  });

  // Map timeframe to API format
  function mapTimeframe(tf) {
    const mapping = {
      'Hourly': 'HOURLY',
      'Daily': 'DAILY',
      'Weekly': 'WEEKLY', 
      'Monthly': 'MONTHLY'
    };
    return mapping[tf] || 'DAILY';
  }
  
  async function initializeCharts() {
    try {
      Chart.defaults.font.family = "'Cairo', 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif";
      Chart.defaults.font.size = 12;
      
      // Check for dark mode
      const isDarkMode = document.documentElement.classList.contains('dark-mode');
      Chart.defaults.color = isDarkMode ? '#e2e8f0' : '#2c3e50';

      const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: { 
        legend: { 
          labels: { 
            usePointStyle: true, 
            padding: 20, 
            color: isDarkMode ? '#e2e8f0' : '#2c3e50',
            font: {
              size: 12,
              family: 'Cairo, sans-serif'
            }
          } 
        },
        tooltip: {
          backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
          titleColor: isDarkMode ? '#e2e8f0' : '#2c3e50',
          bodyColor: isDarkMode ? '#a0aec0' : '#7f8c8d',
          borderColor: isDarkMode ? '#4a5568' : '#e1e8ed',
          borderWidth: 1,
          cornerRadius: 8,
          titleFont: {
            size: 14,
            weight: 'bold',
            family: 'Cairo, sans-serif'
          },
          bodyFont: {
            size: 13,
            family: 'Cairo, sans-serif'
          },
          displayColors: true,
          boxPadding: 8,
          padding: 12
        }
      },
      scales: {
        x: { 
          grid: { 
            color: isDarkMode ? 'rgba(226, 232, 240, 0.1)' : 'rgba(44, 62, 80, 0.1)', 
            drawBorder: false 
          }, 
          ticks: { 
            color: isDarkMode ? '#a0aec0' : '#7f8c8d',
            font: {
              size: 11,
              family: 'Cairo, sans-serif'
            }
          },
          border: {
            color: isDarkMode ? 'rgba(226, 232, 240, 0.2)' : 'rgba(44, 62, 80, 0.2)'
          }
        },
        y: { 
          grid: { 
            color: isDarkMode ? 'rgba(226, 232, 240, 0.1)' : 'rgba(44, 62, 80, 0.1)', 
            drawBorder: false 
          }, 
          ticks: { 
            color: isDarkMode ? '#a0aec0' : '#7f8c8d',
            font: {
              size: 11,
              family: 'Cairo, sans-serif'
            }
          },
          border: {
            color: isDarkMode ? 'rgba(226, 232, 240, 0.2)' : 'rgba(44, 62, 80, 0.2)'
          }
        }
      }
    };

    // Get real data from store, use fallback if empty
    const visitorTrendsData = $chartData?.visitorTrends;
    const locationDistributionData = $chartData?.locationDistribution;
    const cameraPerformanceData = $chartData?.cameraPerformance;
    
    // Check for missing chart data
    if (!visitorTrendsData?.labels?.length) {
      console.warn('⚠️ No visitor trends data available');
    }
    if (!locationDistributionData?.labels?.length) {
      console.warn('⚠️ No location distribution data available');
    }
    if (!cameraPerformanceData?.analytics_chart?.labels?.length) {
      console.warn('⚠️ No camera performance data available');
    }

    // Show "No Data Available" when backend has no real data
    const noDataVisitorChart = {
      labels: ['لا توجد بيانات'],
      datasets: [{
        label: 'لا توجد بيانات متاحة',
        data: [0],
        borderColor: '#cccccc',
        backgroundColor: 'rgba(204, 204, 204, 0.2)',
        fill: true,
        tension: 0.4
      }]
    };

    const noDataLocationChart = {
      labels: ['لا توجد بيانات'],
      datasets: [{
        data: [1],
        backgroundColor: ['#cccccc'],
        borderWidth: 0
      }]
    };

    const noDataCameraChart = {
      labels: ['لا توجد بيانات'],
      datasets: [{
        label: 'لا توجد بيانات متاحة',
        data: [0],
        backgroundColor: '#cccccc',
        borderColor: '#cccccc',
        borderWidth: 1
      }]
    };

    const chartConfigs = {
      trafficChart: { 
        type: 'line', 
        data: (visitorTrendsData && visitorTrendsData.labels && visitorTrendsData.labels.length > 0) ? {
          labels: visitorTrendsData.labels,
          datasets: visitorTrendsData.datasets.map((dataset, index) => ({
            label: dataset.label || (index === 0 ? 'زوار الحرم' : 'الزوار الجدد'),
            data: dataset.data || [],
            borderColor: index === 0 ? '#16a085' : '#1abc9c',
            backgroundColor: index === 0 ? 'rgba(22, 160, 133, 0.2)' : 'rgba(26, 188, 156, 0.2)',
            fill: true,
            tension: 0.4
          }))
        } : noDataVisitorChart, 
        options: chartOptions 
      },
      demographicsChart: { 
        type: 'doughnut', 
        data: (locationDistributionData && locationDistributionData.labels && locationDistributionData.labels.length > 0) ? {
          labels: locationDistributionData.labels,
          datasets: [{
            data: locationDistributionData.datasets?.[0]?.data || [0], 
            backgroundColor: ['#16a085', '#1abc9c', '#48c9b0', '#76d7c4', '#85c1e9', '#f7dc6f', '#bb8fce'], 
            borderWidth: 0 
          }] 
        } : noDataLocationChart, 
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          interaction: {
            intersect: false
          },
          plugins: { 
            legend: { 
              position: 'right', 
              labels: { 
                usePointStyle: true, 
                color: isDarkMode ? '#e2e8f0' : '#2c3e50',
                font: {
                  size: 12,
                  family: 'Cairo, sans-serif'
                }
              } 
            },
            tooltip: {
              backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
              titleColor: isDarkMode ? '#e2e8f0' : '#2c3e50',
              bodyColor: isDarkMode ? '#a0aec0' : '#7f8c8d',
              borderColor: isDarkMode ? '#4a5568' : '#e1e8ed',
              borderWidth: 1,
              cornerRadius: 8,
              titleFont: {
                size: 14,
                weight: 'bold',
                family: 'Cairo, sans-serif'
              },
              bodyFont: {
                size: 13,
                family: 'Cairo, sans-serif'
              },
              displayColors: true,
              boxPadding: 8,
              padding: 12
            }
          } 
        } 
      },
      deviceChart: { 
        type: 'bar', 
        data: (cameraPerformanceData?.analytics_chart && cameraPerformanceData.analytics_chart.labels && cameraPerformanceData.analytics_chart.labels.length > 0) ? {
          labels: cameraPerformanceData.analytics_chart.labels,
          datasets: [{
            label: 'إجمالي الإكتشافات',
            data: cameraPerformanceData.analytics_chart.datasets?.[0]?.data || [0], 
            backgroundColor: '#16a085',
            borderColor: '#16a085',
            borderWidth: 1 
          }] 
        } : noDataCameraChart, 
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          interaction: {
            intersect: false
          },
          plugins: { 
            legend: { 
              position: 'bottom', 
              labels: { 
                usePointStyle: true, 
                color: isDarkMode ? '#e2e8f0' : '#2c3e50',
                font: {
                  size: 12,
                  family: 'Cairo, sans-serif'
                }
              } 
            },
            tooltip: {
              backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
              titleColor: isDarkMode ? '#e2e8f0' : '#2c3e50',
              bodyColor: isDarkMode ? '#a0aec0' : '#7f8c8d',
              borderColor: isDarkMode ? '#4a5568' : '#e1e8ed',
              borderWidth: 1,
              cornerRadius: 8,
              titleFont: {
                size: 14,
                weight: 'bold',
                family: 'Cairo, sans-serif'
              },
              bodyFont: {
                size: 13,
                family: 'Cairo, sans-serif'
              },
              displayColors: true,
              boxPadding: 8,
              padding: 12
            }
          } 
        } 
      }
    };

      // Load real data for charts and create them
      await loadChartsWithRealData(chartConfigs, chartOptions, isDarkMode);
    } catch (error) {
      console.error('❌ Chart initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load charts with real data from API
   */
  async function loadChartsWithRealData(chartConfigs, chartOptions, isDarkMode) {
    isLoadingCharts = true;
    
    try {
      // Load visitor trends chart with real data
      const visitorTrendsData = await getAnalyticsChart('visitors_over_time', mapTimeframe(timeframe));
      if (visitorTrendsData && visitorTrendsData.labels && visitorTrendsData.datasets) {
        chartConfigs.trafficChart.data = {
          labels: visitorTrendsData.labels,
          datasets: visitorTrendsData.datasets.map((dataset, index) => ({
            ...dataset,
            borderColor: index === 0 ? '#16a085' : '#1abc9c',
            backgroundColor: index === 0 ? 'rgba(22, 160, 133, 0.2)' : 'rgba(26, 188, 156, 0.2)',
            fill: true,
            tension: 0.4
          }))
        };
      } else {
        // Use fallback empty data structure
        chartConfigs.trafficChart.data = {
          labels: ['لا توجد بيانات'],
          datasets: [{
            label: 'الزوار',
            data: [0],
            borderColor: '#16a085',
            backgroundColor: 'rgba(22, 160, 133, 0.2)',
            fill: true
          }]
        };
      }

      // Load location distribution and device analytics if available  
      const supportedChartTypes = ['location_distribution', 'device_stats'];
      await Promise.all(supportedChartTypes.map(async (type) => {
        try {
          const data = await getAnalyticsChart(type, mapTimeframe(timeframe));
          if (data && data.labels && data.datasets) {
            // Map to existing chart names if they exist
            const chartMapping = {
              'location_distribution': 'demographicsChart',
              'device_stats': 'deviceChart'
            };
            
            const chartKey = chartMapping[type];
            if (chartKey && chartConfigs[chartKey]) {
              chartConfigs[chartKey].data = {
                labels: data.labels,
                datasets: data.datasets
              };
              // Successfully loaded chart data
            }
          }
        } catch (error) {
          console.warn(`⚠️ Using no-data placeholder for ${type} chart:`, error.message);
        }
      }));

    } catch (error) {
      console.error('Failed to load chart data:', error);
    }

    // Create all charts - destroy existing first
    Object.keys(chartConfigs).forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        // Destroy existing chart if it exists
        if (charts[id]) {
          charts[id].destroy();
        }
        
        charts[id] = new Chart(canvas, chartConfigs[id]);
      }
    });

    isLoadingCharts = false;
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
  
  function handleDataExport(event) {
    // Export data silently
  }

  // Reactive statements to handle timeframe changes
  $: if (timeframe) {
    loadAnalyticsSummary(mapTimeframe(timeframe));
    refreshCharts();
  }

  async function refreshCharts() {
    if (isLoadingCharts) return;
    
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    charts = {};
    
    // Re-initialize with new data
    await initializeCharts();
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
    message="جاري تحميل لوحة تحكم التحليلات..."
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
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">
        {#if $analyticsSummary}
          {$analyticsSummary.totalVisitors.toLocaleString('ar-EG')}
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
        {#if $analyticsSummary}
          {$analyticsSummary.newVisitors.toLocaleString('ar-EG')}
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
        {#if $analyticsSummary}
          {$analyticsSummary.avgVisitDurationHours.toFixed(2)}
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
        {#if $analyticsSummary}
          {$analyticsSummary.peakVisitorsToday.toLocaleString('ar-EG')}
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
            إحصائيات زوار الحرم الشريف
          </div>
          <div class="chart-subtitle">إجمالي الزوار والزوار الجدد بمرور الوقت</div>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="trafficChart"></canvas>
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
            توزيع الزوار حسب الفئات العمرية
          </div>
          <div class="chart-subtitle">إحصائيات الفئات العمرية للزوار</div>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="demographicsChart"></canvas>
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
            توزيع الزوار حسب المداخل
          </div>
          <div class="chart-subtitle">إحصائيات الزوار حسب نقاط الدخول</div>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="deviceChart"></canvas>
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

