<script lang="ts">
  import { currentLocation, organization, navigateToEntity } from '../stores/organization';
  import Chart from './Chart.svelte';
  
  $: location = $currentLocation;
  $: org = $organization;
  
  function getOccupancyColor(rate: number): string {
    if (rate < 50) return '#10b981';
    if (rate < 75) return '#f59e0b';
    return '#ef4444';
  }
  
  function getDivisionName(): string {
    if (!org || !location) return '';
    for (const division of org.divisions) {
      if (division.locations.some(loc => loc.id === location.id)) {
        return division.name;
      }
    }
    return '';
  }
  
  function goToDivision() {
    if (!org || !location) return;
    for (const division of org.divisions) {
      if (division.locations.some(loc => loc.id === location.id)) {
        navigateToEntity('division', division.id);
        break;
      }
    }
  }
  
  function goToOrganization() {
    navigateToEntity('organization', '');
  }
</script>

{#if location}
  <div class="location-view">
    <header class="view-header">
      <div class="breadcrumb">
        <button on:click={goToOrganization} class="breadcrumb-link">Organization</button>
        <span class="separator">/</span>
        <button on:click={goToDivision} class="breadcrumb-link">{getDivisionName()}</button>
        <span class="separator">/</span>
        <span class="current">{location.name}</span>
      </div>
      <div class="header-stats">
        <div class="stat-badge live">
          <span class="live-indicator"></span>
          Live Data
        </div>
      </div>
    </header>

    <!-- Location Summary -->
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Current Occupancy</h3>
        <div class="big-number" style="color: {getOccupancyColor(location.maxCapacity ? (location.totalRealTimeCount / location.maxCapacity) * 100 : 0)}">
          {location.totalRealTimeCount.toLocaleString()}
        </div>
        <div class="subtext">
          {location.maxCapacity ? ((location.totalRealTimeCount / location.maxCapacity) * 100).toFixed(1) : 0}% of {location.maxCapacity?.toLocaleString() || 0} capacity
        </div>
      </div>
      
      <div class="summary-card">
        <h3>Location Details</h3>
        <div class="location-details">
          {#if location.address}
            <div class="detail-item">
              <span class="label">Address:</span>
              <span class="value">{location.address}</span>
            </div>
          {/if}
          <div class="detail-item">
            <span class="label">Floors:</span>
            <span class="value">{location.floors.length}</span>
          </div>
          <div class="detail-item">
            <span class="label">Total Cameras:</span>
            <span class="value">{location.floors.reduce((sum, floor) => sum + floor.cameras.length, 0)}</span>
          </div>
          <div class="detail-item">
            <span class="label">Peak Today:</span>
            <span class="value">{location.analytics.peakOccupancy}</span>
          </div>
        </div>
      </div>
      
      <div class="summary-card">
        <h3>Active Alerts</h3>
        <div class="alerts-summary">
          {#if location.alerts.filter(a => !a.acknowledged).length === 0}
            <div class="no-alerts">
              <span class="checkmark">✓</span>
              All systems normal
            </div>
          {:else}
            <div class="alert-count critical">{location.alerts.filter(a => !a.acknowledged).length}</div>
            <div class="alert-details">
              {location.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length} Critical
              {location.alerts.filter(a => a.severity === 'high' && !a.acknowledged).length} High
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- Trends Chart -->
      <div class="chart-section">
        <Chart 
          data={location.analytics.trends} 
          title="Location Occupancy Trends"
          height={250}
          color="#3b82f6"
        />
      </div>
      
      <!-- Floor Comparison Chart -->
      <div class="comparison-chart">
        <h3>Floor Comparison</h3>
        <div class="comparison-bars">
          {#each location.analytics.floorComparison as floor}
            <div class="comparison-bar">
              <div class="bar-label">{floor.floorName}</div>
              <div class="bar-container">
                <div 
                  class="bar-fill" 
                  style="width: {(floor.occupancy / Math.max(...location.analytics.floorComparison.map(f => f.occupancy))) * 100}%; background: {getOccupancyColor((floor.occupancy / 100) * 100)}"
                ></div>
                <span class="bar-value">{floor.occupancy}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Floors Grid -->
    <div class="floors-section">
      <h3>Floors & Zones</h3>
      <div class="floors-grid">
        {#each location.floors as floor}
          <div 
            class="floor-card"
            on:click={() => navigateToEntity('floor', floor.id)}
            on:keydown={(e) => e.key === 'Enter' && navigateToEntity('floor', floor.id)}
            role="button"
            tabindex="0"
          >
            <div class="floor-header">
              <h4>{floor.name}</h4>
              {#if floor.alerts.filter(a => !a.acknowledged).length > 0}
                <div class="alert-badge">
                  {floor.alerts.filter(a => !a.acknowledged).length}
                </div>
              {/if}
            </div>
            
            {#if floor.description}
              <div class="floor-description">{floor.description}</div>
            {/if}
            
            <div class="floor-stats">
              <div class="stat-group">
                <div class="stat">
                  <span class="value">{floor.totalRealTimeCount}</span>
                  <span class="label">Current</span>
                </div>
                <div class="stat">
                  <span class="value" style="color: {getOccupancyColor(floor.maxCapacity ? (floor.totalRealTimeCount / floor.maxCapacity) * 100 : 0)}">
                    {floor.maxCapacity ? ((floor.totalRealTimeCount / floor.maxCapacity) * 100).toFixed(1) : 0}%
                  </span>
                  <span class="label">Capacity</span>
                </div>
              </div>
              
              <div class="stat-group">
                <div class="stat">
                  <span class="value">{floor.cameras.length}</span>
                  <span class="label">Cameras</span>
                </div>
                <div class="stat">
                  <span class="value">{floor.analytics.peakOccupancy}</span>
                  <span class="label">Peak</span>
                </div>
              </div>
            </div>
            
            <!-- Floor Camera Status -->
            <div class="camera-status">
              <h5>Camera Status</h5>
              <div class="camera-indicators">
                {#each floor.cameras as camera}
                  <div 
                    class="camera-indicator {camera.status}"
                    title="{camera.name} - {camera.status}"
                  >
                    <div class="camera-dot"></div>
                  </div>
                {/each}
              </div>
            </div>
            
            <!-- Mini trend chart -->
            <div class="mini-chart">
              <Chart 
                data={floor.analytics.trends.slice(-8)} 
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
    <p>Location not found</p>
    <button on:click={goToOrganization} class="back-button">Back to Organization</button>
  </div>
{/if}

<style>
  .location-view {
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
  
  .location-details {
    display: grid;
    gap: 8px;
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
  }
  
  .detail-item .label {
    font-size: 12px;
    color: #6b7280;
  }
  
  .detail-item .value {
    font-weight: 600;
    color: #111827;
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
    min-width: 80px;
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
  
  .floors-section h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }
  
  .floors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
  }
  
  .floor-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;
  }
  
  .floor-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  
  .floor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .floor-header h4 {
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
  
  .floor-description {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 16px;
  }
  
  .floor-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  
  .stat-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
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
  
  .camera-status {
    margin-bottom: 16px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
  }
  
  .camera-status h5 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
  }
  
  .camera-indicators {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .camera-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    cursor: help;
  }
  
  .camera-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
  }
  
  .camera-indicator.online .camera-dot {
    background: #10b981;
  }
  
  .camera-indicator.offline .camera-dot {
    background: #dc2626;
  }
  
  .camera-indicator.maintenance .camera-dot {
    background: #f59e0b;
  }
  
  .camera-indicator:hover .camera-dot {
    transform: scale(1.2);
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
    
    .floors-grid {
      grid-template-columns: 1fr;
    }
    
    .floor-stats {
      grid-template-columns: 1fr;
    }
    
    .stat-group {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>