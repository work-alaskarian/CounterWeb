<script lang="ts">
  import { onMount } from 'svelte';
  import type { CountData } from '../types';
  
  export let data: CountData[] = [];
  export let title: string = '';
  export let height: number = 200;
  export let color: string = '#3b82f6';
  export let showGrid: boolean = true;
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;
  
  // Memoized calculations
  $: maxValue = data.length > 0 ? Math.max(...data.map(d => d.count)) : 100;
  $: minValue = data.length > 0 ? Math.min(...data.map(d => d.count)) : 0;
  $: range = maxValue - minValue || 1;
  $: chartWidth = 600;
  $: chartHeight = height - 40;
  
  function drawChart() {
    if (!ctx || !data.length) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, chartWidth, chartHeight + 40);
    
    // Set styles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Horizontal lines
      for (let i = 0; i <= 5; i++) {
        const y = (chartHeight / 5) * i + 20;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(chartWidth - 20, y);
        ctx.stroke();
      }
      
      // Vertical lines
      for (let i = 0; i <= 10; i++) {
        const x = ((chartWidth - 40) / 10) * i + 20;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, chartHeight);
        ctx.stroke();
      }
    }
    
    // Draw data line
    if (data.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      data.forEach((point, index) => {
        const x = 20 + ((chartWidth - 40) / (data.length - 1)) * index;
        const y = chartHeight - ((point.count - minValue) / range) * (chartHeight - 40) + 20;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw data points
      ctx.fillStyle = color;
      data.forEach((point, index) => {
        const x = 20 + ((chartWidth - 40) / (data.length - 1)) * index;
        const y = chartHeight - ((point.count - minValue) / range) * (chartHeight - 40) + 20;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Gradient fill under line
      const gradient = ctx.createLinearGradient(0, 20, 0, chartHeight);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, color + '00');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      
      data.forEach((point, index) => {
        const x = 20 + ((chartWidth - 40) / (data.length - 1)) * index;
        const y = chartHeight - ((point.count - minValue) / range) * (chartHeight - 40) + 20;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.lineTo(chartWidth - 20, chartHeight);
      ctx.lineTo(20, chartHeight);
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(maxValue.toString(), 15, 25);
    ctx.fillText(minValue.toString(), 15, chartHeight + 15);
    
    // Time labels
    if (data.length > 0) {
      ctx.textAlign = 'left';
      ctx.fillText(formatTime(data[0].timestamp), 25, chartHeight + 35);
      ctx.textAlign = 'right';
      ctx.fillText(formatTime(data[data.length - 1].timestamp), chartWidth - 25, chartHeight + 35);
    }
  }
  
  function formatTime(date: Date): string {
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  function animate() {
    drawChart();
    animationId = requestAnimationFrame(animate);
  }
  
  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!;
      canvas.width = chartWidth;
      canvas.height = chartHeight + 40;
      
      // Start animation loop for smooth updates
      animate();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  });
  
  // Redraw when data changes
  $: if (ctx && data) {
    drawChart();
  }
</script>

<div class="optimized-chart">
  {#if title}
    <h4 class="chart-title">{title}</h4>
  {/if}
  
  <div class="canvas-container">
    <canvas bind:this={canvas} class="chart-canvas"></canvas>
  </div>
</div>

<style>
  .optimized-chart {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .chart-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    text-align: center;
    direction: rtl;
  }
  
  .canvas-container {
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
</style>