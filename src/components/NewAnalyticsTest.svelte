<script>
  import { onMount, onDestroy } from 'svelte';
  import { 
    locations, 
    connectionStatus,
    setupRealTimeUpdates,
    loadLocations,
    getRealtimeCount,
    getLocationsForFiltering,
    getCamerasForFiltering,
    addActivity,
    addCamera
  } from '../lib/stores/analytics.js';

  let unsubscribe;
  let realtimeData = {};
  let locationsForFiltering = [];
  let camerasForFiltering = [];
  let testLog = [];
  let selectedLocation = null;

  function addLog(message) {
    testLog = [...testLog, { 
      time: new Date().toLocaleTimeString(), 
      message 
    }];
  }

  onMount(async () => {
    addLog('🚀 Starting new analytics system test');
    
    // Setup real-time updates
    unsubscribe = setupRealTimeUpdates();
    addLog('✅ Real-time updates setup complete');

    // Load initial data
    await loadLocations();
    addLog(`📍 Loaded ${$locations.length} locations`);

    // Test new endpoints
    await testNewEndpoints();
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  async function testNewEndpoints() {
    try {
      // Test locations for filtering
      locationsForFiltering = await getLocationsForFiltering();
      addLog(`🔍 Filtering: ${locationsForFiltering.length} locations available`);

      if (locationsForFiltering.length > 0) {
        selectedLocation = locationsForFiltering[0].location_id;
        
        // Test cameras for filtering
        camerasForFiltering = await getCamerasForFiltering(selectedLocation);
        addLog(`📹 Filtering: ${camerasForFiltering.length} cameras for ${selectedLocation}`);

        // Test real-time count
        const realtime = await getRealtimeCount(selectedLocation);
        realtimeData = realtime;
        addLog(`📊 Real-time count for ${selectedLocation}: ${realtime.total_count}`);
      }

    } catch (error) {
      addLog(`❌ Error testing endpoints: ${error.message}`);
    }
  }

  async function simulateActivity() {
    if (!selectedLocation) {
      addLog('⚠️ Please select a location first');
      return;
    }

    try {
      const faces = [`face_${Date.now()}_1`, `face_${Date.now()}_2`];
      await addActivity(selectedLocation, faces);
      addLog(`🎭 Added activity to ${selectedLocation} with ${faces.length} faces`);
      
      // Refresh real-time data
      setTimeout(async () => {
        const updated = await getRealtimeCount(selectedLocation);
        realtimeData = updated;
        addLog(`📈 Updated count: ${updated.total_count}`);
      }, 1000);
      
    } catch (error) {
      addLog(`❌ Failed to add activity: ${error.message}`);
    }
  }

  async function addNewCamera() {
    if (!selectedLocation) {
      addLog('⚠️ Please select a location first');
      return;
    }

    try {
      const cameraData = {
        camera_id: `test-cam-${Date.now()}`,
        location_id: selectedLocation,
        name: `Test Camera ${Date.now()}`
      };
      
      const result = await addCamera(cameraData);
      addLog(`📹 Added camera: ${result.message}`);
      
      // Refresh cameras list
      camerasForFiltering = await getCamerasForFiltering(selectedLocation);
      
    } catch (error) {
      addLog(`❌ Failed to add camera: ${error.message}`);
    }
  }

  function clearLog() {
    testLog = [];
  }

  // Reactive statement to log connection changes
  $: if ($connectionStatus) {
    addLog(`🔗 Connection status: ${$connectionStatus}`);
  }
</script>

<div class="analytics-test">
  <h2>🧪 New Analytics System Test</h2>
  
  <div class="status-bar">
    <div class="status-item">
      <span class="label">Connection:</span>
      <span class="value status-{$connectionStatus}">{$connectionStatus}</span>
    </div>
    <div class="status-item">
      <span class="label">Locations:</span>
      <span class="value">{$locations.length}</span>
    </div>
    <div class="status-item">
      <span class="label">Selected:</span>
      <span class="value">{selectedLocation || 'None'}</span>
    </div>
  </div>

  <div class="controls">
    <select bind:value={selectedLocation} on:change={testNewEndpoints}>
      <option value={null}>Select Location...</option>
      {#each locationsForFiltering as location}
        <option value={location.location_id}>{location.name}</option>
      {/each}
    </select>
    
    <button on:click={simulateActivity} disabled={!selectedLocation}>
      🎭 Simulate Activity
    </button>
    
    <button on:click={addNewCamera} disabled={!selectedLocation}>
      📹 Add Test Camera
    </button>
    
    <button on:click={testNewEndpoints}>
      🔄 Refresh Data
    </button>
    
    <button on:click={clearLog}>
      🗑️ Clear Log
    </button>
  </div>

  <div class="data-panels">
    <!-- Real-time Data Panel -->
    <div class="panel">
      <h3>📊 Real-time Data</h3>
      {#if realtimeData}
        <div class="data-grid">
          <div class="data-item">
            <span class="label">Location:</span>
            <span class="value">{realtimeData.location_id || 'N/A'}</span>
          </div>
          <div class="data-item">
            <span class="label">Current Count:</span>
            <span class="value">{realtimeData.current_count || 0}</span>
          </div>
          <div class="data-item">
            <span class="label">Live Count:</span>
            <span class="value">{realtimeData.live_count || 0}</span>
          </div>
          <div class="data-item">
            <span class="label">Total Count:</span>
            <span class="value">{realtimeData.total_count || 0}</span>
          </div>
        </div>
      {:else}
        <p>No real-time data loaded</p>
      {/if}
    </div>

    <!-- Cameras Panel -->
    <div class="panel">
      <h3>📹 Cameras ({camerasForFiltering.length})</h3>
      {#each camerasForFiltering as camera}
        <div class="camera-item">
          <span class="camera-name">{camera.name}</span>
          <span class="camera-id">{camera.camera_id}</span>
        </div>
      {:else}
        <p>No cameras found</p>
      {/each}
    </div>
  </div>

  <!-- Live Locations Display -->
  <div class="panel">
    <h3>📍 Live Locations ({$locations.length})</h3>
    <div class="locations-grid">
      {#each $locations as location}
        <div class="location-card" class:selected={location.id === selectedLocation}>
          <div class="location-name">{location.name}</div>
          <div class="location-count">{location.liveCount}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Test Log -->
  <div class="panel log-panel">
    <h3>📋 Test Log</h3>
    <div class="log-container">
      {#each testLog as entry}
        <div class="log-entry">
          <span class="log-time">[{entry.time}]</span>
          <span class="log-message">{entry.message}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

