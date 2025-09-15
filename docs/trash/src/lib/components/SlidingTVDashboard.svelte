<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { organization, organizationSummary, criticalAlerts } from '../stores/organization';
  import { translations } from '../translations';
  import ModernAreaChart from './ModernAreaChart.svelte';
  
  let realTimeInterval: NodeJS.Timeout;
  let showNavbar = true;
  let navbarTimeout: NodeJS.Timeout;
  let currentScreen = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let translateX = 0;
  
  // Customization settings
  let settings = {
    chartTransparency: 0.95,
    darkIntensity: 1,
    autoTransition: false,
    transitionSpeed: 8000,
    showAlerts: true
  };
  
  let showSettings = false;
  
  $: org = $organization;
  $: summary = $organizationSummary;
  $: alerts = $criticalAlerts;
  
  const screens = [
    { id: 'counts', name: 'العدادات الحية', icon: '📊' },
    { id: 'divisions', name: 'الأقسام', icon: '🏢' },
    { id: 'locations', name: 'المواقع', icon: '📍' },
    { id: 'charts', name: 'المخططات', icon: '📈' },
    { id: 'analytics', name: 'التحليلات', icon: '📋' }
  ];
  
  // Auto-hide navbar functionality
  function resetNavbarTimeout() {
    clearTimeout(navbarTimeout);
    showNavbar = true;
    navbarTimeout = setTimeout(() => {
      if (!showSettings) {
        showNavbar = false;
      }
    }, 4000);
  }
  
  function toggleNavbar() {
    showNavbar = !showNavbar;
    if (!showNavbar) {
      clearTimeout(navbarTimeout);
      showSettings = false;
    } else {
      resetNavbarTimeout();
    }
  }
  
  function toggleSettings() {
    showSettings = !showSettings;
    if (showSettings) {
      showNavbar = true;
      clearTimeout(navbarTimeout);
    } else {
      resetNavbarTimeout();
    }
  }
  
  // Screen navigation
  function goToScreen(index: number) {
    currentScreen = index;
    translateX = 0;
    resetNavbarTimeout();
  }
  
  function nextScreen() {
    currentScreen = (currentScreen + 1) % screens.length;
    translateX = 0;
  }
  
  function prevScreen() {
    currentScreen = (currentScreen - 1 + screens.length) % screens.length;
    translateX = 0;
  }
  
  // Touch and drag handling for sliding
  function handleTouchStart(e: TouchEvent) {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
  }
  
  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    const deltaY = Math.abs(e.touches[0].clientY - dragStartY);
    
    // Only slide horizontally if horizontal movement is more significant
    if (Math.abs(deltaX) > deltaY) {
      e.preventDefault();
      translateX = Math.max(-100, Math.min(100, deltaX * 0.5));
    }
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const deltaY = Math.abs(e.clientY - dragStartY);
    
    if (Math.abs(deltaX) > deltaY) {
      translateX = Math.max(-100, Math.min(100, deltaX * 0.3));
    }
  }
  
  function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    
    if (translateX > 30) {
      prevScreen();
    } else if (translateX < -30) {
      nextScreen();
    } else {
      translateX = 0;
    }
  }
  
  // Real-time count updates
  function updateRealTimeCounts() {
    if (!org) return;
    
    organization.update(currentOrg => {
      if (!currentOrg) return currentOrg;
      
      const newOrg = { ...currentOrg };
      
      for (const division of newOrg.divisions) {
        division.totalRealTimeCount = 0;
        
        for (const location of division.locations) {
          location.totalRealTimeCount = 0;
          
          for (const floor of location.floors) {
            floor.totalRealTimeCount = 0;
            
            for (const camera of floor.cameras) {
              if (camera.status === 'online') {
                const change = Math.floor(Math.random() * 4) - 2;
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
    realTimeInterval = setInterval(updateRealTimeCounts, 2000);
    
    // Mouse move shows navbar
    document.addEventListener('mousemove', resetNavbarTimeout);
    document.addEventListener('click', resetNavbarTimeout);
    
    // Touch and mouse events for sliding
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    resetNavbarTimeout();
    
    return () => {
      clearInterval(realTimeInterval);
      clearTimeout(navbarTimeout);
      document.removeEventListener('mousemove', resetNavbarTimeout);
      document.removeEventListener('click', resetNavbarTimeout);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleDragEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
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
</script>

<div class="sliding-tv-dashboard" dir="rtl" style="--dark-intensity: {settings.darkIntensity}; --chart-transparency: {settings.chartTransparency};">
  
  <!-- Enhanced Header with Settings -->
  <header class="tv-header {showNavbar ? 'visible' : 'hidden'}">
    <div class="logo">
      <h1>{translations.appTitle}</h1>
      <div class="live-badge">
        <span class="pulse-dot"></span>
        {translations.live}
      </div>
    </div>
    
    <!-- Screen Navigation -->
    <div class="screen-nav">
      {#each screens as screen, index}
        <button 
          class="screen-btn {index === currentScreen ? 'active' : ''}"
          on:click={() => goToScreen(index)}
          title={screen.name}
        >
          <span class="screen-icon">{screen.icon}</span>
          <span class="screen-name">{screen.name}</span>
        </button>
      {/each}
    </div>
    
    <div class="header-controls">
      <button class="control-btn" on:click={toggleSettings} class:active={showSettings}>
        ⚙️
      </button>
      <button class="control-btn" on:click={toggleNavbar} title="إخفاء/إظهار شريط التنقل">
        {showNavbar ? '👁️' : '👁️‍🗨️'}
      </button>
      <div class="time">{formatTime()}</div>
    </div>
  </header>

  <!-- Settings Panel -->
  {#if showSettings}
    <div class="settings-panel">
      <h3>إعدادات العرض</h3>
      
      <div class="setting-group">
        <label>شفافية المخططات</label>
        <input type="range" bind:value={settings.chartTransparency} min="0.3" max="1" step="0.05" />
        <span>{(settings.chartTransparency * 100).toFixed(0)}%</span>
      </div>
      
      <div class="setting-group">
        <label>كثافة الوضع المظلم</label>
        <input type="range" bind:value={settings.darkIntensity} min="0.5" max="1" step="0.1" />
        <span>{(settings.darkIntensity * 100).toFixed(0)}%</span>
      </div>
      
      <div class="setting-group">
        <label>
          <input type="checkbox" bind:checked={settings.autoTransition} />
          التنقل التلقائي
        </label>
      </div>
      
      <div class="setting-group">
        <label>
          <input type="checkbox" bind:checked={settings.showAlerts} />
          إظهار التنبيهات
        </label>
      </div>
    </div>
  {/if}

  <!-- Sliding Screens Container -->
  <main class="screens-container" 
        style="transform: translateX(calc(-{currentScreen} * 100vw + {translateX}px)); padding-top: {showNavbar ? '80px' : '20px'};"
        on:touchstart={handleTouchStart}
        on:mousedown={handleMouseDown}>

    <!-- Screen 1: Live Counts -->
    <section class="screen counts-screen">
      {#if summary && org}
        <div class="screen-title">العدادات الحية</div>
        
        <div class="mega-counter">
          <div class="main-count" style="color: {getOccupancyColor(summary.occupancyRate)}">
            {summary.totalRealTimeCount.toLocaleString('ar-SA')}
          </div>
          <div class="count-label">إجمالي الأشخاص الحاليين</div>
          <div class="capacity-info">
            {summary.occupancyRate.toFixed(1)}% من إجمالي السعة
          </div>
        </div>

        <div class="quick-stats">
          <div class="stat-circle">
            <div class="stat-value">{summary.totalDivisions}</div>
            <div class="stat-label">أقسام</div>
          </div>
          <div class="stat-circle">
            <div class="stat-value">{summary.totalLocations}</div>
            <div class="stat-label">مواقع</div>
          </div>
          <div class="stat-circle">
            <div class="stat-value">{summary.totalCameras}</div>
            <div class="stat-label">كاميرات</div>
          </div>
        </div>

        <div class="realtime-indicators">
          <h3>الحالة المباشرة</h3>
          <div class="indicators-grid">
            {#each org.divisions as division}
              <div class="indicator-item">
                <div class="indicator-dot" style="background: {getOccupancyColor(division.maxCapacity ? (division.totalRealTimeCount / division.maxCapacity) * 100 : 0)}"></div>
                <span class="indicator-name">{division.name}</span>
                <span class="indicator-value">{division.totalRealTimeCount}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </section>

    <!-- Screen 2: Divisions -->
    <section class="screen divisions-screen">
      <div class="screen-title">الأقسام</div>
      {#if org}
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
                <span>{division.locations.length} مواقع</span>
                <span>الذروة: {division.analytics.peakOccupancy}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Screen 3: Locations -->
    <section class="screen locations-screen">
      <div class="screen-title">المواقع</div>
      {#if org}
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
                  <span>{location.floors.length} طوابق</span>
                  <span>السعة: {location.maxCapacity?.toLocaleString('ar-SA') || 0}</span>
                </div>
              </div>
            {/each}
          {/each}
        </div>
      {/if}
    </section>

    <!-- Screen 4: Charts -->
    <section class="screen charts-screen">
      <div class="screen-title">المخططات التحليلية</div>
      {#if org}
        <div class="charts-container" style="opacity: {settings.chartTransparency};">
          <ModernAreaChart 
            data={org.analytics.trends} 
            title="اتجاهات الإشغال في الوقت الفعلي"
            height={400}
            showMultipleSeries={true}
          />
        </div>
      {/if}
    </section>

    <!-- Screen 5: Analytics -->
    <section class="screen analytics-screen">
      <div class="screen-title">التحليلات المتقدمة</div>
      {#if org}
        <div class="analytics-grid">
          <div class="analytics-card">
            <h4>إحصائيات اليوم</h4>
            <div class="analytics-data">
              <div class="data-item">
                <span class="data-label">الذروة:</span>
                <span class="data-value">{org.analytics.summary.peakOccupancy}</span>
              </div>
              <div class="data-item">
                <span class="data-label">المتوسط:</span>
                <span class="data-value">{org.analytics.summary.averageOccupancy}</span>
              </div>
              <div class="data-item">
                <span class="data-label">الاستخدام الحالي:</span>
                <span class="data-value">{((org.totalRealTimeCount / (org.maxCapacity || 1)) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          <div class="analytics-card">
            <h4>مقارنة الأقسام</h4>
            <div class="comparison-list">
              {#each org.divisions as division}
                <div class="comparison-item">
                  <span class="comp-name">{division.name}</span>
                  <div class="comp-bar">
                    <div class="comp-fill" style="width: {(division.totalRealTimeCount / Math.max(...org.divisions.map(d => d.totalRealTimeCount))) * 100}%; background: {getOccupancyColor(division.maxCapacity ? (division.totalRealTimeCount / division.maxCapacity) * 100 : 0)}"></div>
                  </div>
                  <span class="comp-value">{division.totalRealTimeCount}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </section>

  </main>

  <!-- Navigation Arrows -->
  <button class="nav-arrow left" on:click={prevScreen}>‹</button>
  <button class="nav-arrow right" on:click={nextScreen}>›</button>
  
  <!-- Screen Indicators -->
  <div class="screen-indicators">
    {#each screens as screen, index}
      <div class="indicator {index === currentScreen ? 'active' : ''}" on:click={() => goToScreen(index)}></div>
    {/each}
  </div>

  <!-- Smart Alerts -->
  {#if settings.showAlerts && alerts.length > 0}
    <div class="floating-alerts">
      {#each alerts.slice(0, 3) as alert, index}
        <div class="alert-toast {alert.severity}" style="animation-delay: {index * 0.1}s;">
          <div class="alert-content">
            <span class="alert-message">{alert.message}</span>
            <span class="alert-time">{alert.timestamp.toLocaleTimeString('ar-SA')}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sliding-tv-dashboard {
    height: 100vh;
    width: 100vw;
    background: linear-gradient(135deg, 
      rgba(10, 10, 10, var(--dark-intensity)) 0%, 
      rgba(26, 26, 26, var(--dark-intensity)) 100%);
    color: white;
    overflow: hidden;
    font-family: 'Segoe UI', 'Arial', sans-serif;
    direction: rtl;
    position: relative;
  }
  
  .tv-header {
    height: 80px;
    background: rgba(255, 255, 255, calc(0.05 * var(--dark-intensity)));
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, calc(0.1 * var(--dark-intensity)));
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
    font-size: 24px;
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
    gap: 6px;
    font-size: 11px;
    color: #22c55e;
    font-weight: 600;
  }
  
  .pulse-dot {
    width: 6px;
    height: 6px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  .screen-nav {
    display: flex;
    gap: 8px;
  }
  
  .screen-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 20px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 12px;
  }
  
  .screen-btn.active {
    background: #3b82f6;
    color: white;
  }
  
  .screen-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }
  
  .screen-icon {
    font-size: 14px;
  }
  
  .screen-name {
    font-weight: 600;
  }
  
  .header-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .control-btn {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s ease;
  }
  
  .control-btn:hover, .control-btn.active {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .time {
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: 600;
    color: #22c55e;
    direction: ltr;
  }
  
  .settings-panel {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 300px;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(15px);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 150;
    animation: slideInRight 0.3s ease;
  }
  
  .settings-panel h3 {
    margin: 0 0 20px 0;
    color: white;
    font-size: 16px;
  }
  
  .setting-group {
    margin-bottom: 20px;
  }
  
  .setting-group label {
    display: block;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .setting-group input[type="range"] {
    width: 100%;
    margin-bottom: 4px;
  }
  
  .setting-group span {
    color: #22c55e;
    font-weight: 600;
  }
  
  .screens-container {
    height: 100vh;
    display: flex;
    transition: transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), padding-top 0.3s ease;
    will-change: transform;
  }
  
  .screen {
    min-width: 100vw;
    padding: 40px;
    display: flex;
    flex-direction: column;
    user-select: none;
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
  
  /* Counts Screen */
  .mega-counter {
    text-align: center;
    margin-bottom: 50px;
  }
  
  .main-count {
    font-size: 120px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 10px;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }
  
  .count-label {
    font-size: 24px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 8px;
  }
  
  .capacity-info {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .quick-stats {
    display: flex;
    justify-content: center;
    gap: 60px;
    margin-bottom: 50px;
  }
  
  .stat-circle {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    width: 120px;
    height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.1);
  }
  
  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: white;
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
  }
  
  .realtime-indicators h3 {
    text-align: center;
    margin-bottom: 20px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .indicators-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  
  .indicator-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .indicator-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .indicator-name {
    flex: 1;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
  }
  
  .indicator-value {
    font-weight: 700;
    color: white;
  }
  
  /* Divisions Screen */
  .divisions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    flex: 1;
  }
  
  .division-card {
    background: rgba(255, 255, 255, calc(0.05 * var(--dark-intensity)));
    border-radius: 16px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideInUp 0.6s ease;
  }
  
  .division-card h3 {
    font-size: 18px;
    margin: 0 0 16px 0;
    color: white;
  }
  
  .division-metrics {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .division-metrics .main-count {
    font-size: 36px;
    font-weight: 700;
  }
  
  .percentage {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .division-details {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  /* Locations Screen */
  .locations-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 16px;
    flex: 1;
  }
  
  .location-item {
    background: rgba(255, 255, 255, calc(0.05 * var(--dark-intensity)));
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideInLeft 0.6s ease;
  }
  
  .location-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .location-header h4 {
    margin: 0;
    font-size: 16px;
    color: white;
  }
  
  .location-count {
    font-size: 20px;
    font-weight: 700;
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
    border-radius: 4px;
  }
  
  .location-details {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  /* Charts Screen */
  .charts-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.3s ease;
  }
  
  /* Analytics Screen */
  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 24px;
    flex: 1;
  }
  
  .analytics-card {
    background: rgba(255, 255, 255, calc(0.05 * var(--dark-intensity)));
    border-radius: 16px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .analytics-card h4 {
    margin: 0 0 20px 0;
    color: white;
    font-size: 18px;
  }
  
  .analytics-data {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .data-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .data-label {
    color: rgba(255, 255, 255, 0.8);
  }
  
  .data-value {
    font-weight: 700;
    color: #22c55e;
  }
  
  .comparison-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .comparison-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .comp-name {
    min-width: 120px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .comp-bar {
    flex: 1;
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
  }
  
  .comp-fill {
    height: 100%;
    transition: all 0.3s ease;
  }
  
  .comp-value {
    min-width: 60px;
    text-align: right;
    font-weight: 700;
    color: white;
  }
  
  /* Navigation */
  .nav-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 50;
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
  
  .screen-indicators {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12px;
    z-index: 50;
  }
  
  .indicator {
    width: 12px;
    height: 12px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .indicator.active {
    background: #3b82f6;
    transform: scale(1.3);
  }
  
  /* Floating Alerts */
  .floating-alerts {
    position: fixed;
    top: 100px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 200;
  }
  
  .alert-toast {
    background: rgba(0, 0, 0, 0.9);
    border-radius: 8px;
    padding: 12px 16px;
    min-width: 250px;
    border-left: 4px solid;
    animation: slideInLeft 0.3s ease;
    backdrop-filter: blur(10px);
  }
  
  .alert-toast.critical {
    border-left-color: #ef4444;
  }
  
  .alert-toast.high {
    border-left-color: #f59e0b;
  }
  
  .alert-message {
    display: block;
    color: white;
    font-size: 13px;
    margin-bottom: 4px;
  }
  
  .alert-time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    direction: ltr;
  }
  
  /* Animations */
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
  
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .screen-nav {
      display: none;
    }
    
    .quick-stats {
      gap: 30px;
    }
    
    .stat-circle {
      width: 80px;
      height: 80px;
    }
    
    .main-count {
      font-size: 80px !important;
    }
    
    .mega-counter {
      margin-bottom: 30px;
    }
  }
</style>