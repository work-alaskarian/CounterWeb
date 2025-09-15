<script>
  import './styles/AnalyticsDashboard.css';
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import DataTable from './DataTable.svelte';
  
  
  let charts = {};
  let showCustomizeModal = false;
  let viewMode = 'grid'; // 'grid' or 'table'
  let chartVisibility = {
    trafficChart: true,
    demographicsChart: true,
    deviceChart: true,
    revenueChart: true,
    pagesChart: true
  };
  
  onMount(() => {
    initializeCharts();
  });
  
  function initializeCharts() {
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

    const chartConfigs = {
      trafficChart: { 
        type: 'line', 
        data: { 
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], 
          datasets: [
            { 
              label: 'زوار الحرم', 
              data: [1200, 1900, 1500, 2500, 2200, 3000, 3500], 
              borderColor: '#16a085', 
              backgroundColor: 'rgba(22, 160, 133, 0.2)', 
              fill: true, 
              tension: 0.4 
            }, 
            { 
              label: 'الزوار الجدد', 
              data: [800, 1200, 1000, 1800, 1600, 2200, 2600], 
              borderColor: '#1abc9c', 
              backgroundColor: 'rgba(26, 188, 156, 0.2)', 
              fill: true, 
              tension: 0.4 
            }
          ] 
        }, 
        options: chartOptions 
      },
      demographicsChart: { 
        type: 'doughnut', 
        data: { 
                    labels: ['18-24', '25-34', '35-44', '45+'],  
          datasets: [{
            data: [30, 40, 20, 10], 
            backgroundColor: ['#16a085', '#1abc9c', '#48c9b0', '#76d7c4'], 
            borderWidth: 0 
          }] 
        }, 
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
        type: 'pie', 
        data: { 
          labels: ['مدخل رئيسي', 'مدخل شرقي', 'مدخل غربي'], 
          datasets: [{
            data: [55, 35, 10], 
            backgroundColor: ['#16a085', '#1abc9c', '#48c9b0'], 
            borderWidth: 0 
          }] 
        }, 
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
      },
      revenueChart: { 
        type: 'bar', 
        data: { 
          labels: ['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع'], 
          datasets: [{
                        label: 'إجمالي الزوار (الآلاف)',  
            data: [65, 78, 89, 95], 
            backgroundColor: 'rgba(22, 160, 133, 0.8)', 
            borderColor: '#16a085', 
            borderWidth: 1, 
            borderRadius: 8 
          }] 
        }, 
        options: chartOptions 
      },
      pagesChart: { 
        type: 'bar', 
        data: { 
                    labels: ['الصحن الشريف', 'قاعة الصلاة', 'المرافق الخدمية', 'المواقف'],  
          datasets: [{
                        label: 'كثافة الزوار',  
            data: [1500, 1200, 800, 500], 
            backgroundColor: 'rgba(26, 188, 156, 0.8)', 
            borderColor: '#1abc9c', 
            borderWidth: 1, 
            borderRadius: 8 
          }] 
        }, 
        options: { ...chartOptions, indexAxis: 'y' } 
      }
    };

    Object.keys(chartConfigs).forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        charts[id] = new Chart(canvas, chartConfigs[id]);
      }
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
  
  function handleDataExport(event) {
    console.log('Exporting data:', event.detail);
  }
</script>

<svelte:head>
  <title>لوحة تحكم التحليلات</title>
</svelte:head>


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
      <div class="stat-value">152.3K</div>
      <div class="stat-label">إجمالي الزوار</div>
      <div class="stat-change positive">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
        </svg>
        +12.5%
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-value">98.7K</div>
      <div class="stat-label">الزوار الجدد</div>
      <div class="stat-change positive">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
        </svg>
        +8.3%
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-value">2.45</div>
      <div class="stat-label">متوسط مدة الزيارة (ساعات)</div>
      <div class="stat-change negative">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17l-5-5m0 0l5-5m-5 5h12"></path>
        </svg>
        -2.1%
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-value">3,450</div>
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

  {#if chartVisibility.revenueChart}
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            إحصائيات الزوار الفصلية
          </div>
          <div class="chart-subtitle">إجمالي الزوار على مدار أرباع السنة</div>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="revenueChart"></canvas>
      </div>
    </div>
  {/if}

  {#if chartVisibility.pagesChart}
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            كثافة الزوار حسب المناطق
          </div>
          <div class="chart-subtitle">توزيع الزوار في مختلف مناطق الحرم</div>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="pagesChart"></canvas>
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

