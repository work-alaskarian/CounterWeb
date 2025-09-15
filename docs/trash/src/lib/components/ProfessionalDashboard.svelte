<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { organization, organizationSummary, criticalAlerts } from '../stores/organization';
  import { translations } from '../translations';
  
  let realTimeInterval: NodeJS.Timeout;
  let showSidebar = true;
  let selectedDateRange = 'آخر 28 يوماً';
  let selectedMetric = 'الإشغال';
  
  $: org = $organization;
  $: summary = $organizationSummary;
  $: alerts = $criticalAlerts;
  
  const dateRanges = [
    'اليوم',
    'أمس', 
    'آخر 7 أيام',
    'آخر 28 يوماً',
    'آخر 90 يوماً',
    'العام الماضي'
  ];
  
  const metrics = [
    { name: 'الإشغال', icon: '👥', color: '#4285f4' },
    { name: 'الجلسات', icon: '⏱️', color: '#34a853' },
    { name: 'الانشغال', icon: '📊', color: '#ea4335' },
    { name: 'التحويلات', icon: '🎯', color: '#fbbc04' }
  ];
  
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
  
  onMount(() => {
    realTimeInterval = setInterval(updateRealTimeCounts, 3000);
    return () => clearInterval(realTimeInterval);
  });
  
  onDestroy(() => {
    if (realTimeInterval) clearInterval(realTimeInterval);
  });
  
  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('ar-SA');
  }
  
  function formatPercentage(current: number, total: number): string {
    if (total === 0) return '0%';
    return ((current / total) * 100).toFixed(1) + '%';
  }
  
  function formatTime(): string {
    return new Date().toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
</script>

<div class="professional-dashboard" dir="rtl">
  
  <!-- Top Header Bar -->
  <header class="dashboard-header">
    <div class="header-left">
      <div class="logo-section">
        <div class="logo-icon">📊</div>
        <h1 class="dashboard-title">نظرة عامة على نظام العدادات</h1>
        <span class="report-type">(تقرير العالم الأزرق)</span>
      </div>
    </div>
    
    <div class="header-right">
      <button class="header-btn">
        <span>🔄</span>
        تحديث البيانات
      </button>
      <button class="header-btn">
        <span>📤</span>
        تصدير
      </button>
      <button class="header-btn">
        <span>👤</span>
        الملف الشخصي
      </button>
      <button class="menu-btn">⋯</button>
    </div>
  </header>

  <div class="dashboard-body">
    
    <!-- Left Sidebar -->
    <aside class="sidebar" class:collapsed={!showSidebar}>
      <div class="sidebar-header">
        <h3>التجميع الافتراضي للقنوات</h3>
      </div>
      
      <div class="sidebar-content">
        <div class="metric-group">
          <div class="metric-item selected">
            <span class="metric-label">مباشر</span>
            <span class="metric-value">24.504</span>
            <span class="metric-percent">74.504%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">البحث المدفوع</span>
            <span class="metric-value">8.012</span>
            <span class="metric-percent">24.4%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">الشراكات</span>
            <span class="metric-value">147</span>
            <span class="metric-percent">0.4%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">العرض</span>
            <span class="metric-value">81</span>
            <span class="metric-percent">0.2%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">(أخرى)</span>
            <span class="metric-value">17</span>
            <span class="metric-percent">0.1%</span>
          </div>
        </div>
        
        <div class="total-row">
          <span class="total-label">المجموع</span>
          <span class="total-value">83.741</span>
          <span class="total-sessions">17.837.1</span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      
      <!-- Top Metrics Row -->
      <div class="metrics-row">
        <div class="primary-metric-card">
          <div class="metric-header">
            <h2>الجلسات</h2>
            <div class="metric-controls">
              <select bind:value={selectedDateRange} class="date-selector">
                {#each dateRanges as range}
                  <option value={range}>{range}</option>
                {/each}
              </select>
              <button class="chart-icon">📊</button>
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
          
          <!-- Trend Chart Area -->
          <div class="trend-chart">
            {#if org}
              <svg class="mini-chart" viewBox="0 0 300 60">
                <!-- Grid lines -->
                <defs>
                  <pattern id="grid-pattern" width="30" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 20" fill="none" stroke="rgba(66, 133, 244, 0.1)" stroke-width="1"/>
                  </pattern>
                </defs>
                <rect width="300" height="60" fill="url(#grid-pattern)" />
                
                <!-- Trend line -->
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
              
              <!-- Chart Labels -->
              <div class="chart-labels">
                <span>25 سبت</span>
                <span>28 سبت</span>
                <span>29 سبت</span>
                <span>2 أكت</span>
                <span>5 أكت</span>
                <span>8 أكت</span>
                <span>11 أكت</span>
                <span>14 أكت</span>
                <span>17 أكت</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        
        <!-- Left Column: Bar Chart -->
        <div class="chart-widget">
          <div class="widget-header">
            <div class="widget-controls">
              <span class="legend-item">
                <span class="legend-dot users"></span>
                المستخدمون
              </span>
              <span class="legend-item">
                <span class="legend-dot paid-search"></span>
                البحث المدفوع
              </span>
              <span class="legend-item">
                <span class="legend-dot affiliates"></span>
                الشراكات
              </span>
              <span class="legend-item">
                <span class="legend-dot display"></span>
                العرض
              </span>
            </div>
            <div class="widget-actions">
              <button class="action-btn">📊</button>
              <button class="action-btn">⚙️</button>
              <button class="action-btn">⋯</button>
            </div>
          </div>
          
          <div class="bar-chart">
            {#if org}
              <svg class="chart-svg" viewBox="0 0 300 200">
                <!-- Y-axis labels -->
                <text x="15" y="20" class="axis-label">6 مل</text>
                <text x="15" y="60" class="axis-label">4 مل</text>
                <text x="15" y="100" class="axis-label">2 مل</text>
                <text x="15" y="140" class="axis-label">0</text>
                
                <!-- Bars -->
                {#each org.divisions as division, i}
                  <rect 
                    x={30 + i * 35} 
                    y={140 - (division.totalRealTimeCount / Math.max(...org.divisions.map(d => d.totalRealTimeCount))) * 120}
                    width="25" 
                    height={(division.totalRealTimeCount / Math.max(...org.divisions.map(d => d.totalRealTimeCount))) * 120}
                    fill="#4285f4"
                    opacity="0.8"
                  />
                {/each}
                
                <!-- X-axis -->
                <line x1="25" y1="145" x2="275" y2="145" stroke="#e0e0e0" stroke-width="1"/>
              </svg>
            {/if}
          </div>
        </div>

        <!-- Center: World Map -->
        <div class="map-widget">
          <div class="widget-header">
            <div class="widget-title">الدول</div>
            <div class="widget-actions">
              <button class="action-btn">🔍</button>
              <button class="action-btn">🌐</button>
            </div>
          </div>
          
          <div class="world-map">
            <!-- Simplified world map with Arabic regions -->
            <svg class="map-svg" viewBox="0 0 400 200">
              <!-- Background -->
              <rect width="400" height="200" fill="#1a237e" opacity="0.1"/>
              
              <!-- Continents (simplified shapes) -->
              <!-- North America -->
              <path d="M50 40 L100 20 L120 60 L90 80 L50 70 Z" fill="#4285f4" opacity="0.6" />
              <text x="75" y="55" class="map-label">أمريكا الشمالية</text>
              
              <!-- Europe -->
              <path d="M150 30 L180 25 L185 50 L160 55 L150 45 Z" fill="#34a853" opacity="0.7" />
              <text x="167" y="45" class="map-label">أوروبا</text>
              
              <!-- Asia -->
              <path d="M200 20 L300 15 L320 40 L290 60 L200 50 Z" fill="#ea4335" opacity="0.6" />
              <text x="250" y="40" class="map-label">آسيا</text>
              
              <!-- Africa -->
              <path d="M160 60 L200 65 L190 120 L170 115 Z" fill="#fbbc04" opacity="0.5" />
              <text x="180" y="90" class="map-label">أفريقيا</text>
              
              <!-- Australia -->
              <path d="M280 120 L320 125 L315 145 L285 140 Z" fill="#9c27b0" opacity="0.5" />
              <text x="300" y="135" class="map-label">أستراليا</text>
              
              <!-- Active indicators -->
              <circle cx="75" cy="50" r="3" fill="#fff" opacity="0.8"/>
              <circle cx="167" cy="40" r="2" fill="#fff" opacity="0.8"/>
              <circle cx="250" cy="35" r="4" fill="#fff" opacity="0.8"/>
              <circle cx="180" cy="85" r="2" fill="#fff" opacity="0.8"/>
            </svg>
          </div>
        </div>

        <!-- Right Column: Data Table -->
        <div class="table-widget">
          <div class="widget-header">
            <div class="widget-title">عنوان الصفحة</div>
            <div class="sessions-header">الجلسات ↓</div>
            <div class="widget-actions">
              <button class="action-btn">📊</button>
              <button class="action-btn">📤</button>
              <button class="action-btn">⋯</button>
            </div>
          </div>
          
          <div class="data-table">
            <div class="table-row header-row">
              <span class="page-title">الصفحة</span>
              <span class="sessions-count">الجلسات</span>
            </div>
            
            {#if org}
              {#each org.divisions as division, i}
                <div class="table-row">
                  <span class="page-title">{division.name}</span>
                  <span class="sessions-count">{division.totalRealTimeCount.toLocaleString('ar-SA')}</span>
                </div>
              {/each}
              
              {#each org.divisions as division}
                {#each division.locations.slice(0, 2) as location}
                  <div class="table-row">
                    <span class="page-title">{location.name}</span>
                    <span class="sessions-count">{location.totalRealTimeCount.toLocaleString('ar-SA')}</span>
                  </div>
                {/each}
              {/each}
            {:else}
              <div class="table-row">
                <span class="page-title">الرئيسية</span>
                <span class="sessions-count">27.351</span>
              </div>
              <div class="table-row">
                <span class="page-title">متجر العلامة التجارية</span>
                <span class="sessions-count">4.333</span>
              </div>
              <div class="table-row">
                <span class="page-title">الملابس | متجر البضائع من Google</span>
                <span class="sessions-count">3.365</span>
              </div>
              <div class="table-row">
                <span class="page-title">الرجال | الملابس | متجر البضائع من Google</span>
                <span class="sessions-count">5.054</span>
              </div>
              <div class="table-row">
                <span class="page-title">أكياس المتجر</span>
                <span class="sessions-count">4.349</span>
              </div>
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

      <!-- Bottom Row: Country/Location Stats -->
      <div class="bottom-widgets">
        <div class="country-stats">
          <div class="widget-header">
            <div class="widget-title">الدولة</div>
            <div class="sessions-header">الجلسات ↓</div>
            <div class="widget-actions">
              <button class="action-btn">📊</button>
              <button class="action-btn">🔽</button>
              <button class="action-btn">⋯</button>
            </div>
          </div>
          
          <div class="country-list">
            <div class="country-item">
              <span class="country-name">المملكة العربية السعودية</span>
              <span class="country-sessions">53.532</span>
            </div>
            <div class="country-item">
              <span class="country-name">الهند</span>
              <span class="country-sessions">5.714</span>
            </div>
            <div class="country-item">
              <span class="country-name">المملكة المتحدة</span>
              <span class="country-sessions">4.836</span>
            </div>
            <div class="country-item">
              <span class="country-name">كندا</span>
              <span class="country-sessions">4.770</span>
            </div>
            <div class="country-item">
              <span class="country-name">فرنسا</span>
              <span class="country-sessions">3.808</span>
            </div>
            <div class="country-item">
              <span class="country-name">تايوان</span>
              <span class="country-sessions">1.948</span>
            </div>
            <div class="country-item">
              <span class="country-name">اليابان</span>
              <span class="country-sessions">1.419</span>
            </div>
            <div class="country-item">
              <span class="country-name">إندونيسيا</span>
              <span class="country-sessions">1.356</span>
            </div>
            <div class="country-item">
              <span class="country-name">إسبانيا</span>
              <span class="country-sessions">1.337</span>
            </div>
            <div class="country-item total-row">
              <span class="country-name">المجموع</span>
              <span class="country-sessions">83.740</span>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>

  <!-- Footer -->
  <footer class="dashboard-footer">
    <div class="footer-left">
      <span>نشاط في الوقت الحقيقي خلال الـ 30 دقيقة الماضية: لا توجد بيانات</span>
    </div>
    <div class="footer-right">
      <span>آخر تحديث: {formatTime()}</span>
    </div>
  </footer>

</div>

<style>
  .professional-dashboard {
    min-height: 100vh;
    background: #ffffff;
    color: #202124;
    font-family: 'Google Sans', 'Roboto', Arial, sans-serif;
    direction: rtl;
  }
  
  /* Header Styles */
  .dashboard-header {
    height: 64px;
    background: #ffffff;
    border-bottom: 1px solid #dadce0;
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
    color: #202124;
  }
  
  .report-type {
    font-size: 14px;
    color: #5f6368;
    margin-right: 8px;
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
    background: #f8f9fa;
    border: 1px solid #dadce0;
    border-radius: 4px;
    color: #3c4043;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }
  
  .header-btn:hover {
    background: #f1f3f4;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  
  .menu-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    color: #5f6368;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .menu-btn:hover {
    background: #f1f3f4;
  }
  
  /* Dashboard Body */
  .dashboard-body {
    display: flex;
    min-height: calc(100vh - 64px);
  }
  
  /* Sidebar */
  .sidebar {
    width: 280px;
    background: #1a237e;
    color: white;
    padding: 0;
    transition: width 0.3s ease;
  }
  
  .sidebar.collapsed {
    width: 60px;
  }
  
  .sidebar-header {
    padding: 24px 20px 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  
  .sidebar-header h3 {
    font-size: 16px;
    font-weight: 500;
    margin: 0;
    color: #fff;
  }
  
  .sidebar-content {
    padding: 20px;
  }
  
  .metric-group {
    margin-bottom: 24px;
  }
  
  .metric-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 14px;
  }
  
  .metric-item.selected {
    background: rgba(255, 255, 255, 0.1);
    margin: 0 -20px;
    padding: 8px 20px;
    border-left: 4px solid #4285f4;
  }
  
  .metric-label {
    color: rgba(255, 255, 255, 0.87);
  }
  
  .metric-value {
    color: white;
    font-weight: 500;
  }
  
  .metric-percent {
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    min-width: 50px;
    text-align: left;
  }
  
  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 16px 0 8px 0;
    border-top: 2px solid rgba(255, 255, 255, 0.2);
    margin-top: 16px;
    font-weight: 600;
  }
  
  .total-label, .total-value, .total-sessions {
    color: white;
  }
  
  /* Main Content */
  .main-content {
    flex: 1;
    padding: 24px;
    background: #fafafa;
  }
  
  /* Metrics Row */
  .metrics-row {
    margin-bottom: 24px;
  }
  
  .primary-metric-card {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid #dadce0;
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
    color: #202124;
  }
  
  .metric-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .date-selector {
    padding: 6px 12px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    color: #3c4043;
  }
  
  .chart-icon {
    padding: 6px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
  }
  
  .metric-main {
    margin-bottom: 24px;
  }
  
  .big-number {
    font-size: 48px;
    font-weight: 400;
    color: #202124;
    line-height: 1;
    margin-bottom: 8px;
  }
  
  .metric-subtitle {
    font-size: 14px;
    color: #34a853;
    display: flex;
    align-items: center;
    gap: 4px;
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
    color: #5f6368;
  }
  
  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
  }
  
  /* Widget Styles */
  .chart-widget, .map-widget, .table-widget {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid #dadce0;
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
    color: #5f6368;
  }
  
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
  
  .legend-dot.users { background: #4285f4; }
  .legend-dot.paid-search { background: #34a853; }
  .legend-dot.affiliates { background: #ea4335; }
  .legend-dot.display { background: #fbbc04; }
  
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
    color: #5f6368;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .action-btn:hover {
    background: #f1f3f4;
  }
  
  /* Bar Chart */
  .bar-chart {
    height: 200px;
  }
  
  .chart-svg {
    width: 100%;
    height: 100%;
  }
  
  .axis-label {
    font-size: 12px;
    fill: #5f6368;
  }
  
  /* World Map */
  .world-map {
    height: 200px;
  }
  
  .map-svg {
    width: 100%;
    height: 100%;
  }
  
  .map-label {
    font-size: 10px;
    fill: white;
    text-anchor: middle;
  }
  
  /* Data Table */
  .widget-title {
    font-size: 14px;
    font-weight: 500;
    color: #202124;
  }
  
  .sessions-header {
    font-size: 14px;
    font-weight: 500;
    color: #202124;
  }
  
  .data-table {
    font-size: 14px;
  }
  
  .table-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f1f3f4;
  }
  
  .table-row.header-row {
    font-weight: 500;
    color: #5f6368;
    border-bottom: 2px solid #dadce0;
  }
  
  .table-row.total-row {
    border-top: 2px solid #dadce0;
    font-weight: 600;
    background: #f8f9fa;
    margin: 0 -20px;
    padding: 12px 20px;
  }
  
  .page-title {
    color: #1a0dab;
    text-decoration: none;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .page-title:hover {
    text-decoration: underline;
  }
  
  .sessions-count {
    color: #202124;
    font-weight: 400;
    min-width: 60px;
    text-align: left;
  }
  
  /* Bottom Widgets */
  .bottom-widgets {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid #dadce0;
  }
  
  .country-stats {
    padding: 20px;
  }
  
  .country-list {
    font-size: 14px;
  }
  
  .country-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f1f3f4;
  }
  
  .country-item.total-row {
    border-top: 2px solid #dadce0;
    font-weight: 600;
    background: #f8f9fa;
    margin: 0 -20px;
    padding: 12px 20px;
  }
  
  .country-name {
    color: #202124;
  }
  
  .country-sessions {
    color: #202124;
    font-weight: 400;
  }
  
  /* Footer */
  .dashboard-footer {
    height: 40px;
    background: #f8f9fa;
    border-top: 1px solid #dadce0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    font-size: 12px;
    color: #5f6368;
  }
  
  /* Responsive */
  @media (max-width: 1200px) {
    .content-grid {
      grid-template-columns: 1fr 1fr;
    }
    
    .sidebar {
      width: 240px;
    }
  }
  
  @media (max-width: 768px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
    
    .sidebar {
      width: 200px;
    }
    
    .dashboard-header {
      padding: 0 16px;
    }
    
    .main-content {
      padding: 16px;
    }
  }
</style>