<script>
  import './styles/AnalyticsDashboard.css';
  import { onMount, onDestroy } from 'svelte';
  import DataTable from './DataTable.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import LoadingState from './LoadingState.svelte';
  import { 
    analyticsSummary,
    loadAnalyticsSummary,
    loadAllChartsData,
    chartData,
    loadCameras
  } from '../lib/stores/analytics.js';
  import { chartService } from '../lib/services/chartService.js';
  import { mapTimeframeToApi } from '../lib/utils/timeframe.js';

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
  
  onMount(async () => {
    const analyticsSection = document.getElementById('analytics');
    if (!analyticsSection) {
      initializeDashboard();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasInitialized) {
          initializeDashboard();
        }
      });
    }, { rootMargin: '100px' });

    observer.observe(analyticsSection);

    return () => observer.disconnect();
  });
  
  async function initializeDashboard() {
    if (hasInitialized) return;

    console.log('🔄 AnalyticsDashboard: Starting initialization...');
    hasInitialized = true;
    isInitializing = true;

    try {
      const apiTimeframe = mapTimeframeToApi(timeframe);
      console.log('📊 AnalyticsDashboard: Loading data for timeframe:', apiTimeframe);

      await Promise.all([
        loadAnalyticsSummary(apiTimeframe).catch(err => {
          console.warn('⚠️ AnalyticsDashboard: Failed to load analytics summary:', err);
          return null;
        }),
        loadAllChartsData(apiTimeframe).catch(err => {
          console.warn('⚠️ AnalyticsDashboard: Failed to load charts data:', err);
          return null;
        }),
        loadCameras().catch(err => {
          console.warn('⚠️ AnalyticsDashboard: Failed to load cameras:', err);
          return null;
        })
      ]);

      console.log('✅ AnalyticsDashboard: Data loading completed, initializing charts...');
      await new Promise(resolve => setTimeout(resolve, 100));
      await initializeCharts();
      console.log('✅ AnalyticsDashboard: Dashboard fully initialized');

    } catch (error) {
      console.error('❌ AnalyticsDashboard: Initialization failed:', error);
      initializationError = error;
    } finally {
      isInitializing = false;
    }
  }

  onDestroy(() => {
    Object.values(charts).forEach(chart => chartService.destroyChart(chart));
  });
  
  async function initializeCharts() {
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    const configs = chartService.createAllChartConfigs($chartData, isDarkMode);

    Object.keys(configs).forEach(id => {
      const canvas = document.getElementById(id);
      if (charts[id]) {
        chartService.destroyChart(charts[id]);
      }
      charts[id] = chartService.createChart(canvas, configs[id]);
    });
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
      const apiTimeframe = mapTimeframeToApi(timeframe);
      await loadAnalyticsSummary(apiTimeframe);
      await loadAllChartsData(apiTimeframe);
      await initializeCharts();
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

