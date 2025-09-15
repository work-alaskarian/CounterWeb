<script lang="ts">
  import { onMount } from 'svelte';
  import type { CountData } from '../types';
  
  export let data: CountData[] = [];
  export let title: string = '';
  export let height: number = 400;
  export let showMultipleSeries: boolean = false;
  
  let currentView = 0;
  const viewTypes = ['الإشغال الحالي', 'اتجاهات متعددة', 'المقارنة التفصيلية'];
  
  function nextView() {
    currentView = (currentView + 1) % viewTypes.length;
  }
  
  function prevView() {
    currentView = (currentView - 1 + viewTypes.length) % viewTypes.length;
  }
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;
  let animationProgress = 0;
  
  // Chart series with different colors like the reference image
  const series = [
    { name: 'الإشغال الحالي', color: '#4F46E5', data: [] as CountData[] },
    { name: 'متوسط الإشغال', color: '#7C3AED', data: [] as CountData[] },
    { name: 'الحد الأدنى', color: '#A855F7', data: [] as CountData[] }
  ];
  
  $: chartWidth = 800;
  $: chartHeight = height - 100;
  $: padding = { top: 40, right: 120, bottom: 60, left: 60 };
  $: plotWidth = chartWidth - padding.left - padding.right;
  $: plotHeight = chartHeight - padding.top - padding.bottom;
  
  // Prepare multi-series data based on current view
  $: if (currentView >= 1 && data.length > 0) {
    series[0].data = data.map(d => ({ ...d, count: d.count }));
    series[1].data = data.map(d => ({ ...d, count: d.average || d.count * 0.8 }));
    if (currentView === 2) {
      series[2].data = data.map(d => ({ ...d, count: (d.count * 0.4) }));
    } else {
      series[2].data = [];
    }
  } else {
    series[0].data = data;
    series[1].data = [];
    series[2].data = [];
  }
  
  // Calculate scales
  $: activeData = showMultipleSeries ? series.filter(s => s.data.length > 0) : [{ data, color: '#4F46E5' }];
  $: allValues = activeData.flatMap(s => s.data.map(d => d.count));
  $: maxValue = allValues.length > 0 ? Math.max(...allValues) * 1.1 : 100;
  $: minValue = allValues.length > 0 ? Math.min(...allValues) * 0.9 : 0;
  $: valueRange = maxValue - minValue;
  
  function getX(index: number, dataLength: number): number {
    return padding.left + (plotWidth / Math.max(dataLength - 1, 1)) * index;
  }
  
  function getY(value: number): number {
    return padding.top + plotHeight - ((value - minValue) / valueRange) * plotHeight;
  }
  
  function formatValue(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return Math.round(value).toString();
  }
  
  function formatTime(date: Date): string {
    return date.toLocaleDateString('ar-SA', { 
      month: 'short',
      day: '2-digit'
    });
  }
  
  function createSmoothPath(points: {x: number, y: number}[]): string {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate control points for smooth curves
      const cpx1 = prev.x + (curr.x - (points[i - 2]?.x || prev.x)) * 0.15;
      const cpy1 = prev.y + (curr.y - (points[i - 2]?.y || prev.y)) * 0.15;
      const cpx2 = curr.x - (next?.x - prev.x || curr.x - prev.x) * 0.15;
      const cpy2 = curr.y - (next?.y - prev.y || curr.y - prev.y) * 0.15;
      
      if (i === 1) {
        path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
      } else {
        path += ` S ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
      }
    }
    
    return path;
  }
  
  function drawChart() {
    if (!ctx || activeData.length === 0) return;
    
    // Clear canvas with background
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, chartWidth, chartHeight);
    
    // Draw grid
    drawGrid();
    
    // Draw data series with animation
    activeData.forEach((seriesData, seriesIndex) => {
      if (seriesData.data.length < 2) return;
      
      const color = seriesData.color || '#4F46E5';
      const animatedLength = Math.floor(seriesData.data.length * animationProgress);
      const currentData = seriesData.data.slice(0, Math.max(animatedLength, 2));
      
      // Create points
      const points = currentData.map((point, index) => ({
        x: getX(index, seriesData.data.length),
        y: getY(point.count)
      }));
      
      // Draw area fill
      if (points.length > 1) {
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        // Draw smooth curve
        const smoothPath = createSmoothPath(points);
        const path2D = new Path2D(smoothPath);
        ctx.fill(path2D);
        
        // Complete the area
        ctx.lineTo(points[points.length - 1].x, padding.top + plotHeight);
        ctx.lineTo(points[0].x, padding.top + plotHeight);
        ctx.closePath();
        ctx.fill();
        
        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(path2D);
        
        // Draw data points
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        
        points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      }
    });
    
    // Draw axes
    drawAxes();
    
    // Draw legend
    if (showMultipleSeries) {
      drawLegend();
    }
  }
  
  function drawGrid() {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (plotHeight / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
    }
    
    // Vertical grid lines
    if (data.length > 0) {
      const xSteps = Math.min(data.length - 1, 10);
      for (let i = 0; i <= xSteps; i++) {
        const x = padding.left + (plotWidth / xSteps) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + plotHeight);
        ctx.stroke();
      }
    }
  }
  
  function drawAxes() {
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    
    // Y-axis labels
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = maxValue - (valueRange / ySteps) * i;
      const y = padding.top + (plotHeight / ySteps) * i;
      ctx.fillText(formatValue(value), padding.left - 10, y + 4);
    }
    
    // X-axis labels
    if (data.length > 0) {
      ctx.textAlign = 'center';
      const labelStep = Math.max(1, Math.floor(data.length / 8));
      
      for (let i = 0; i < data.length; i += labelStep) {
        const x = getX(i, data.length);
        ctx.fillText(formatTime(data[i].timestamp), x, padding.top + plotHeight + 20);
      }
    }
  }
  
  function drawLegend() {
    const legendX = padding.left + plotWidth + 20;
    let legendY = padding.top + 20;
    
    series.forEach((seriesItem, index) => {
      if (seriesItem.data.length === 0) return;
      
      // Legend color box
      ctx.fillStyle = seriesItem.color;
      ctx.fillRect(legendX, legendY - 8, 12, 12);
      
      // Legend text
      ctx.fillStyle = '#374151';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(seriesItem.name, legendX + 20, legendY + 2);
      
      legendY += 25;
    });
  }
  
  function animate() {
    if (animationProgress < 1) {
      animationProgress += 0.02;
      drawChart();
      animationId = requestAnimationFrame(animate);
    }
  }
  
  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!;
      canvas.width = chartWidth;
      canvas.height = chartHeight;
      
      // Start animation
      animationProgress = 0;
      animate();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  });
  
  // Restart animation when data changes
  $: if (ctx && data) {
    animationProgress = 0;
    animate();
  }
</script>

<div class="modern-chart">
  <div class="chart-header">
    {#if title}
      <h3 class="chart-title">{title}</h3>
    {/if}
    
    <div class="chart-controls">
      <span class="view-label">{viewTypes[currentView]}</span>
      <button class="nav-btn" on:click={prevView} title="العرض السابق">‹</button>
      <button class="nav-btn" on:click={nextView} title="العرض التالي">›</button>
    </div>
  </div>
  
  <div class="chart-container">
    <canvas bind:this={canvas} class="chart-canvas"></canvas>
  </div>
</div>

<style>
  .modern-chart {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.05);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    direction: rtl;
  }
  
  .chart-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1F2937;
  }
  
  .chart-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    direction: ltr;
  }
  
  .view-label {
    font-size: 14px;
    color: #6B7280;
    font-weight: 500;
    min-width: 120px;
    text-align: center;
  }
  
  .nav-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #D1D5DB;
    background: #FFFFFF;
    border-radius: 6px;
    color: #374151;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .nav-btn:hover {
    background: #F3F4F6;
    border-color: #9CA3AF;
  }
  
  .nav-btn:active {
    transform: scale(0.95);
  }
  
  .chart-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }
  
  .chart-canvas {
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
  }
  
  /* Dark mode adjustments for the chart */
  :global(.arabic-tv-dashboard) .modern-chart {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  :global(.arabic-tv-dashboard) .chart-title {
    color: #FFFFFF;
  }
  
  :global(.arabic-tv-dashboard) .view-label {
    color: rgba(255, 255, 255, 0.8);
  }
  
  :global(.arabic-tv-dashboard) .nav-btn {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: #FFFFFF;
  }
  
  :global(.arabic-tv-dashboard) .nav-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
</style>