<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { organization, organizationSummary, criticalAlerts } from '../stores/organization';
  import { translations } from '../translations';
  import ModernAreaChart from './ModernAreaChart.svelte';
  
  let realTimeInterval: NodeJS.Timeout;
  let showNavbar = true;
  let navbarTimeout: NodeJS.Timeout;
  let showAlerts = false;
  let alertsTimeout: NodeJS.Timeout;
  
  $: org = $organization;
  $: summary = $organizationSummary;
  $: alerts = $criticalAlerts;
  
  // Auto-hide navbar after 3 seconds of inactivity
  function resetNavbarTimeout() {
    clearTimeout(navbarTimeout);
    showNavbar = true;
    navbarTimeout = setTimeout(() => {
      showNavbar = false;
    }, 3000);
  }
  
  // Smart alerts management
  function manageAlerts() {
    if (alerts.length > 0) {
      showAlerts = true;
      clearTimeout(alertsTimeout);
      // Auto-hide alerts after 10 seconds if not critical
      const hasCritical = alerts.some(alert => alert.severity === 'critical');
      if (!hasCritical) {
        alertsTimeout = setTimeout(() => {
          showAlerts = false;
        }, 10000);
      }
    } else {
      showAlerts = false;
    }
  }
  
  // Watch alerts changes
  $: manageAlerts(), alerts;
  
  // Simulate real-time count changes (optimized)
  function updateRealTimeCounts() {
    if (!org) return;
    
    organization.update(currentOrg => {
      if (!currentOrg) return currentOrg;
      
      const newOrg = { ...currentOrg };
      
      // More efficient update with minimal object creation
      for (const division of newOrg.divisions) {
        division.totalRealTimeCount = 0;
        
        for (const location of division.locations) {
          location.totalRealTimeCount = 0;
          
          for (const floor of location.floors) {
            floor.totalRealTimeCount = 0;
            
            for (const camera of floor.cameras) {
              if (camera.status === 'online') {
                // Smaller, more realistic changes
                const change = Math.floor(Math.random() * 4) - 2; // -2 to +1
                camera.realTimeCount = Math.max(0, Math.min(
                  camera.maxCapacity || 60,
                  camera.realTimeCount + change
                ));
                camera.lastUpdated = new Date();
              }
              floor.totalRealTimeCount += camera.realTimeCount;
            }
            location.totalRealTimeCount += floor.totalRealTimeCount;
          }
          division.totalRealTimeCount += location.totalRealTimeCount;
        }
      }
      
      newOrg.totalRealTimeCount = newOrg.divisions.reduce((sum, div) => sum + div.totalRealTimeCount, 0);
      return newOrg;
    });
  }
  
  onMount(() => {
    // Update real-time counts every 3 seconds (reduced frequency)
    realTimeInterval = setInterval(updateRealTimeCounts, 3000);
    
    // Mouse move shows navbar
    document.addEventListener('mousemove', resetNavbarTimeout);
    document.addEventListener('click', resetNavbarTimeout);
    
    // Initial navbar timeout
    resetNavbarTimeout();
    
    return () => {
      clearInterval(realTimeInterval);
      clearTimeout(navbarTimeout);
      document.removeEventListener('mousemove', resetNavbarTimeout);
      document.removeEventListener('click', resetNavbarTimeout);
    };
  });
  
  onDestroy(() => {
    if (realTimeInterval) clearInterval(realTimeInterval);
    if (navbarTimeout) clearTimeout(navbarTimeout);
  });
  
  function getOccupancyColor(rate: number): string {
    if (rate < 50) return '#22c55e';
    if (rate < 75) return '#f59e0b';
    return '#ef4444';
  }
  
  function formatTime(): string {
    return new Date().toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
  
  function toggleNavbar() {
    showNavbar = !showNavbar;
    if (showNavbar) {
      resetNavbarTimeout();
    } else {
      clearTimeout(navbarTimeout);
    }
  }
</script>

<div class="arabic-tv-dashboard" dir="rtl">
  <!-- Optional Header -->
  <header class="tv-header {showNavbar ? 'visible' : 'hidden'}">
    <div class="logo">
      <h1>{translations.appTitle}</h1>
      <div class="live-badge">
        <span class="pulse-dot"></span>
        {translations.live}
      </div>
    </div>
    
    <div class="header-controls">
      <button class="control-btn" on:click={toggleNavbar} title="إخفاء/إظهار شريط التنقل">
        {showNavbar ? '👁️' : '👁️‍🗨️'}
      </button>
      <div class="time">{formatTime()}</div>
    </div>
  </header>

  <!-- Single Screen Dashboard -->
  <main class="dashboard-content" style="padding-top: {showNavbar ? '80px' : '20px'}">
    
    {#if summary && org}
      <!-- Top Metrics Row -->
      <section class="metrics-section">
        <div class="primary-metric">
          <div class="metric-value" style="color: {getOccupancyColor(summary.occupancyRate)}">
            {summary.totalRealTimeCount.toLocaleString('ar-SA')}
          </div>
          <div class="metric-label">{translations.totalOccupancy}</div>
          <div class="metric-sublabel">
            {summary.occupancyRate.toFixed(1)}% {translations.of} {summary.maxCapacity.toLocaleString('ar-SA')}
          </div>
        </div>
        
        <div class="secondary-metrics">
          <div class="metric-card">
            <div class="metric-value">{summary.totalDivisions.toLocaleString('ar-SA')}</div>
            <div class="metric-label">{translations.divisions}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{summary.totalLocations.toLocaleString('ar-SA')}</div>
            <div class="metric-label">{translations.locations}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{summary.totalCameras.toLocaleString('ar-SA')}</div>
            <div class="metric-label">{translations.camerasOnline}</div>
          </div>
        </div>
      </section>

      <!-- Main Content Grid -->
      <section class="main-content">
        
        <!-- Left Column: Divisions -->
        <div class="divisions-panel">
          <h2 class="section-title">{translations.divisions}</h2>
          <div class="divisions-grid">
            {#each org.divisions as division, index}
              <div class="division-card" style="animation-delay: {index * 0.1}s">
                <h3>{division.name}</h3>
                <div class="division-metrics">
                  <div class="main-count" style="color: {getOccupancyColor(division.maxCapacity ? (division.totalRealTimeCount / division.maxCapacity) * 100 : 0)}">
                    {division.totalRealTimeCount.toLocaleString('ar-SA')}
                  </div>
                  <div class="percentage">
                    {division.maxCapacity ? ((division.totalRealTimeCount / division.maxCapacity) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div class="division-details">
                  <span>{division.locations.length.toLocaleString('ar-SA')} {translations.locations}</span>
                  <span>{translations.peak}: {division.analytics.peakOccupancy.toLocaleString('ar-SA')}</span>
                </div>
                {#if division.alerts.filter(a => !a.acknowledged).length > 0}
                  <div class="alert-badge">
                    {division.alerts.filter(a => !a.acknowledged).length.toLocaleString('ar-SA')}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Center Column: Chart -->
        <div class="chart-panel">
          <ModernAreaChart 
            data={org.analytics.trends} 
            title={translations.realTimeOccupancyTrends}
            height={400}
            showMultipleSeries={true}
          />
        </div>

        <!-- Right Column: Locations -->
        <div class="locations-panel">
          <h2 class="section-title">{translations.locations}</h2>
          <div class="locations-list">
            {#each org.divisions as division}
              {#each division.locations as location, index}
                <div class="location-item" style="animation-delay: {index * 0.05}s">
                  <div class="location-header">
                    <h4>{location.name}</h4>
                    <div class="location-count" style="color: {getOccupancyColor(location.maxCapacity ? (location.totalRealTimeCount / location.maxCapacity) * 100 : 0)}">
                      {location.totalRealTimeCount.toLocaleString('ar-SA')}
                    </div>
                  </div>
                  
                  <div class="occupancy-bar">
                    <div class="occupancy-fill" 
                         style="width: {location.maxCapacity ? (location.totalRealTimeCount / location.maxCapacity) * 100 : 0}%; 
                                background: {getOccupancyColor(location.maxCapacity ? (location.totalRealTimeCount / location.maxCapacity) * 100 : 0)}">
                    </div>
                  </div>
                  
                  <div class="location-details">
                    <span>{location.floors.length.toLocaleString('ar-SA')} {translations.floors}</span>
                    <span>{location.maxCapacity?.toLocaleString('ar-SA') || 0} {translations.capacity}</span>
                  </div>
                  
                  <div class="floor-dots">
                    {#each location.floors as floor}
                      <div class="floor-dot" 
                           style="background: {getOccupancyColor(floor.maxCapacity ? (floor.totalRealTimeCount / floor.maxCapacity) * 100 : 0)}"
                           title="{floor.name}: {floor.totalRealTimeCount.toLocaleString('ar-SA')}">
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {/each}
          </div>
        </div>

      </section>

      <!-- Bottom Section: Smart Alerts with auto-hide -->
      {#if showAlerts && alerts.length > 0}
        <section class="alerts-notification" class:critical={alerts.some(a => a.severity === 'critical')}>
          <div class="alert-header">
            <h3>{translations.activeAlerts}</h3>
            <button class="close-alerts" on:click={() => showAlerts = false}>×</button>
          </div>
          <div class="alerts-scroll">
            {#each alerts.slice(0, 4) as alert, index}
              <div class="alert-compact {alert.severity}" style="animation-delay: {index * 0.05}s">
                <div class="alert-dot"></div>
                <div class="alert-content">
                  <span class="alert-msg">{alert.message}</span>
                  <span class="alert-meta">{alert.timestamp.toLocaleTimeString('ar-SA')}</span>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </main>
</div>

<style>
  .arabic-tv-dashboard {
    height: 100vh;
    width: 100vw;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    color: white;
    overflow: hidden;
    font-family: 'Segoe UI', 'Arial', sans-serif;
    direction: rtl;
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
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    transition: transform 0.3s ease;
  }
  
  .tv-header.hidden {
    transform: translateY(-100%);
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
    font-size: 16px;
    transition: background 0.3s ease;
  }
  
  .control-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .time {
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: 600;
    color: #22c55e;
    direction: ltr;
  }
  
  .dashboard-content {
    height: 100vh;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    transition: padding-top 0.3s ease;
    overflow-y: auto;
  }
  
  .metrics-section {
    display: flex;
    gap: 30px;
    align-items: center;
  }
  
  .primary-metric {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(34, 197, 94, 0.2));
    border-radius: 20px;
    padding: 30px 40px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 300px;
  }
  
  .metric-value {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 8px;
    line-height: 1;
  }
  
  .metric-label {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .metric-sublabel {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .secondary-metrics {
    display: flex;
    gap: 20px;
    flex: 1;
  }
  
  .metric-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex: 1;
  }
  
  .metric-card .metric-value {
    font-size: 32px;
    color: white;
    margin-bottom: 8px;
  }
  
  .main-content {
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    gap: 30px;
    flex: 1;
    min-height: 0;
  }
  
  .section-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 20px 0;
    color: white;
    text-align: center;
    border-bottom: 2px solid rgba(59, 130, 246, 0.3);
    padding-bottom: 10px;
  }
  
  .divisions-panel, .locations-panel {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .divisions-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .division-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    position: relative;
    animation: slideInRight 0.6s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .division-card h3 {
    font-size: 16px;
    margin: 0 0 12px 0;
    color: white;
  }
  
  .division-metrics {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .main-count {
    font-size: 24px;
    font-weight: 700;
  }
  
  .percentage {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .division-details {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    justify-content: space-between;
  }
  
  .alert-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #ef4444;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
  }
  
  .chart-panel {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .locations-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 500px;
    overflow-y: auto;
  }
  
  .location-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 16px;
    animation: slideInLeft 0.6s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .location-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .location-header h4 {
    margin: 0;
    font-size: 14px;
    color: white;
  }
  
  .location-count {
    font-size: 16px;
    font-weight: 700;
  }
  
  .occupancy-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  
  .occupancy-fill {
    height: 100%;
    transition: all 0.3s ease;
    border-radius: 3px;
  }
  
  .location-details {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 8px;
  }
  
  .floor-dots {
    display: flex;
    gap: 4px;
    justify-content: center;
  }
  
  .floor-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    cursor: help;
  }
  
  .alerts-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .alerts-ticker {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 8px;
  }
  
  .alert-item {
    min-width: 250px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
    border-left: 4px solid;
    animation: slideInUp 0.6s ease;
    flex-shrink: 0;
  }
  
  .alert-item.critical { border-left-color: #ef4444; }
  .alert-item.high { border-left-color: #f59e0b; }
  .alert-item.medium { border-left-color: #3b82f6; }
  
  .alert-severity {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  
  .alert-item.critical .alert-severity { color: #ef4444; }
  .alert-item.high .alert-severity { color: #f59e0b; }
  .alert-item.medium .alert-severity { color: #3b82f6; }
  
  .alert-message {
    font-size: 12px;
    margin-bottom: 4px;
    color: white;
  }
  
  .alert-time {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    direction: ltr;
    text-align: right;
  }
  
  .alerts-notification {
    position: fixed;
    top: 100px;
    right: 20px;
    width: 350px;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 200;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .alerts-notification.critical {
    border-color: #ef4444;
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
  }
  
  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .alert-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: white;
  }
  
  .close-alerts {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .close-alerts:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .alerts-scroll {
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .alert-compact {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    animation: slideInUp 0.3s ease;
    border-left: 3px solid;
  }
  
  .alert-compact.critical {
    border-left-color: #ef4444;
  }
  
  .alert-compact.high {
    border-left-color: #f59e0b;
  }
  
  .alert-compact.medium {
    border-left-color: #3b82f6;
  }
  
  .alert-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
  
  .alert-content {
    flex: 1;
    min-width: 0;
  }
  
  .alert-msg {
    display: block;
    font-size: 12px;
    color: white;
    margin-bottom: 2px;
    line-height: 1.3;
  }
  
  .alert-meta {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    direction: ltr;
    text-align: left;
  }
  
  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Responsive adjustments */
  @media (max-width: 1400px) {
    .main-content {
      grid-template-columns: 280px 1fr 280px;
    }
  }
  
  @media (max-width: 1200px) {
    .main-content {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr auto;
    }
    
    .divisions-panel, .locations-panel {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .divisions-grid {
      flex-direction: row;
      flex-wrap: wrap;
    }
    
    .locations-list {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
</style>