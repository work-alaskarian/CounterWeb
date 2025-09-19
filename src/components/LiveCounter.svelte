<script>
  import './styles/LiveCounter.css';
  import { onMount, onDestroy } from 'svelte';
  import Chart from './Chart.svelte';
  import globalWebSocketService from '../lib/services/global-websocket.js';

  export let location = {
    id: 'default',
    name: 'Default Location',
    initialCount: 0
  };
  export let theme = { color: '#3b82f6', rgb: '59, 130, 246' };
  export let timeframe = 'HOURLY';
  export let showChart = true;
  export let showHover = false;
  export let smoothCurve = false;
  export let useSvg = false;
  export let cardSize = 'normal';

  // Component state - simple and direct
  let count = 0;
  let displayCount = 0;
  let currentDate = '';
  let chartComponent;
  let chartContainer;
  let chartData = [];
  let isLoading = true;
  let connectionStatus = 'connecting';

  // Animation state
  let animationInterval = null;
  let isAnimating = false;

  // Subscription cleanup functions
  let unsubscribeFromData = null;
  let unsubscribeFromConnection = null;

  onMount(() => {
    displayDate();
    initializeSimpleWebSocket();

    return () => {
      cleanup();
    };
  });

  onDestroy(() => {
    cleanup();
  });

  /**
   * Initialize simple WebSocket connection using global service
   */
  function initializeSimpleWebSocket() {
    console.log(`🔄 SIMPLE LiveCounter: Connecting to global WebSocket for location: ${location.id}`);

    // Subscribe to data updates from global WebSocket service
    unsubscribeFromData = globalWebSocketService.subscribe(location.id, handleSimpleLiveCountUpdate);

    // Subscribe to connection status changes
    unsubscribeFromConnection = globalWebSocketService.onConnectionChange(handleConnectionChange);
  }

  /**
   * Handle simple live count updates from global WebSocket service
   */
  function handleSimpleLiveCountUpdate(data) {
    console.log(`📈 SIMPLE LiveCounter: Update for ${location.id}:`, data);

    const newCount = data.count || 0;
    console.log(`🚀 SIMPLE: Setting count from ${count} to ${newCount}`);

    // Stop loading
    isLoading = false;

    // Update count with animation
    if (newCount !== count) {
      animateCountUp(displayCount, newCount);
      count = newCount;
    }

    console.log(`✅ SIMPLE: Count updated! Now animating to ${newCount}`);
  }

  /**
   * Handle connection status changes from global WebSocket service
   */
  function handleConnectionChange(status) {
    console.log(`🔌 SIMPLE LiveCounter: Connection status changed for ${location.id}:`, status.type);

    if (status.type === 'connected') {
      connectionStatus = 'connected';
      isLoading = false;
    } else if (status.type === 'disconnected') {
      connectionStatus = 'disconnected';
    } else if (status.type === 'error') {
      connectionStatus = 'error';
      console.error(`⚠️ SIMPLE LiveCounter: Connection error for ${location.id}:`, status.error);
    }
  }

  /**
   * Animate counter up from old value to new value
   */
  function animateCountUp(fromValue, toValue, duration = 1500) {
    console.log(`🎬 ANIMATE: ${location.id} counting from ${fromValue} to ${toValue} over ${duration}ms`);

    // Clear any existing animation
    if (animationInterval) {
      clearInterval(animationInterval);
    }

    // Skip animation if values are the same
    if (fromValue === toValue) {
      displayCount = toValue;
      return;
    }

    isAnimating = true;
    const startTime = Date.now();
    const difference = toValue - fromValue;

    // Start animation
    animationInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(fromValue + (difference * easeOutCubic));

      displayCount = currentValue;

      if (progress >= 1) {
        clearInterval(animationInterval);
        animationInterval = null;
        displayCount = toValue; // Ensure final value is exact

        // Brief flash effect when animation completes
        setTimeout(() => {
          isAnimating = false;
        }, 200);

        console.log(`✅ ANIMATE: ${location.id} animation complete at ${toValue}`);
      }
    }, 16); // ~60fps
  }

  /**
   * Simple cleanup function
   */
  function cleanup() {
    console.log(`🧹 SIMPLE LiveCounter: Cleaning up ${location.id}`);

    // Clear animation
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    if (unsubscribeFromData) {
      unsubscribeFromData();
      unsubscribeFromData = null;
    }

    if (unsubscribeFromConnection) {
      unsubscribeFromConnection();
      unsubscribeFromConnection = null;
    }
  }

  function displayDate() {
    currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Simple reactive statement for theme changes
  $: if (chartComponent && theme) {
    chartComponent.updateTheme(theme);
  }

  // Get status indicator class
  $: statusClass = connectionStatus === 'connected' ? 'active' :
                   connectionStatus === 'connecting' ? 'loading' :
                   connectionStatus === 'error' ? 'error' : 'fallback';
</script>

<div class="location-card {cardSize}">
  <!-- Activity indicator -->
  <div class="activity-indicator {statusClass}"></div>

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
    <div class="status-indicator {statusClass}"
         title="{connectionStatus === 'connected' ? 'Real-time connected' : 
                 connectionStatus === 'loading' ? 'Loading data...' :
                 connectionStatus === 'error' ? 'Connection error' :
                 'Fallback mode'}">
      <!-- {#if connectionStatus === 'connected'}
        🟢
      {:else if connectionStatus === 'loading'}
        🟡
      {:else if connectionStatus === 'error'}
        🔴
      {:else}
        🟠
      {/if} -->
    </div>
  </div>
  
  <div class="counter-display">
    <div class="counter-container">
      {#if isLoading}
        <div class="loading-animation">
          <div class="css-loading-spinner">
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
          </div>
        </div>
      {:else}
        <span class="counter-value" class:animating={isAnimating}>
          {displayCount.toLocaleString('en-US')}
        </span>
      {/if}
    </div>

    <span class="counter-label">
      إجمالي العدد - {timeframe}
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
</div>

<style>
  .activity-indicator.active {
    background: #22c55e;
    animation: pulse 2s infinite;
  }

  .activity-indicator.loading {
    background: #f59e0b;
    animation: pulse 1s infinite;
  }

  .activity-indicator.error {
    background: #ef4444;
    animation: pulse 0.5s infinite;
  }

  .activity-indicator.fallback {
    background: #f97316;
    animation: pulse 3s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Counter animation styles */
  .counter-value {
    transition: all 0.3s ease;
    position: relative;
  }

  .counter-value.animating {
    color: #22c55e;
    text-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    transform: scale(1.05);
  }

  @keyframes countUpdate {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); color: #22c55e; }
    100% { transform: scale(1); }
  }

  .counter-value.updated {
    animation: countUpdate 0.6s ease;
  }
</style>