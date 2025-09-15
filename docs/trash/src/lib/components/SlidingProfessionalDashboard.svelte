<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { organization, organizationSummary, criticalAlerts } from '../stores/organization';
  import { translations } from '../translations';

  let realTimeInterval: NodeJS.Timeout;
  let notificationTimeout: NodeJS.Timeout;
  let showSidebar = true;
  let selectedDateRange = 'آخر 28 يوماً';
  let selectedMetric = 'الإشغال';
  let currentScreen = 0;
  let showNotification = false;
  let notificationMessage = '';
  let notificationTitle = '';

  // Sliding functionality
  let isDragging = false;
  let dragStartX = 0;
  let translateX = 0;

  $: org = $organization;
  $: summary = $organizationSummary;
  $: alerts = $criticalAlerts;

  const screens = [
    { id: 'overview', name: 'نظرة عامة', icon: '◉' },
    { id: 'organization', name: 'هيكل المؤسسة', icon: '▣' },
    { id: 'realtime', name: 'تتبع الوجوه', icon: '▲' },
    { id: 'audience', name: 'تحليل الجمهور', icon: '○' },
    { id: 'maps', name: 'خريطة المواقع', icon: '◯' },
    { id: 'behavior', name: 'السلوك', icon: '⟳' }
  ];

  const dateRanges = [
    'اليوم',
    'أمس',
    'آخر 7 أيام',
    'آخر 28 يوماً',
    'آخر 90 يوماً',
    'العام الماضي'
  ];

  const metrics = [
    { name: 'الإشغال', icon: '▲', color: '#58a6ff' },
    { name: 'الجلسات', icon: '○', color: '#7ee787' },
    { name: 'الانشغال', icon: '■', color: '#f85149' },
    { name: 'التحويلات', icon: '◆', color: '#d29922' }
  ];

  // Show notification function
  function showNotificationMessage(title: string, message: string, duration: number = 3000) {
    notificationTitle = title;
    notificationMessage = message;
    showNotification = true;

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
      showNotification = false;
    }, duration);
  }

  // Button click handlers
  function handleRefresh() {
    showNotificationMessage('تحديث البيانات', 'جاري تحديث البيانات...', 2000);
    updateRealTimeCounts();
  }

  function handleExport() {
    showNotificationMessage('تصدير البيانات', 'تم بدء عملية التصدير', 2000);
  }

  function handleProfile() {
    showNotificationMessage('الملف الشخصي', 'فتح إعدادات الملف الشخصي', 2000);
  }

  function handleMenu() {
    showNotificationMessage('القائمة', 'فتح القائمة الرئيسية', 2000);
  }

  function toggleSidebar() {
    showSidebar = !showSidebar;
    showNotificationMessage('الشريط الجانبي', showSidebar ? 'تم إظهار الشريط الجانبي' : 'تم إخفاء الشريط الجانبي', 1500);
  }

  function handleDateRangeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedDateRange = target.value;
    showNotificationMessage('تغيير الفترة الزمنية', `تم تحديد الفترة: ${selectedDateRange}`, 2000);
  }

  function selectMetric(metricName: string) {
    selectedMetric = metricName;
    showNotificationMessage('تغيير المقياس', `تم تحديد: ${metricName}`, 1500);
  }

  // Screen navigation
  function goToScreen(index: number) {
    currentScreen = index;
    translateX = 0;
    showNotificationMessage('تغيير الشاشة', `انتقال إلى: ${screens[index].name}`, 1500);
  }

  function nextScreen() {
    const nextIndex = (currentScreen + 1) % screens.length;
    goToScreen(nextIndex);
  }

  function prevScreen() {
    const prevIndex = (currentScreen - 1 + screens.length) % screens.length;
    goToScreen(prevIndex);
  }

  // Touch and drag handling
  function handleTouchStart(e: TouchEvent) {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
  }

  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    dragStartX = e.clientX;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    translateX = Math.max(-100, Math.min(100, deltaX * 0.3));
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    translateX = Math.max(-100, Math.min(100, deltaX * 0.3));
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

  // Alert management
  function dismissNotification() {
    showNotification = false;
    clearTimeout(notificationTimeout);
  }

  onMount(() => {
    realTimeInterval = setInterval(updateRealTimeCounts, 3000);

    // Touch and mouse events
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleDragEnd);

    return () => {
      clearInterval(realTimeInterval);
      clearTimeout(notificationTimeout);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleDragEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  });

  onDestroy(() => {
    if (realTimeInterval) clearInterval(realTimeInterval);
    if (notificationTimeout) clearTimeout(notificationTimeout);
  });

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('ar-SA');
  }

  function formatTime(): string {
    return new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="sliding-professional-dashboard" dir="rtl">

  <!-- Auto-hiding Notification -->
  {#if showNotification}
    <div class="notification-toast" class:show={showNotification}>
      <div class="notification-content">
        <div class="notification-title">{notificationTitle}</div>
        <div class="notification-message">{notificationMessage}</div>
      </div>
      <button class="notification-close" on:click={dismissNotification}>×</button>
    </div>
  {/if}

  <!-- Top Header Bar -->
  <header class="dashboard-header">
    <div class="header-left">
      <button class="sidebar-toggle" on:click={toggleSidebar}>
        ☰
      </button>
      <div class="logo-section">
        <div class="logo-icon">◉</div>
        <h1 class="dashboard-title">{screens[currentScreen].name} - نظام العدادات</h1>
        <span class="report-type">(لوحة معلومات متقدمة)</span>
      </div>
    </div>

    <!-- Screen Navigation Tabs -->
    <div class="screen-tabs">
      {#each screens as screen, index}
        <button
          class="screen-tab {index === currentScreen ? 'active' : ''}"
          on:click={() => goToScreen(index)}
        >
          <span class="tab-icon">{screen.icon}</span>
          <span class="tab-name">{screen.name}</span>
        </button>
      {/each}
    </div>

    <div class="header-right">
      <button class="header-btn" on:click={handleRefresh}>
        <span>⟲</span>
        تحديث
      </button>
      <button class="header-btn" on:click={handleExport}>
        <span>↗</span>
        تصدير
      </button>
      <button class="header-btn" on:click={handleProfile}>
        <span>◐</span>
        الملف
      </button>
      <button class="menu-btn" on:click={handleMenu}>⋯</button>
    </div>
  </header>

  <div class="dashboard-body">

    <!-- Sliding Screens Container -->
    <main class="screens-container"
          style="transform: translateX(calc(-{currentScreen} * 100% + {translateX}px));"
          on:touchstart={handleTouchStart}
          on:mousedown={handleMouseDown}>

      <!-- Screen 1: Overview -->
      <section class="screen overview-screen">
        <div class="metrics-row">
          <div class="primary-metric-card">
            <div class="metric-header">
              <h2>الجلسات</h2>
              <div class="metric-controls">
                <select bind:value={selectedDateRange} on:change={handleDateRangeChange} class="date-selector">
                  {#each dateRanges as range}
                    <option value={range}>{range}</option>
                  {/each}
                </select>
                <button class="chart-icon" on:click={() => showNotificationMessage('المخطط', 'فتح المخطط التفصيلي')}>◉</button>
              </div>
            </div>

            <div class="metric-main">
              <div class="big-number">
                {#if summary}
                  {formatNumber(summary.totalRealTimeCount)}
                {:else}
                  83.740
                {/if}
              </div>
              <div class="metric-subtitle">
                27.8% مقارنة بالفترة السابقة {selectedDateRange}
              </div>
            </div>

            <div class="trend-chart">
              {#if org}
                <svg class="mini-chart" viewBox="0 0 300 60">
                  <defs>
                    <pattern id="grid-pattern" width="30" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 20" fill="none" stroke="rgba(66, 133, 244, 0.1)" stroke-width="1"/>
                    </pattern>
                  </defs>
                  <rect width="300" height="60" fill="url(#grid-pattern)" />

                  {#each org.analytics.trends.slice(-10) as point, i}
                    {#if i > 0}
                      <line
                        x1={((i-1) / 9) * 300}
                        y1={60 - (org.analytics.trends[i-1].count / Math.max(...org.analytics.trends.map(p => p.count))) * 50}
                        x2={(i / 9) * 300}
                        y2={60 - (point.count / Math.max(...org.analytics.trends.map(p => p.count))) * 50}
                        stroke="#4285f4"
                        stroke-width="2"
                      />
                    {/if}
                    <circle
                      cx={(i / 9) * 300}
                      cy={60 - (point.count / Math.max(...org.analytics.trends.map(p => p.count))) * 50}
                      r="2"
                      fill="#4285f4"
                    />
                  {/each}
                </svg>

                <div class="chart-labels">
                  <span>25 سبت</span>
                  <span>28 سبت</span>
                  <span>17 أكت</span>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="content-grid">
          <div class="table-widget">
            <div class="widget-header">
              <div class="widget-title">عنوان الصفحة</div>
              <div class="sessions-header">الجلسات ↓</div>
              <div class="widget-actions">
                <button class="action-btn" on:click={() => showNotificationMessage('المخطط', 'عرض مخطط الصفحات')}>◉</button>
                <button class="action-btn" on:click={() => showNotificationMessage('التصدير', 'تصدير بيانات الصفحات')}>↗</button>
              </div>
            </div>

            <div class="data-table">
              <div class="table-row header-row">
                <span class="page-title">الصفحة</span>
                <span class="sessions-count">الجلسات</span>
              </div>

              {#if org}
                {#each org.divisions as division}
                  <div class="table-row" on:click={() => showNotificationMessage('تفاصيل', `عرض تفاصيل ${division.name}`)}>
                    <span class="page-title">{division.name}</span>
                    <span class="sessions-count">{division.totalRealTimeCount.toLocaleString('ar-SA')}</span>
                  </div>
                {/each}
              {/if}

              <div class="table-row total-row">
                <span class="page-title">المجموع</span>
                <span class="sessions-count">
                  {#if summary}
                    {summary.totalRealTimeCount.toLocaleString('ar-SA')}
                  {:else}
                    83.740
                  {/if}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Screen 2: Organization Structure -->
      <section class="screen organization-screen">
        <div class="organization-header">
          <h2>هيكل المؤسسة التفصيلي</h2>
          <div class="structure-controls">
            <button class="structure-btn active">عرض شجري</button>
            <button class="structure-btn">عرض جدولي</button>
            <button class="structure-btn">تقارير</button>
          </div>
        </div>

        {#if org}
          <div class="organization-tree">
            <!-- Organization Root -->
            <div class="org-node org-root">
              <div class="node-header">
                <span class="node-icon">🏢</span>
                <div class="node-info">
                  <h3 class="node-title">{org.name}</h3>
                  <div class="node-stats">
                    <span class="stat-item">إجمالي العدد: {org.totalRealTimeCount}</span>
                    <span class="stat-item">الأقسام: {org.divisions.length}</span>
                  </div>
                </div>
              </div>

              <!-- Divisions Level -->
              <div class="org-children">
                {#each org.divisions as division, divIndex}
                  <div class="org-node division-node">
                    <div class="node-header">
                      <span class="node-icon">🏬</span>
                      <div class="node-info">
                        <h4 class="node-title">{division.name}</h4>
                        <div class="node-stats">
                          <span class="stat-item">العدد: {division.totalRealTimeCount}</span>
                          <span class="stat-item">المواقع: {division.locations.length}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Locations Level -->
                    <div class="org-children">
                      {#each division.locations as location, locIndex}
                        <div class="org-node location-node">
                          <div class="node-header">
                            <span class="node-icon">🏪</span>
                            <div class="node-info">
                              <h5 class="node-title">{location.name}</h5>
                              <div class="node-stats">
                                <span class="stat-item">العدد: {location.totalRealTimeCount}</span>
                                <span class="stat-item">الطوابق: {location.floors.length}</span>
                              </div>
                            </div>
                          </div>

                          <!-- Floors Level -->
                          <div class="org-children">
                            {#each location.floors as floor, floorIndex}
                              <div class="org-node floor-node">
                                <div class="node-header">
                                  <span class="node-icon">🔢</span>
                                  <div class="node-info">
                                    <h6 class="node-title">{floor.name}</h6>
                                    <div class="node-stats">
                                      <span class="stat-item">العدد: {floor.totalRealTimeCount}</span>
                                      <span class="stat-item">الكاميرات: {floor.cameras.length}</span>
                                    </div>
                                  </div>
                                </div>

                                <!-- Cameras Level -->
                                <div class="org-children cameras-grid">
                                  {#each floor.cameras as camera, camIndex}
                                    <div class="org-node camera-node">
                                      <div class="camera-info">
                                        <span class="camera-status {camera.status}"></span>
                                        <span class="camera-name">{camera.name}</span>
                                        <span class="camera-count">{camera.realTimeCount}</span>
                                      </div>

                                      <!-- Historical Data Summary -->
                                      <div class="historical-summary">
                                        <div class="time-data">
                                          <span class="time-label">ساعة:</span>
                                          <span class="time-value">{camera.historicalData.hourly[camera.historicalData.hourly.length - 1]?.count || 0}</span>
                                        </div>
                                        <div class="time-data">
                                          <span class="time-label">يوم:</span>
                                          <span class="time-value">{camera.historicalData.daily[camera.historicalData.daily.length - 1]?.count || 0}</span>
                                        </div>
                                      </div>

                                      <!-- Alert Indicators -->
                                      {#if camera.alerts && camera.alerts.length > 0}
                                        <div class="camera-alerts">
                                          {#each camera.alerts as alert}
                                            <span class="alert-indicator {alert.severity}">⚠</span>
                                          {/each}
                                        </div>
                                      {/if}
                                    </div>
                                  {/each}
                                </div>
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Summary Analytics Panel -->
          <div class="analytics-summary">
            <div class="summary-card">
              <h4>ملخص على مستوى المؤسسة</h4>
              <div class="summary-metrics">
                <div class="metric">
                  <span class="metric-label">إجمالي الزوار الحاليين</span>
                  <span class="metric-value">{org.totalRealTimeCount}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">متوسط النشاط</span>
                  <span class="metric-value">{Math.round(org.totalRealTimeCount / org.divisions.length)}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">ذروة اليوم</span>
                  <span class="metric-value">{Math.max(...org.divisions.map(d => d.totalRealTimeCount))}</span>
                </div>
              </div>
            </div>

            <div class="trends-card">
              <h4>الاتجاهات والذروات</h4>
              <div class="trends-mini-chart">
                <svg viewBox="0 0 200 80" class="trend-svg">
                  {#each org.analytics.trends.slice(-8) as trend, i}
                    <rect
                      x={i * 24 + 5}
                      y={80 - (trend.count / Math.max(...org.analytics.trends.map(t => t.count))) * 60}
                      width="18"
                      height={(trend.count / Math.max(...org.analytics.trends.map(t => t.count))) * 60}
                      fill="#58a6ff"
                      rx="2"
                    />
                  {/each}
                </svg>
              </div>
            </div>
          </div>
        {/if}
      </section>

      <!-- Screen 3: Face Detection Real-time -->
      <section class="screen realtime-screen">
        <div class="realtime-header">
          <h2>تتبع الوجوه المباشر</h2>
          <div class="live-indicator">
            <span class="live-dot"></span>
            مباشر الآن
          </div>
        </div>

        <div class="face-detection-grid">
          <div class="detection-stats-card">
            <h3>الوجوه المكتشفة حالياً</h3>
            <div class="faces-count">
              {#if summary}
                {summary.totalRealTimeCount}
              {:else}
                247
              {/if}
            </div>
            <div class="detection-info">
              <div class="info-item">
                <span class="info-label">معدل الاكتشاف:</span>
                <span class="info-value">98.5%</span>
              </div>
              <div class="info-item">
                <span class="info-label">الوجوه الجديدة:</span>
                <span class="info-value">12 في الدقيقة</span>
              </div>
            </div>
          </div>

          <div class="camera-status-card">
            <h3>حالة الكاميرات</h3>
            <div class="camera-list">
              {#if org}
                {#each org.divisions as division}
                  {#each division.locations.slice(0, 4) as location}
                    <div class="camera-status-item">
                      <div class="status-indicator online"></div>
                      <span class="camera-name">{location.name}</span>
                      <span class="face-count">{location.totalRealTimeCount} وجه</span>
                    </div>
                  {/each}
                {/each}
              {/if}
            </div>
          </div>

          <div class="detection-chart-card">
            <h3>اكتشاف الوجوه خلال الساعة الماضية</h3>
            <div class="mini-detection-chart">
              <svg class="detection-svg" viewBox="0 0 400 120">
                {#if org}
                  <defs>
                    <linearGradient id="faceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:#58a6ff;stop-opacity:0.8" />
                      <stop offset="100%" style="stop-color:#58a6ff;stop-opacity:0.1" />
                    </linearGradient>
                  </defs>

                  {#each org.analytics.trends.slice(-12) as point, i}
                    <rect
                      x={i * 32 + 10}
                      y={120 - (point.count / Math.max(...org.analytics.trends.map(p => p.count))) * 100}
                      width="20"
                      height={(point.count / Math.max(...org.analytics.trends.map(p => p.count))) * 100}
                      fill="url(#faceGradient)"
                      rx="2"
                    />
                  {/each}
                {/if}
              </svg>
            </div>
          </div>
        </div>
      </section>

      <!-- Screen 3: Audience Analytics -->
      <section class="screen audience-screen">
        <div class="audience-header">
          <h2>تحليل الجمهور</h2>
          <div class="time-filter">
            <select class="time-selector">
              <option>اليوم</option>
              <option>هذا الأسبوع</option>
              <option>هذا الشهر</option>
            </select>
          </div>
        </div>

        <div class="audience-analytics-grid">
          <div class="demographics-card">
            <h3>التركيبة الديموغرافية</h3>
            <div class="demographics-chart">
              <div class="demo-item">
                <span class="demo-label">الذكور</span>
                <div class="demo-bar">
                  <div class="demo-fill" style="width: 65%; background: #58a6ff;"></div>
                </div>
                <span class="demo-percent">65%</span>
              </div>
              <div class="demo-item">
                <span class="demo-label">الإناث</span>
                <div class="demo-bar">
                  <div class="demo-fill" style="width: 35%; background: #f85149;"></div>
                </div>
                <span class="demo-percent">35%</span>
              </div>
            </div>
          </div>

          <div class="age-groups-card">
            <h3>الفئات العمرية</h3>
            <div class="age-distribution">
              <div class="age-item">
                <span class="age-range">18-25</span>
                <span class="age-count">28%</span>
              </div>
              <div class="age-item">
                <span class="age-range">26-35</span>
                <span class="age-count">35%</span>
              </div>
              <div class="age-item">
                <span class="age-range">36-45</span>
                <span class="age-count">22%</span>
              </div>
              <div class="age-item">
                <span class="age-range">46+</span>
                <span class="age-count">15%</span>
              </div>
            </div>
          </div>

          <div class="visit-patterns-card">
            <h3>أنماط الزيارة</h3>
            <div class="patterns-data">
              <div class="pattern-item">
                <span class="pattern-icon">⟲</span>
                <div class="pattern-info">
                  <span class="pattern-title">زوار جدد</span>
                  <span class="pattern-value">68%</span>
                </div>
              </div>
              <div class="pattern-item">
                <span class="pattern-icon">○</span>
                <div class="pattern-info">
                  <span class="pattern-title">زوار عائدون</span>
                  <span class="pattern-value">32%</span>
                </div>
              </div>
              <div class="pattern-item">
                <span class="pattern-icon">▲</span>
                <div class="pattern-info">
                  <span class="pattern-title">متوسط وقت البقاء</span>
                  <span class="pattern-value">12 دقيقة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Screen 4: Interactive Maps -->
      <section class="screen maps-screen">
        <div class="maps-header">
          <h2>خريطة المواقع التفاعلية</h2>
          <div class="map-controls">
            <button class="map-btn active">عرض الكل</button>
            <button class="map-btn">أعلى كثافة</button>
            <button class="map-btn">تنبيهات</button>
          </div>
        </div>

        <div class="interactive-map-container">
          <div class="world-map-isolated">
            <svg class="isolated-map-svg" viewBox="0 0 800 400">
              <!-- Interactive World Map -->
              <rect width="800" height="400" fill="#161b22" />

              <!-- Continents with real-time data points -->
              <g class="continent north-america">
                <path d="M100 80 L180 40 L240 120 L180 160 L100 140 Z" fill="#21262d" stroke="#30363d" stroke-width="1"/>
                <circle cx="140" cy="100" r="8" fill="#58a6ff" opacity="0.8" class="data-point">
                  <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite"/>
                </circle>
                <text x="140" y="130" class="location-label">أمريكا الشمالية</text>
                <text x="140" y="145" class="count-label">2,347 زائر</text>
              </g>

              <g class="continent europe">
                <path d="M300 60 L360 50 L370 100 L320 110 L300 90 Z" fill="#21262d" stroke="#30363d" stroke-width="1"/>
                <circle cx="335" cy="80" r="6" fill="#7ee787" opacity="0.8" class="data-point">
                  <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <text x="335" y="125" class="location-label">أوروبا</text>
                <text x="335" y="140" class="count-label">1,856 زائر</text>
              </g>

              <g class="continent asia">
                <path d="M420 40 L580 30 L600 80 L580 120 L420 100 Z" fill="#21262d" stroke="#30363d" stroke-width="1"/>
                <circle cx="500" cy="75" r="10" fill="#f85149" opacity="0.8" class="data-point">
                  <animate attributeName="r" values="10;14;10" dur="2.5s" repeatCount="indefinite"/>
                </circle>
                <text x="500" y="150" class="location-label">آسيا</text>
                <text x="500" y="165" class="count-label">4,521 زائر</text>
              </g>

              <g class="continent middle-east">
                <path d="M380 120 L450 115 L460 140 L390 145 Z" fill="#21262d" stroke="#30363d" stroke-width="1"/>
                <circle cx="415" cy="130" r="9" fill="#d29922" opacity="0.8" class="data-point">
                  <animate attributeName="r" values="9;13;9" dur="1.8s" repeatCount="indefinite"/>
                </circle>
                <text x="415" y="170" class="location-label">الشرق الأوسط</text>
                <text x="415" y="185" class="count-label">3,142 زائر</text>
              </g>
            </svg>
          </div>

          <div class="map-legend">
            <h4>مفتاح الخريطة</h4>
            <div class="legend-items">
              <div class="legend-item">
                <div class="legend-dot" style="background: #58a6ff;"></div>
                <span>كثافة عالية</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background: #7ee787;"></div>
                <span>كثافة متوسطة</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background: #f85149;"></div>
                <span>كثافة منخفضة</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background: #d29922;"></div>
                <span>تنبيه</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Screen 5: Behavior Analytics -->
      <section class="screen behavior-screen">
        <div class="behavior-header">
          <h2>تحليل السلوك</h2>
          <div class="behavior-tabs">
            <button class="behavior-tab active">مسارات الحركة</button>
            <button class="behavior-tab">نقاط الاهتمام</button>
            <button class="behavior-tab">وقت التوقف</button>
          </div>
        </div>

        <div class="behavior-analytics-grid">
          <div class="movement-patterns-card">
            <h3>أنماط الحركة الأكثر شيوعاً</h3>
            <div class="movement-flow">
              <div class="flow-item">
                <span class="flow-path">المدخل الرئيسي → القسم التجاري → المخرج</span>
                <span class="flow-percentage">45%</span>
              </div>
              <div class="flow-item">
                <span class="flow-path">المدخل الجانبي → المقهى → القسم التجاري</span>
                <span class="flow-percentage">28%</span>
              </div>
              <div class="flow-item">
                <span class="flow-path">المدخل الرئيسي → مكتب الاستعلامات</span>
                <span class="flow-percentage">18%</span>
              </div>
            </div>
          </div>

          <div class="heatmap-card">
            <h3>خريطة الكثافة الحرارية</h3>
            <div class="heatmap-visualization">
              <svg class="heatmap-svg" viewBox="0 0 300 200">
                <defs>
                  <radialGradient id="heat1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#f85149;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#f85149;stop-opacity:0" />
                  </radialGradient>
                  <radialGradient id="heat2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#d29922;stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:#d29922;stop-opacity:0" />
                  </radialGradient>
                  <radialGradient id="heat3" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#58a6ff;stop-opacity:0.7" />
                    <stop offset="100%" style="stop-color:#58a6ff;stop-opacity:0" />
                  </radialGradient>
                </defs>

                <rect width="300" height="200" fill="#0d1117" stroke="#30363d" stroke-width="1" rx="4"/>
                <circle cx="80" cy="60" r="25" fill="url(#heat1)"/>
                <circle cx="180" cy="100" r="30" fill="url(#heat2)"/>
                <circle cx="120" cy="140" r="20" fill="url(#heat3)"/>
                <circle cx="220" cy="70" r="15" fill="url(#heat3)"/>

                <text x="20" y="25" class="heatmap-label">نقاط الكثافة العالية</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- Navigation Arrows -->
  <button class="nav-arrow left" on:click={nextScreen}>›</button>
  <button class="nav-arrow right" on:click={prevScreen}>‹</button>

  <!-- Screen Indicators -->
  <div class="screen-indicators">
    {#each screens as screen, index}
      <div
        class="indicator {index === currentScreen ? 'active' : ''}"
        on:click={() => goToScreen(index)}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && goToScreen(index)}
      ></div>
    {/each}
  </div>

  <!-- Footer -->
  <footer class="dashboard-footer">
    <div class="footer-left">
      <span>نشاط في الوقت الحقيقي خلال الـ 30 دقيقة الماضية</span>
    </div>
    <div class="footer-right">
      <span>آخر تحديث: {formatTime()}</span>
    </div>
  </footer>

</div>

<style>
  .sliding-professional-dashboard {
    min-height: 100vh;
    background: #0d1117;
    color: #f0f6fc;
    font-family: 'Google Sans', 'Roboto', Arial, sans-serif;
    direction: rtl;
    position: relative;
    overflow: hidden;
  }

  /* Notification Toast */
  .notification-toast {
    position: fixed;
    top: 80px;
    right: 20px;
    background: #4285f4;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    min-width: 300px;
    display: flex;
    align-items: center;
    gap: 12px;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .notification-toast.show {
    transform: translateX(0);
  }

  .notification-content {
    flex: 1;
  }

  .notification-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .notification-message {
    font-size: 13px;
    opacity: 0.9;
  }

  .notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s ease;
  }

  .notification-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Header Styles */
  .dashboard-header {
    height: 64px;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .sidebar-toggle {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    color: #8b949e;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .sidebar-toggle:hover {
    background: #21262d;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    font-size: 24px;
  }

  .dashboard-title {
    font-size: 20px;
    font-weight: 400;
    margin: 0;
    color: #f0f6fc;
  }

  .report-type {
    font-size: 14px;
    color: #8b949e;
    margin-right: 8px;
  }

  .screen-tabs {
    display: flex;
    gap: 4px;
  }

  .screen-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: none;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #8b949e;
    font-size: 14px;
  }

  .screen-tab.active {
    background: #1f6feb;
    color: #ffffff;
  }

  .screen-tab:hover {
    background: #21262d;
  }

  .tab-icon {
    font-size: 16px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #f0f6fc;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .header-btn:hover {
    background: #30363d;
    box-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  .menu-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    color: #8b949e;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .menu-btn:hover {
    background: #21262d;
  }

  /* Dashboard Body */
  .dashboard-body {
    display: flex;
    min-height: calc(100vh - 104px);
  }

  /* Screens Container */
  .screens-container {
    flex: 1;
    display: flex;
    transition: transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
    will-change: transform;
  }

  .screen {
    min-width: 100%;
    padding: 24px;
    background: #0d1117;
    user-select: none;
  }

  /* Metrics Row */
  .metrics-row {
    margin-bottom: 24px;
  }

  .primary-metric-card {
    background: #161b22;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .metric-header h2 {
    font-size: 18px;
    font-weight: 500;
    margin: 0;
    color: #f0f6fc;
  }

  .metric-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .date-selector {
    padding: 6px 12px;
    border: 1px solid #30363d;
    border-radius: 4px;
    background: #21262d;
    font-size: 14px;
    color: #f0f6fc;
    cursor: pointer;
  }

  .chart-icon {
    padding: 6px;
    border: 1px solid #30363d;
    border-radius: 4px;
    background: #21262d;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .chart-icon:hover {
    background: #30363d;
  }

  .metric-main {
    margin-bottom: 24px;
  }

  .big-number {
    font-size: 48px;
    font-weight: 400;
    color: #58a6ff;
    line-height: 1;
    margin-bottom: 8px;
  }

  .metric-subtitle {
    font-size: 14px;
    color: #7ee787;
  }

  /* Trend Chart */
  .trend-chart {
    position: relative;
  }

  .mini-chart {
    width: 100%;
    height: 60px;
    margin-bottom: 8px;
  }

  .chart-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #8b949e;
  }

  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
  }

  /* Widget Styles */
  .chart-widget, .map-widget, .table-widget {
    background: #161b22;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
  }

  .widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .widget-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #8b949e;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-dot.users { background: #4285f4; }
  .legend-dot.paid-search { background: #34a853; }

  .widget-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    color: #8b949e;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .action-btn:hover {
    background: #30363d;
  }

  .widget-title {
    font-size: 14px;
    font-weight: 500;
    color: #f0f6fc;
  }

  .sessions-header {
    font-size: 14px;
    font-weight: 500;
    color: #f0f6fc;
  }

  /* Charts */
  .bar-chart, .world-map {
    height: 200px;
  }

  .chart-svg, .map-svg {
    width: 100%;
    height: 100%;
  }

  .axis-label {
    font-size: 12px;
    fill: #8b949e;
  }

  .map-label {
    font-size: 10px;
    fill: white;
    text-anchor: middle;
  }

  /* Data Table */
  .data-table {
    font-size: 14px;
  }

  .table-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #30363d;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .table-row:hover {
    background: #21262d;
  }

  .table-row.header-row {
    font-weight: 500;
    color: #8b949e;
    border-bottom: 2px solid #30363d;
    cursor: default;
  }

  .table-row.header-row:hover {
    background: none;
  }

  .table-row.total-row {
    border-top: 2px solid #30363d;
    font-weight: 600;
    background: #21262d;
    cursor: default;
  }

  .table-row.total-row:hover {
    background: #21262d;
  }

  .page-title {
    color: #58a6ff;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sessions-count {
    color: #f0f6fc;
    font-weight: 400;
    min-width: 60px;
    text-align: left;
  }

  /* Face Detection Real-time Screen */
  .realtime-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .realtime-header h2 {
    font-size: 24px;
    color: #f0f6fc;
    margin: 0;
  }

  .live-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #7ee787;
    font-weight: 500;
  }

  .live-dot {
    width: 8px;
    height: 8px;
    background: #7ee787;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .face-detection-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 24px;
  }

  .detection-stats-card, .camera-status-card {
    background: #161b22;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
  }

  .detection-chart-card {
    background: #161b22;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
    grid-column: 1 / -1;
  }

  .detection-stats-card h3, .camera-status-card h3, .detection-chart-card h3 {
    font-size: 16px;
    color: #8b949e;
    margin: 0 0 16px 0;
  }

  .faces-count {
    font-size: 36px;
    font-weight: 400;
    color: #58a6ff;
    margin-bottom: 16px;
  }

  .detection-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #30363d;
  }

  .info-label {
    color: #8b949e;
  }

  .info-value {
    color: #7ee787;
    font-weight: 500;
  }

  .camera-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .camera-status-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid #30363d;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-indicator.online {
    background: #7ee787;
    animation: pulse 2s infinite;
  }

  .camera-name {
    color: #f0f6fc;
    flex: 1;
  }

  .face-count {
    color: #58a6ff;
    font-weight: 500;
  }

  .mini-detection-chart {
    height: 120px;
    margin-top: 16px;
  }

  .detection-svg {
    width: 100%;
    height: 100%;
  }

  /* Organization Structure Screen */
  .organization-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .organization-header h2 {
    font-size: 24px;
    color: #f0f6fc;
    margin: 0;
  }

  .structure-controls {
    display: flex;
    gap: 8px;
  }

  .structure-btn {
    padding: 8px 16px;
    border: 1px solid #30363d;
    border-radius: 6px;
    background: #21262d;
    color: #8b949e;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .structure-btn.active, .structure-btn:hover {
    background: #1f6feb;
    color: #ffffff;
    border-color: #1f6feb;
  }

  .organization-tree {
    background: #161b22;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
    max-height: 600px;
    overflow-y: auto;
  }

  .org-node {
    margin-bottom: 16px;
    background: #21262d;
    border-radius: 6px;
    border: 1px solid #30363d;
    transition: all 0.2s ease;
  }

  .org-node:hover {
    border-color: #58a6ff;
    box-shadow: 0 2px 8px rgba(88, 166, 255, 0.1);
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    cursor: pointer;
  }

  .node-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
  }

  .node-info {
    flex: 1;
  }

  .node-title {
    color: #f0f6fc;
    font-size: 16px;
    margin: 0 0 4px 0;
    font-weight: 500;
  }

  .org-root .node-title {
    font-size: 18px;
    font-weight: 600;
    color: #58a6ff;
  }

  .division-node .node-title {
    font-size: 16px;
    color: #7ee787;
  }

  .location-node .node-title {
    font-size: 15px;
    color: #d29922;
  }

  .floor-node .node-title {
    font-size: 14px;
    color: #f85149;
  }

  .node-stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
  }

  .stat-item {
    color: #8b949e;
    background: #0d1117;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid #30363d;
  }

  .org-children {
    padding-right: 32px;
    padding-bottom: 12px;
    padding-left: 12px;
    border-right: 2px solid #30363d;
    margin-right: 20px;
  }

  .cameras-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    padding-right: 0;
    border-right: none;
  }

  .camera-node {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 4px;
    padding: 12px;
    transition: all 0.2s ease;
  }

  .camera-node:hover {
    border-color: #58a6ff;
    background: #161b22;
  }

  .camera-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .camera-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .camera-status.online {
    background: #7ee787;
    animation: pulse 2s infinite;
  }

  .camera-status.offline {
    background: #f85149;
  }

  .camera-status.maintenance {
    background: #d29922;
  }

  .camera-name {
    color: #f0f6fc;
    font-size: 13px;
    font-weight: 500;
    flex: 1;
  }

  .camera-count {
    color: #58a6ff;
    font-size: 14px;
    font-weight: 600;
    background: #21262d;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .historical-summary {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .time-data {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
  }

  .time-label {
    color: #8b949e;
  }

  .time-value {
    color: #7ee787;
    font-weight: 500;
    background: #21262d;
    padding: 1px 4px;
    border-radius: 2px;
  }

  .camera-alerts {
    display: flex;
    gap: 4px;
  }

  .alert-indicator {
    font-size: 12px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
  }

  .alert-indicator.critical {
    background: #f85149;
    color: white;
  }

  .alert-indicator.high {
    background: #d29922;
    color: white;
  }

  .alert-indicator.medium {
    background: #58a6ff;
    color: white;
  }

  .analytics-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .summary-card, .trends-card {
    background: #161b22;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
  }

  .summary-card h4, .trends-card h4 {
    color: #f0f6fc;
    font-size: 16px;
    margin: 0 0 16px 0;
    font-weight: 600;
  }

  .summary-metrics {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .metric-label {
    color: #8b949e;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .metric-value {
    color: #58a6ff;
    font-size: 24px;
    font-weight: 600;
  }

  .trends-mini-chart {
    height: 80px;
  }

  .trend-svg {
    width: 100%;
    height: 100%;
  }

  /* Audience Analytics Screen */
  .audience-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .audience-header h2 {
    font-size: 24px;
    color: #f0f6fc;
    margin: 0;
  }

  .time-selector {
    padding: 8px 16px;
    border: 1px solid #30363d;
    border-radius: 6px;
    background: #21262d;
    color: #f0f6fc;
    font-size: 14px;
  }

  .audience-analytics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .demographics-card, .age-groups-card, .visit-patterns-card {
    background: #161b22;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
  }

  .demographics-card h3, .age-groups-card h3, .visit-patterns-card h3 {
    font-size: 16px;
    color: #8b949e;
    margin: 0 0 16px 0;
  }

  .demographics-chart {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .demo-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .demo-label {
    width: 50px;
  }

  .demo-bar {
    flex: 1;
    height: 12px;
    background: #30363d;
    border-radius: 6px;
    overflow: hidden;
  }

  .demo-fill {
    height: 100%;
  }

  .demo-percent {
    width: 40px;
    text-align: left;
  }

  .age-distribution {
    display: flex;
    justify-content: space-around;
    text-align: center;
  }

  .age-range {
    font-size: 12px;
    color: #8b949e;
  }

  .age-count {
    font-size: 18px;
    font-weight: 500;
  }

  .patterns-data {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .pattern-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pattern-icon {
    font-size: 20px;
    color: #58a6ff;
  }

  .pattern-title {
    font-weight: 500;
  }

  .pattern-value {
    margin-right: auto;
    font-weight: 500;
    color: #7ee787;
  }

  /* Interactive Maps Screen */
  .maps-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .maps-header h2 {
    font-size: 24px;
    color: #f0f6fc;
    margin: 0;
  }

  .map-controls {
    display: flex;
    gap: 8px;
  }

  .map-btn {
    padding: 8px 16px;
    border: 1px solid #30363d;
    border-radius: 6px;
    background: #21262d;
    color: #8b949e;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .map-btn.active, .map-btn:hover {
    background: #1f6feb;
    color: #ffffff;
    border-color: #1f6feb;
  }

  .interactive-map-container {
    display: grid;
    grid-template-columns: 1fr 250px;
    gap: 24px;
    height: 500px;
  }

  .world-map-isolated {
    background: #0d1117;
    border-radius: 8px;
    border: 1px solid #30363d;
  }

  .isolated-map-svg {
    width: 100%;
    height: 100%;
  }

  .location-label {
    font-size: 12px;
    fill: #f0f6fc;
    text-anchor: middle;
  }

  .count-label {
    font-size: 14px;
    fill: #7ee787;
    text-anchor: middle;
    font-weight: 500;
  }

  .data-point {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .data-point:hover {
    opacity: 1;
    stroke: white;
    stroke-width: 2px;
  }

  .map-legend {
    background: #161b22;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #30363d;
  }

  .map-legend h4 {
    font-size: 16px;
    color: #f0f6fc;
    margin: 0 0 16px 0;
    font-weight: 600;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  /* Behavior Analytics Screen */
  .behavior-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .behavior-header h2 {
    font-size: 24px;
    color: #f0f6fc;
    margin: 0;
  }

  .behavior-tabs {
    display: flex;
    gap: 8px;
  }

  .behavior-tab {
    padding: 8px 16px;
    border: 1px solid #30363d;
    border-radius: 6px;
    background: #21262d;
    color: #8b949e;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .behavior-tab.active, .behavior-tab:hover {
    background: #1f6feb;
    color: #ffffff;
    border-color: #1f6feb;
  }

  .behavior-analytics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .movement-patterns-card, .heatmap-card {
    background: #161b22;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #30363d;
  }

  .movement-patterns-card h3, .heatmap-card h3 {
    font-size: 16px;
    color: #8b949e;
    margin: 0 0 16px 0;
  }

  .movement-flow {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .flow-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #21262d;
    padding: 12px;
    border-radius: 4px;
  }

  .flow-path {
    color: #f0f6fc;
  }

  .flow-percentage {
    color: #7ee787;
    font-weight: 500;
  }

  .heatmap-visualization {
    height: 200px;
  }

  .heatmap-svg {
    width: 100%;
    height: 100%;
  }

  .heatmap-label {
    font-size: 12px;
    fill: #8b949e;
  }

  /* Navigation Arrows */
  .nav-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .nav-arrow:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .nav-arrow.left {
    left: 16px;
  }

  .nav-arrow.right {
    right: 16px;
  }

  /* Screen Indicators */
  .screen-indicators {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 100;
  }

  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .indicator.active {
    background: white;
    transform: scale(1.2);
  }

  /* Footer */
  .dashboard-footer {
    height: 40px;
    background: #161b22;
    border-top: 1px solid #30363d;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    font-size: 12px;
    color: #8b949e;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }

</style>