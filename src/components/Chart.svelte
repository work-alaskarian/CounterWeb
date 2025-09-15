<script>
  import './styles/Chart.css';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import Chart from 'chart.js/auto';
  import 'chartjs-adapter-date-fns';
  
  
  const dispatch = createEventDispatcher();
  
  export let chartType = 'line';
  export let data = [];
  export let labels = [];
  export const isRealtime = false;
  export let theme = { color: '#3b82f6', rgb: '59, 130, 246' };
  export let useSvg = false;
  export let showHover = false;
  export let smoothCurve = false;
  
  let canvas;
  let chart;
  let svgData = [];
  let svgContainer;
  let tooltip = { show: false, x: 0, y: 0, value: 0, index: 0 };
  
  onMount(() => {
    if (!useSvg) {
      initializeChart();
    } else {
      generateSvgData();
    }
    
    dispatch('mount', { updateData, updateTheme });
  });
  
  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
  
  function initializeChart() {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Check for dark mode
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    
    // Generate initial data if none provided
    const initialData = data.length > 0 ? data : generateInitialData();
    const initialLabels = labels.length > 0 ? labels : Array(initialData.length).fill('');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    gradient.addColorStop(0, `rgba(${theme.rgb}, 0.3)`);
    gradient.addColorStop(1, `rgba(${theme.rgb}, 0)`);
    
    const chartConfig = {
      type: chartType,
      data: {
        labels: initialLabels,
        datasets: [{
          data: initialData,
          borderColor: theme.color,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: { 
          legend: { display: false },
          tooltip: {
            enabled: showHover,
            backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
            titleColor: isDarkMode ? '#e2e8f0' : '#2c3e50',
            bodyColor: isDarkMode ? '#a0aec0' : '#7f8c8d',
            borderColor: isDarkMode ? '#4a5568' : '#e1e8ed',
            borderWidth: 1,
            cornerRadius: 8,
            titleFont: {
              size: 12,
              weight: 'bold',
              family: 'Cairo, sans-serif'
            },
            bodyFont: {
              size: 11,
              family: 'Cairo, sans-serif'
            },
            displayColors: false,
            padding: 8
          }
        },
        scales: {
          x: { 
            display: false,
            grid: { display: false },
            ticks: { 
              color: isDarkMode ? '#a0aec0' : '#7f8c8d',
              font: {
                size: 10,
                family: 'Cairo, sans-serif'
              }
            }
          },
          y: { 
            display: false,
            grid: { display: false },
            ticks: { 
              color: isDarkMode ? '#a0aec0' : '#7f8c8d',
              font: {
                size: 10,
                family: 'Cairo, sans-serif'
              }
            }
          }
        },
        animation: { duration: 0 }
      }
    };
    
    chart = new Chart(ctx, chartConfig);
  }
  
  function generateInitialData() {
    const points = 30;
    const data = [];
    let value = 100;
    
    for (let i = 0; i < points; i++) {
      value += (Math.random() - 0.5) * 20;
      data.push(Math.max(0, value));
    }
    
    return data;
  }
  
  function generateSvgData() {
    const points = data.length > 0 ? data : generateInitialData();
    const width = 100;
    const height = 40;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    
    svgData = points.map((point, index) => ({
      x: (index / (points.length - 1)) * width,
      y: height - ((point - min) / range) * height,
      value: Math.round(point)
    }));
  }
  
  function createSmoothPath(points) {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    if (smoothCurve && points.length > 2) {
      // Create smooth bezier curves
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1] || curr;
        
        // Control points for smooth curve
        const cp1x = prev.x + (curr.x - prev.x) * 0.3;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - prev.x) * 0.3;
        const cp2y = curr.y;
        
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
      }
    } else {
      // Simple line path
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x},${points[i].y}`;
      }
    }
    
    return path;
  }
  
  function handleMouseMove(event) {
    if (!showHover || !svgContainer) return;
    
    const rect = svgContainer.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    
    // Find closest data point
    let closestIndex = 0;
    let minDistance = Math.abs(svgData[0].x - x);
    
    svgData.forEach((point, index) => {
      const distance = Math.abs(point.x - x);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    const point = svgData[closestIndex];
    if (point) {
      tooltip = {
        show: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        value: point.value,
        index: closestIndex
      };
    }
  }
  
  function handleMouseLeave() {
    tooltip.show = false;
  }
  
  export function updateData(newData, newLabels = null) {
    if (useSvg) {
      data = newData;
      generateSvgData();
      return;
    }
    
    if (chart) {
      chart.data.datasets[0].data = newData;
      if (newLabels) {
        chart.data.labels = newLabels;
      }
      chart.update('none');
    }
  }
  
  export function updateTheme(newTheme) {
    theme = newTheme;
    
    if (useSvg) {
      // SVG will reactively update
      return;
    }
    
    if (chart && canvas) {
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, `rgba(${newTheme.rgb}, 0.3)`);
      gradient.addColorStop(1, `rgba(${newTheme.rgb}, 0)`);
      
      chart.data.datasets[0].borderColor = newTheme.color;
      chart.data.datasets[0].backgroundColor = gradient;
      chart.update('none');
    }
  }
  
  $: if (useSvg && data.length > 0) {
    generateSvgData();
  }
</script>

{#if useSvg}
  <div class="svg-wrapper" bind:this={svgContainer}>
    <svg viewBox="0 0 100 40" class="svg-chart" 
         on:mousemove={handleMouseMove} 
         on:mouseleave={handleMouseLeave}>
      <defs>
        <linearGradient id="gradient-{theme.color.slice(1)}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:{theme.color};stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:{theme.color};stop-opacity:0" />
        </linearGradient>
      </defs>
      
      {#if svgData.length > 0}
        <!-- Fill area -->
        <path
          d="M 0,40 {createSmoothPath(svgData).replace('M', 'L')} L 100,40 Z"
          fill="url(#gradient-{theme.color.slice(1)})"
          stroke="none"
        />
        <!-- Line path -->
        <path
          d={createSmoothPath(svgData)}
          fill="none"
          stroke={theme.color}
          stroke-width="2"
          class="chart-line"
        />
        
        <!-- Hover indicators -->
        {#if showHover}
          {#each svgData as point, index}
            <circle
              cx={point.x}
              cy={point.y}
              r="2"
              fill={theme.color}
              opacity="0"
              class="hover-point"
            />
          {/each}
        {/if}
      {/if}
    </svg>
    
    <!-- Tooltip -->
    {#if tooltip.show && showHover}
      <div 
        class="tooltip"
        style="left: {tooltip.x + 10}px; top: {tooltip.y - 10}px;"
      >
        <div class="tooltip-content">
          <span class="tooltip-value">{tooltip.value.toLocaleString()}</span>
          <span class="tooltip-label">زوار</span>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <canvas bind:this={canvas}></canvas>
{/if}

