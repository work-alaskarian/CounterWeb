<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { organization, organizationSummary, criticalAlerts } from '../stores/organization';
  import Chart from './Chart.svelte';
  
  let currentScreen = 0;
  let autoRotate = true;
  let interval: NodeJS.Timeout;
  let realTimeInterval: NodeJS.Timeout;
  
  $: org = $organization;
  $: summary = $organizationSummary;
  $: alerts = $criticalAlerts;
  
  const screens = [
    'overview',
    'divisions',
    'locations',
    'alerts',
    'trends'
  ];
  
  function nextScreen() {
    currentScreen = (currentScreen + 1) % screens.length;
  }
  
  function prevScreen() {
    currentScreen = (currentScreen - 1 + screens.length) % screens.length;
  }
  
  function goToScreen(index: number) {
    currentScreen = index;
  }
  
  function toggleAutoRotate() {
    autoRotate = !autoRotate;
  }
  
  // Simulate real-time count changes
  function updateRealTimeCounts() {
    if (!org) return;
    
    organization.update(currentOrg => {
      if (!currentOrg) return currentOrg;
      
      const newOrg = { ...currentOrg };
      
      // Update each camera's count with random fluctuations
      for (const division of newOrg.divisions) {
        for (const location of division.locations) {
          for (const floor of location.floors) {
            for (const camera of floor.cameras) {
              if (camera.status === 'online') {
                const change = Math.floor(Math.random() * 6) - 3; // -3 to +2
                camera.realTimeCount = Math.max(0, Math.min(
                  camera.maxCapacity || 60,
                  camera.realTimeCount + change
                ));
                camera.lastUpdated = new Date();
              }
            }
            
            // Recalculate floor totals
            floor.totalRealTimeCount = floor.cameras.reduce((sum, cam) => sum + cam.realTimeCount, 0);
          }
          
          // Recalculate location totals
          location.totalRealTimeCount = location.floors.reduce((sum, floor) => sum + floor.totalRealTimeCount, 0);
        }
        
        // Recalculate division totals
        division.totalRealTimeCount = division.locations.reduce((sum, loc) => sum + loc.totalRealTimeCount, 0);
      }
      
      // Recalculate organization total
      newOrg.totalRealTimeCount = newOrg.divisions.reduce((sum, div) => sum + div.totalRealTimeCount, 0);
      
      return newOrg;
    });
  }
  
  onMount(() => {
    // Auto-rotate screens every 10 seconds
    interval = setInterval(() => {
      if (autoRotate) {
        nextScreen();
      }
    }, 10000);
    
    // Update real-time counts every 2 seconds
    realTimeInterval = setInterval(updateRealTimeCounts, 2000);
    
    return () => {
      clearInterval(interval);
      clearInterval(realTimeInterval);
    };
  });
  
  onDestroy(() => {
    if (interval) clearInterval(interval);
    if (realTimeInterval) clearInterval(realTimeInterval);
  });
  
  function getOccupancyColor(rate: number): string {
    if (rate < 50) return '#22c55e';
    if (rate < 75) return '#f59e0b';
    return '#ef4444';
  }
  
  function formatTime(): string {
    return new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }
</script>

<div class="tv-dashboard">
  <!-- Header with time and navigation -->
  <header class="tv-header">
    <div class="logo">
      <h1>CounterWeb TV</h1>
      <div class="live-badge">
        <span class="pulse-dot"></span>
        LIVE
      </div>
    </div>
    
    <div class="screen-indicators">
      {#each screens as screen, index}
        <button 
          class="indicator {index === currentScreen ? 'active' : ''}"
          on:click={() => goToScreen(index)}
        >
          <span>{screen}</span>
        </button>
      {/each}
    </div>
    
    <div class="header-controls">
      <button class="control-btn" on:click={toggleAutoRotate}>
        {autoRotate ? '⏸️' : '▶️'} Auto
      </button>
      <div class="time">{formatTime()}</div>
    </div>
  </header>

  <!-- Main content area with sliding screens -->
  <main class="tv-content" style="transform: translateX(-{currentScreen * 100}%)">
    
    <!-- Screen 1: Overview -->
    <section class="tv-screen overview-screen">
      {#if summary && org}
        <div class="screen-title">Organization Overview</div>
        
        <div class="overview-grid">
          <div class="metric-card primary">
            <div class="metric-value" style="color: {getOccupancyColor(summary.occupancyRate)}">
              {summary.totalRealTimeCount.toLocaleString()}
            </div>
            <div class="metric-label">Total Occupancy</div>
            <div class="metric-sublabel">
              {summary.occupancyRate.toFixed(1)}% of {summary.maxCapacity.toLocaleString()}
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{summary.totalDivisions}</div>
            <div class="metric-label">Divisions</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{summary.totalLocations}</div>
            <div class="metric-label">Locations</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{summary.totalCameras}</div>
            <div class="metric-label">Cameras Online</div>
          </div>
        </div>
        
        <div class="chart-container">
          <Chart 
            data={org.analytics.trends}
            title="Real-Time Occupancy Trends"
            height={300}
            color="#3b82f6"
          />
        </div>
      {/if}
    </section>

    <!-- Screen 2: Divisions -->
    <section class="tv-screen divisions-screen">
      <div class="screen-title">Division Status</div>
      
      {#if org}
        <div class="divisions-grid">
          {#each org.divisions as division, index}
            <div class="division-tile" style="animation-delay: {index * 0.1}s">
              <h3>{division.name}</h3>
              <div class="division-metrics">
                <div class="main-metric">
                  <span class="count" style="color: {getOccupancyColor(division.maxCapacity ? (division.totalRealTimeCount / division.maxCapacity) * 100 : 0)}">
                    {division.totalRealTimeCount}
                  </span>
                  <span class="percentage">
                    {division.maxCapacity ? ((division.totalRealTimeCount / division.maxCapacity) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div class="sub-metrics">
                  <div class="sub-metric">
                    <span>{division.locations.length}</span>
                    <span class="metric-label">Locations</span>
                  </div>
                  <div class="sub-metric">
                    <span>{division.analytics.peakOccupancy}</span>
                    <span class="metric-label">Peak</span>
                  </div>
                </div>
              </div>
              
              {#if division.alerts.filter(a => !a.acknowledged).length > 0}
                <div class="alert-indicator">
                  {division.alerts.filter(a => !a.acknowledged).length} alerts
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Screen 3: Locations -->
    <section class="tv-screen locations-screen">
      <div class="screen-title">Location Overview</div>
      
      {#if org}
        <div class="locations-grid">
          {#each org.divisions as division}
            {#each division.locations as location, index}
              <div class="location-tile" style="animation-delay: {index * 0.05}s">
                <div class="location-header">
                  <h4>{location.name}</h4>
                  <span class="division-tag">{division.name}</span>
                </div>
                
                <div class="location-metrics">
                  <div class="occupancy-bar">
                    <div class="occupancy-fill" 
                         style="width: {location.maxCapacity ? (location.totalRealTimeCount / location.maxCapacity) * 100 : 0}%; 
                                background: {getOccupancyColor(location.maxCapacity ? (location.totalRealTimeCount / location.maxCapacity) * 100 : 0)}">
                    </div>
                  </div>
                  <div class="occupancy-text">
                    <span class="current">{location.totalRealTimeCount}</span>
                    <span class="capacity">/ {location.maxCapacity || 0}</span>
                  </div>
                </div>
                
                <div class="floor-indicators">
                  {#each location.floors as floor}
                    <div class="floor-dot" 
                         style="background: {getOccupancyColor(floor.maxCapacity ? (floor.totalRealTimeCount / floor.maxCapacity) * 100 : 0)}"
                         title="{floor.name}: {floor.totalRealTimeCount}">
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          {/each}
        </div>
      {/if}
    </section>

    <!-- Screen 4: Alerts -->
    <section class="tv-screen alerts-screen">
      <div class="screen-title">Active Alerts</div>
      
      {#if alerts.length === 0}
        <div class="no-alerts">
          <div class="success-icon">✓</div>
          <h2>All Systems Normal</h2>
          <p>No active alerts detected</p>
        </div>
      {:else}
        <div class="alerts-grid">
          {#each alerts.slice(0, 8) as alert, index}
            <div class="alert-card {alert.severity}" style="animation-delay: {index * 0.1}s">
              <div class="alert-header">
                <div class="alert-severity">{alert.severity.toUpperCase()}</div>
                <div class="alert-time">{alert.timestamp.toLocaleTimeString()}</div>
              </div>
              <div class="alert-message">{alert.message}</div>
              <div class="alert-location">{alert.entityType}: {alert.entityId}</div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Screen 5: Trends -->
    <section class="tv-screen trends-screen">
      <div class="screen-title">Analytics & Trends</div>
      
      {#if org}
        <div class="trends-layout">
          <div class="main-chart">
            <Chart 
              data={org.analytics.trends}
              title="24-Hour Occupancy Pattern"
              height={350}
              color="#22c55e"
            />
          </div>
          
          <div class="trend-stats">
            <div class="stat-card">
              <div class="stat-value">{org.analytics.summary.peakOccupancy}</div>
              <div class="stat-label">Peak Occupancy</div>
              <div class="stat-time">{org.analytics.summary.peakTime.toLocaleTimeString()}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">{org.analytics.summary.averageOccupancy}</div>
              <div class="stat-label">Average</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">{((org.totalRealTimeCount / (org.maxCapacity || 1)) * 100).toFixed(1)}%</div>
              <div class="stat-label">Current Utilization</div>
            </div>
          </div>
        </div>
      {/if}
    </section>
  </main>

  <!-- Navigation arrows -->
  <button class="nav-arrow left" on:click={prevScreen}>‹</button>
  <button class="nav-arrow right" on:click={nextScreen}>›</button>
</div>

<style>
  .tv-dashboard {
    height: 100vh;
    width: 100vw;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    color: white;
    overflow: hidden;
    position: relative;
  }
  
  .tv-header {
    height: 80px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    z-index: 10;
    position: relative;
  }
  
  .logo h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(45deg, #3b82f6, #22c55e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .live-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #22c55e;
    font-weight: 600;
  }
  
  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  .screen-indicators {
    display: flex;
    gap: 4px;
  }
  
  .indicator {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 20px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .indicator.active {
    background: #3b82f6;
    color: white;
  }
  
  .indicator:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }
  
  .header-controls {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .control-btn {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-size: 12px;
  }
  
  .time {
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: 600;
    color: #22c55e;
  }
  
  .tv-content {
    height: calc(100vh - 80px);
    display: flex;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .tv-screen {
    min-width: 100vw;
    padding: 40px;
    display: flex;
    flex-direction: column;
  }
  
  .screen-title {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 30px;
    text-align: center;
    background: linear-gradient(45deg, #3b82f6, #22c55e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .overview-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 30px;
    margin-bottom: 40px;
  }
  
  .metric-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 30px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .metric-card.primary {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(34, 197, 94, 0.2));
  }
  
  .metric-value {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 8px;
    color: white;
  }
  
  .metric-label {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .metric-sublabel {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 4px;
  }
  
  .chart-container {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 20px;
  }
  
  .divisions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 30px;
    flex: 1;
  }
  
  .division-tile {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 30px;
    position: relative;
    animation: slideInUp 0.6s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .division-tile h3 {
    font-size: 24px;
    margin: 0 0 20px 0;
    color: white;
  }
  
  .division-metrics {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .main-metric {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  
  .main-metric .count {
    font-size: 36px;
    font-weight: 700;
  }
  
  .main-metric .percentage {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .sub-metrics {
    display: flex;
    gap: 20px;
  }
  
  .sub-metric {
    text-align: center;
  }
  
  .sub-metric span {
    display: block;
    font-size: 20px;
    font-weight: 700;
    color: white;
  }
  
  .sub-metric .metric-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
  }
  
  .alert-indicator {
    position: absolute;
    top: 15px;
    right: 15px;
    background: #ef4444;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }
  
  .locations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    flex: 1;
  }
  
  .location-tile {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    animation: slideInUp 0.6s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .location-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .location-header h4 {
    margin: 0;
    font-size: 18px;
    color: white;
  }
  
  .division-tag {
    font-size: 10px;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .occupancy-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  
  .occupancy-fill {
    height: 100%;
    transition: all 0.3s ease;
  }
  
  .occupancy-text {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .current {
    font-weight: 700;
    font-size: 16px;
  }
  
  .capacity {
    color: rgba(255, 255, 255, 0.6);
  }
  
  .floor-indicators {
    display: flex;
    gap: 6px;
  }
  
  .floor-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    cursor: help;
  }
  
  .no-alerts {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
  }
  
  .success-icon {
    font-size: 80px;
    color: #22c55e;
    margin-bottom: 20px;
  }
  
  .no-alerts h2 {
    font-size: 36px;
    margin: 0;
    color: #22c55e;
  }
  
  .no-alerts p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
  }
  
  .alerts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
    flex: 1;
  }
  
  .alert-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    border-left: 4px solid;
    animation: slideInUp 0.6s ease;
  }
  
  .alert-card.critical {
    border-left-color: #ef4444;
  }
  
  .alert-card.high {
    border-left-color: #f59e0b;
  }
  
  .alert-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .alert-severity {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .alert-card.critical .alert-severity {
    color: #ef4444;
  }
  
  .alert-card.high .alert-severity {
    color: #f59e0b;
  }
  
  .alert-time {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .alert-message {
    font-size: 16px;
    margin-bottom: 8px;
    color: white;
  }
  
  .alert-location {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .trends-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 40px;
    flex: 1;
  }
  
  .main-chart {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 20px;
  }
  
  .trend-stats {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: #22c55e;
    margin-bottom: 8px;
  }
  
  .stat-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .stat-time {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 4px;
  }
  
  .nav-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 60px;
    height: 60px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 10;
    backdrop-filter: blur(10px);
  }
  
  .nav-arrow:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-50%) scale(1.1);
  }
  
  .nav-arrow.left {
    left: 20px;
  }
  
  .nav-arrow.right {
    right: 20px;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
  
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>