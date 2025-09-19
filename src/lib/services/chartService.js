import Chart from 'chart.js/auto';

/**
 * Chart Service
 * Provides utilities for creating and managing charts
 */

class ChartService {
  constructor() {
    Chart.defaults.font.family = "'Cairo', 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif";
    Chart.defaults.font.size = 12;
  }

  /**
   * Create a chart instance
   * @param {HTMLCanvasElement} canvas - The canvas element to render the chart on
   * @param {object} config - The chart configuration
   * @returns {Chart}
   */
  createChart(canvas, config) {
    if (!canvas) {
      console.warn('⚠️ Canvas not found for chart');
      return null;
    }

    try {
      return new Chart(canvas, config);
    } catch (error) {
      console.error('❌ Failed to create chart:', error);
      return null;
    }
  }

  /**
   * Destroy a chart instance
   * @param {Chart} chart - The chart instance to destroy
   */
  destroyChart(chart) {
    if (chart) {
      chart.destroy();
    }
  }

  createAllChartConfigs(chartDataStore, isDarkMode) {
    const { visitorTrends, locationDistribution, cameraPerformance } = chartDataStore;

    const chartOptions = this.getGlobalChartOptions(isDarkMode);

    return {
      trafficChart: this.createTrafficChartConfig(visitorTrends, chartOptions),
      demographicsChart: this.createDemographicsChartConfig(locationDistribution, isDarkMode),
      deviceChart: this.createDeviceChartConfig(cameraPerformance, isDarkMode),
    };
  }

  getGlobalChartOptions(isDarkMode) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
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
  }

  createTrafficChartConfig(data, options) {
    const noData = {
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

    return {
      type: 'line',
      data: (data && data.labels && data.labels.length > 0) ? {
        labels: data.labels,
        datasets: data.datasets.map((dataset, index) => ({
          label: dataset.label || (index === 0 ? 'زوار الحرم' : 'الزوار الجدد'),
          data: dataset.data || [],
          borderColor: index === 0 ? '#16a085' : '#1abc9c',
          backgroundColor: index === 0 ? 'rgba(22, 160, 133, 0.2)' : 'rgba(26, 188, 156, 0.2)',
          fill: true,
          tension: 0.4
        }))
      } : noData,
      options: options
    };
  }

  createDemographicsChartConfig(data, isDarkMode) {
    const noData = {
      labels: ['لا توجد بيانات'],
      datasets: [{
        data: [1],
        backgroundColor: ['#cccccc'],
        borderWidth: 0
      }]
    };

    return {
      type: 'doughnut',
      data: (data && data.labels && data.labels.length > 0) ? {
        labels: data.labels,
        datasets: [{
          data: data.datasets?.[0]?.data || [0],
          backgroundColor: ['#16a085', '#1abc9c', '#48c9b0', '#76d7c4', '#85c1e9', '#f7dc6f', '#bb8fce'],
          borderWidth: 0
        }]
      } : noData,
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
          tooltip: this.getGlobalChartOptions(isDarkMode).plugins.tooltip
        }
      }
    };
  }

  createDeviceChartConfig(data, isDarkMode) {
    const noData = {
      labels: ['لا توجد بيانات'],
      datasets: [{
        label: 'لا توجد بيانات متاحة',
        data: [0],
        backgroundColor: '#cccccc',
        borderColor: '#cccccc',
        borderWidth: 1
      }]
    };

    return {
      type: 'bar',
      data: (data && data.labels && data.labels.length > 0) ? {
        labels: data.labels,
        datasets: [{
          label: 'إجمالي الإكتشافات',
          data: data.datasets?.[0]?.data || [0],
          backgroundColor: '#16a085',
          borderColor: '#16a085',
          borderWidth: 1
        }]
      } : noData,
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
          tooltip: this.getGlobalChartOptions(isDarkMode).plugins.tooltip
        }
      }
    };
  }
}

export const chartService = new ChartService();
export default chartService;