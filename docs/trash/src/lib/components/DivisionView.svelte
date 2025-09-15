<script lang="ts">
  import { currentDivision, navigateToEntity } from '../stores/organization';
  import Chart from './Chart.svelte';
  
  $: division = $currentDivision;
  
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
  
  function goBack() {
    navigateToEntity('organization', '');
  }
</script>

{#if division}
  <div class="division-view">
    <header class="view-header">
      <div class="breadcrumb">
        <button on:click={goBack} class="breadcrumb-link">Organization</button>
        <span class="separator">/</span>
        <span class="current">{division.name}</span>
      </div>
      <div class="header-stats">
        <div class="stat-badge live">
          <span class="live-indicator"></span>
          Live Data
        </div>
      </div>
    </header>

    <!-- Division Summary -->
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Current Occupancy</h3>
        <div class="big-number" style="color: {getOccupancyColor(division.maxCapacity ? (division.totalRealTimeCount / division.maxCapacity) * 100 : 0)}">
          {division.totalRealTimeCount.toLocaleString()}
        </div>
        <div class="subtext">
          {division.maxCapacity ? ((division.totalRealTimeCount / division.maxCapacity) * 100).toFixed(1) : 0}% of {division.maxCapacity?.toLocaleString() || 0} capacity
        </div>
      </div>
      
      <div class="summary-card">
        <h3>Division Stats</h3>
        <div class="division-stats">
          <div class="stat-item">
            <span class="count">{division.locations.length}</span>
            <span>Locations</span>
          </div>
          <div class="stat-item">
            <span class="count">{division.locations.reduce((sum, loc) => sum + loc.floors.length, 0)}</span>
            <span>Floors</span>
          </div>
          <div class="stat-item">
            <span class="count">{division.locations.reduce((sum, loc) => sum + loc.floors.reduce((floorSum, floor) => floorSum + floor.cameras.length, 0), 0)}</span>
            <span>Cameras</span>
          </div>
          <div class="stat-item">
            <span class="count">{division.analytics.peakOccupancy}</span>
            <span>Peak Today</span>
          </div>
        </div>
      </div>
      
      <div class="summary-card">
        <h3>Active Alerts</h3>
        <div class="alerts-summary">
          {#if division.alerts.filter(a => !a.acknowledged).length === 0}
            <div class="no-alerts">
              <span class="checkmark">✓</span>
              All systems normal
            </div>
          {:else}
            <div class="alert-count critical">{division.alerts.filter(a => !a.acknowledged).length}</div>
            <div class="alert-details">
              {division.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length} Critical
              {division.alerts.filter(a => a.severity === 'high' && !a.acknowledged).length} High
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- Trends Chart -->
      <div class="chart-section">
        <Chart 
          data={division.analytics.trends} 
          title="Division Occupancy Trends"
          height={250}
          color="#3b82f6"
        />
      </div>
      
      <!-- Location Comparison Chart -->
      <div class="comparison-chart">
        <h3>Location Comparison</h3>
        <div class="comparison-bars">
          {#each division.analytics.locationComparison as location}
            <div class="comparison-bar">
              <div class="bar-label">{location.locationName}</div>
              <div class="bar-container">
                <div 
                  class="bar-fill" 
                  style="width: {(location.occupancy / Math.max(...division.analytics.locationComparison.map(l => l.occupancy))) * 100}%; background: {getOccupancyColor((location.occupancy / 100) * 100)}"
                ></div>
                <span class="bar-value">{location.occupancy}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Locations Grid -->
    <div class="locations-section">
      <h3>Locations</h3>
      <div class="locations-grid">
        {#each division.locations as location}
          <div 
            class="location-card"
            on:click={() => navigateToEntity('location', location.id)}
            on:keydown={(e) => e.key === 'Enter' && navigateToEntity('location', location.id)}
            role="button"
            tabindex="0"
          >
            <div class="location-header">
              <h4>{location.name}</h4>
              {#if location.alerts.filter(a => !a.acknowledged).length > 0}
                <div class="alert-badge">
                  {location.alerts.filter(a => !a.acknowledged).length}
                </div>
              {/if}
            </div>
            
            {#if location.address}
              <div class="location-address">{location.address}</div>
            {/if}
            
            <div class="location-stats">
              <div class="stat">
                <span class="value">{location.totalRealTimeCount}</span>
                <span class="label">Current</span>
              </div>
              <div class="stat">
                <span class="value" style="color: {getOccupancyColor(location.maxCapacity ? (location.totalRealTimeCount / location.maxCapacity) * 100 : 0)}">
                  {location.maxCapacity ? ((location.totalRealTimeCount / location.maxCapacity) * 100).toFixed(1) : 0}%
                </span>
                <span class="label">Capacity</span>
              </div>
              <div class="stat">
                <span class="value">{location.floors.length}</span>
                <span class="label">Floors</span>
              </div>
              <div class="stat">
                <span class="value">{location.floors.reduce((sum, floor) => sum + floor.cameras.length, 0)}</span>
                <span class="label">Cameras</span>
              </div>
            </div>
            
            <!-- Mini trend chart -->
            <div class="mini-chart">
              <Chart 
                data={location.analytics.trends.slice(-8)} 
                height={60}
                color="#6b7280"
                showGrid={false}
              />
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{:else}
  <div class="no-data">
    <p>Division not found</p>
    <button on:click={goBack} class="back-button">Back to Organization</button>
  </div>
{/if}

<style>
  .division-view {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .breadcrumb-link {
    color: #3b82f6;
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
  }
  
  .breadcrumb-link:hover {
    text-decoration: underline;
  }
  
  .separator {
    color: #6b7280;
  }
  
  .current {
    font-weight: 600;
    font-size: 18px;
    color: #111827;
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
  
  .division-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .stat-item {
    text-align: center;
  }
  
  .stat-item .count {
    display: block;
    font-size: 20px;
    font-weight: 700;
    color: #111827;
  }
  
  .stat-item span:last-child {
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
    padding: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .comparison-chart {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .comparison-chart h3 {
    margin: 0 0 20px 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }
  
  .comparison-bars {
    display: grid;
    gap: 12px;
  }
  
  .comparison-bar {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .bar-label {
    min-width: 100px;
    font-size: 12px;
    color: #6b7280;
  }
  
  .bar-container {
    flex: 1;
    position: relative;
    height: 24px;
    background: #f3f4f6;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }
  
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  .bar-value {
    position: absolute;
    right: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
  }
  
  .locations-section h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }
  
  .locations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
  }
  
  .location-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;
  }
  
  .location-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  
  .location-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .location-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }
  
  .alert-badge {
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
  
  .location-address {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 16px;
  }
  
  .location-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .stat {
    text-align: center;
  }
  
  .stat .value {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #111827;
  }
  
  .stat .label {
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
  }
  
  .mini-chart {
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
  }
  
  .no-data {
    text-align: center;
    padding: 60px 20px;
  }
  
  .back-button {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 16px;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @media (max-width: 768px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
    
    .summary-grid {
      grid-template-columns: 1fr;
    }
    
    .locations-grid {
      grid-template-columns: 1fr;
    }
    
    .location-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>