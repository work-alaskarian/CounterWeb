<script lang="ts">
  import { organization, organizationSummary, criticalAlerts, navigateToEntity } from '../stores/organization';
  import Chart from './Chart.svelte';
  
  $: summary = $organizationSummary;
  $: alerts = $criticalAlerts;
  $: org = $organization;
  
  function getOccupancyColor(rate: number): string {
    if (rate < 50) return '#10b981';
    if (rate < 75) return '#f59e0b';
    return '#ef4444';
  }
  
  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      default: return '#65a30d';
    }
  }
</script>

<div class="dashboard">
  <header class="dashboard-header">
    <h1>{org?.name || 'Organization'}</h1>
    <div class="header-stats">
      <div class="stat-badge live">
        <span class="live-indicator"></span>
        Live Data
      </div>
      <div class="update-time">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  </header>

  {#if summary}
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Occupancy</h3>
        <div class="big-number" style="color: {getOccupancyColor(summary.occupancyRate)}">
          {summary.totalRealTimeCount.toLocaleString()}
        </div>
        <div class="subtext">
          {summary.occupancyRate.toFixed(1)}% of {summary.maxCapacity.toLocaleString()} capacity
        </div>
      </div>
      
      <div class="summary-card">
        <h3>Infrastructure</h3>
        <div class="infrastructure-stats">
          <div class="infra-item">
            <span class="count">{summary.totalDivisions}</span>
            <span>Divisions</span>
          </div>
          <div class="infra-item">
            <span class="count">{summary.totalLocations}</span>
            <span>Locations</span>
          </div>
          <div class="infra-item">
            <span class="count">{summary.totalFloors}</span>
            <span>Floors</span>
          </div>
          <div class="infra-item">
            <span class="count">{summary.totalCameras}</span>
            <span>Cameras</span>
          </div>
        </div>
      </div>
      
      <div class="summary-card">
        <h3>Active Alerts</h3>
        <div class="alerts-summary">
          {#if alerts.length === 0}
            <div class="no-alerts">
              <span class="checkmark">✓</span>
              All systems normal
            </div>
          {:else}
            <div class="alert-count critical">{alerts.length}</div>
            <div class="alert-details">
              {alerts.filter(a => a.severity === 'critical').length} Critical
              {alerts.filter(a => a.severity === 'high').length} High
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if org}
    <div class="content-grid">
      <!-- Trends Chart -->
      <div class="chart-section">
        <Chart 
          data={org.analytics.trends} 
          title="Organization-wide Occupancy Trends"
          height={250}
          color="#3b82f6"
        />
      </div>
      
      <!-- Division Comparison -->
      <div class="division-grid">
        <h3>Division Overview</h3>
        <div class="divisions">
          {#each org.divisions as division}
            <div 
              class="division-card"
              on:click={() => navigateToEntity('division', division.id)}
              on:keydown={(e) => e.key === 'Enter' && navigateToEntity('division', division.id)}
              role="button"
              tabindex="0"
            >
              <h4>{division.name}</h4>
              <div class="division-stats">
                <div class="occupancy">
                  <span class="count">{division.totalRealTimeCount}</span>
                  <span class="label">Current</span>
                </div>
                <div class="capacity">
                  <span class="percentage" style="color: {getOccupancyColor(division.maxCapacity ? (division.totalRealTimeCount / division.maxCapacity) * 100 : 0)}">
                    {division.maxCapacity ? ((division.totalRealTimeCount / division.maxCapacity) * 100).toFixed(1) : 0}%
                  </span>
                  <span class="label">Capacity</span>
                </div>
                <div class="locations">
                  <span class="count">{division.locations.length}</span>
                  <span class="label">Locations</span>
                </div>
              </div>
              {#if division.alerts.filter(a => !a.acknowledged).length > 0}
                <div class="alert-badge">
                  {division.alerts.filter(a => !a.acknowledged).length}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Recent Alerts -->
  {#if alerts.length > 0}
    <div class="alerts-section">
      <h3>Critical Alerts</h3>
      <div class="alerts-list">
        {#each alerts.slice(0, 5) as alert}
          <div class="alert-item" style="border-left-color: {getSeverityColor(alert.severity)}">
            <div class="alert-content">
              <div class="alert-message">{alert.message}</div>
              <div class="alert-meta">
                {alert.entityType}: {alert.entityId} • 
                {alert.timestamp.toLocaleTimeString()}
              </div>
            </div>
            <div class="alert-severity {alert.severity}">
              {alert.severity.toUpperCase()}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    background: #f8fafc;
    min-height: 100vh;
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .dashboard-header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }
  
  .header-stats {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .stat-badge.live {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #10b981;
    color: white;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }
  
  .live-indicator {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .update-time {
    font-size: 12px;
    color: #6b7280;
  }
  
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  
  .summary-card {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .summary-card h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .big-number {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  
  .subtext {
    font-size: 14px;
    color: #6b7280;
  }
  
  .infrastructure-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .infra-item {
    text-align: center;
  }
  
  .infra-item .count {
    display: block;
    font-size: 20px;
    font-weight: 700;
    color: #111827;
  }
  
  .infra-item span:last-child {
    font-size: 12px;
    color: #6b7280;
  }
  
  .alerts-summary {
    text-align: center;
  }
  
  .no-alerts {
    color: #10b981;
    font-weight: 600;
  }
  
  .checkmark {
    font-size: 24px;
    display: block;
    margin-bottom: 8px;
  }
  
  .alert-count {
    font-size: 32px;
    font-weight: 700;
    color: #dc2626;
  }
  
  .alert-details {
    font-size: 14px;
    color: #6b7280;
    margin-top: 4px;
  }
  
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
  }
  
  .chart-section {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .division-grid h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }
  
  .divisions {
    display: grid;
    gap: 12px;
  }
  
  .division-card {
    position: relative;
    background: white;
    padding: 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .division-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  
  .division-card h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }
  
  .division-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  
  .division-stats > div {
    text-align: center;
  }
  
  .division-stats .count {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
  }
  
  .division-stats .percentage {
    display: block;
    font-size: 18px;
    font-weight: 700;
  }
  
  .division-stats .label {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
  }
  
  .alert-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #dc2626;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
  }
  
  .alerts-section {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .alerts-section h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }
  
  .alerts-list {
    display: grid;
    gap: 8px;
  }
  
  .alert-item {
    display: flex;
    padding: 12px;
    background: #f9fafb;
    border-radius: 6px;
    border-left: 4px solid;
  }
  
  .alert-content {
    flex: 1;
  }
  
  .alert-message {
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
  }
  
  .alert-meta {
    font-size: 12px;
    color: #6b7280;
  }
  
  .alert-severity {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    align-self: flex-start;
  }
  
  .alert-severity.critical {
    background: #fef2f2;
    color: #dc2626;
  }
  
  .alert-severity.high {
    background: #fff7ed;
    color: #ea580c;
  }
  
  @media (max-width: 768px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
    
    .summary-grid {
      grid-template-columns: 1fr;
    }
    
    .dashboard {
      padding: 16px;
    }
    
    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }
</style>