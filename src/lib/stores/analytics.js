/**
 * Analytics Data Store
 * Manages real-time analytics data state using Svelte stores
 */

import { writable, derived, get } from 'svelte/store';
import analyticsAPI from '../api/analytics.js';

// Core data stores
export const locations = writable([]);
export const analyticsSummary = writable(null);
export const mapPoints = writable([]);
export const isLoading = writable(false);
export const error = writable(null);
export const connectionStatus = writable('disconnected'); // 'connected', 'disconnected', 'connecting'

// WebSocket message log store for UI display
export const webSocketMessages = writable([]);

// UI state
export const selectedTimeframe = writable('HOURLY');
export const autoRefresh = writable(true);

// New analytics stores for dashboard integration
export const chartData = writable({
  visitorTrends: null,
  locationDistribution: null,
  cameraPerformance: null
});
export const cameras = writable([]);
export const realtimeCountData = writable(null);
export const lastUpdate = writable(null);

// Cache for location data
const locationCache = new Map();
const locationHistoryCache = new Map();

/**
 * Load all locations
 */
export async function loadLocations() {
  isLoading.set(true);
  error.set(null);
  
  try {
    const data = await analyticsAPI.getAllLocations();
    locations.set(data);
    return data;
  } catch (err) {
    console.error('Failed to load locations:', err);
    error.set(err.message);
    return [];
  } finally {
    isLoading.set(false);
  }
}

/**
 * Load analytics summary
 */
export async function loadAnalyticsSummary(timeframe = 'DAILY') {
  try {
    const data = await analyticsAPI.getAnalyticsSummary(timeframe);
    analyticsSummary.set(data);
    return data;
  } catch (err) {
    console.error('Failed to load analytics summary:', err);
    error.set(err.message);
    return null;
  }
}

/**
 * Load map points
 */
export async function loadMapPoints() {
  try {
    const data = await analyticsAPI.getMapPoints();
    mapPoints.set(data);
    return data;
  } catch (err) {
    console.error('Failed to load map points:', err);
    error.set(err.message);
    return [];
  }
}

/**
 * Get location by ID with caching
 */
export async function getLocation(locationId) {
  // Check cache first
  if (locationCache.has(locationId)) {
    const cached = locationCache.get(locationId);
    // Return cached data if less than 30 seconds old
    if (Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
  }

  try {
    const data = await analyticsAPI.getLocation(locationId);
    if (data) {
      locationCache.set(locationId, {
        data,
        timestamp: Date.now()
      });
    }
    return data;
  } catch (err) {
    console.error(`Failed to load location ${locationId}:`, err);
    error.set(err.message);
    return null;
  }
}

/**
 * Get location chart data with caching (UPDATED)
 */
export async function getLocationChartData(locationId, timeframe = 'HOURLY') {
  const cacheKey = `${locationId}_${timeframe}`;
  
  // Check cache first
  if (locationHistoryCache.has(cacheKey)) {
    const cached = locationHistoryCache.get(cacheKey);
    // Return cached data if less than 60 seconds old
    if (Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
  }

  try {
    // Use new sampling data API for chart data
    const periodMap = {
      'HOURLY': 'minutely',
      'DAILY': 'hourly', 
      'WEEKLY': 'daily',
      'MONTHLY': 'weekly'
    };
    
    const period = periodMap[timeframe] || 'minutely';
    const data = await analyticsAPI.getSamplingData(locationId, period);
    
    // Transform data format from {period, count, timestamp} to {time, count} for Chart component
    const transformedData = (data.data || []).map(item => ({
      time: item.period || item.timestamp,
      count: item.count || 0
    }));
    
    locationHistoryCache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now()
    });
    return transformedData;
  } catch (err) {
    console.error(`Failed to load chart data for ${locationId}:`, err);
    return [];
  }
}

/**
 * Get real-time count data (NEW)
 */
export async function getRealtimeCount(locationId = null, cameraId = null) {
  try {
    return await analyticsAPI.getRealtimeCount(locationId, cameraId);
  } catch (err) {
    console.error('Failed to get realtime count:', err);
    error.set(err.message);
    return null;
  }
}

/**
 * Get locations for filtering (NEW)
 */
export async function getLocationsForFiltering() {
  try {
    return await analyticsAPI.getLocationsForFiltering();
  } catch (err) {
    console.error('Failed to get locations for filtering:', err);
    return [];
  }
}

/**
 * Get cameras for filtering (NEW)
 */
export async function getCamerasForFiltering(locationId = null) {
  try {
    return await analyticsAPI.getCamerasForFiltering(locationId);
  } catch (err) {
    console.error('Failed to get cameras for filtering:', err);
    return [];
  }
}

/**
 * Add camera (NEW)
 */
export async function addCamera(cameraData) {
  isLoading.set(true);
  error.set(null);

  try {
    return await analyticsAPI.addCamera(cameraData);
  } catch (err) {
    console.error('Failed to add camera:', err);
    error.set(err.message);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Add activity (NEW)
 */
export async function addActivity(locationId, detectedFaces = null, countOverride = null) {
  try {
    return await analyticsAPI.addActivity(locationId, detectedFaces, countOverride);
  } catch (err) {
    console.error('Failed to add activity:', err);
    error.set(err.message);
    throw err;
  }
}

/**
 * Add a new location
 */
export async function addLocation(locationData) {
  isLoading.set(true);
  error.set(null);

  try {
    const newLocation = await analyticsAPI.createLocation(locationData);
    if (newLocation) {
      // Update locations store
      locations.update(current => [...current, newLocation]);
    }
    return newLocation;
  } catch (err) {
    console.error('Failed to add location:', err);
    error.set(err.message);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Remove a location
 */
export async function removeLocation(locationId) {
  isLoading.set(true);
  error.set(null);

  try {
    await analyticsAPI.removeLocation(locationId);
    // Update locations store
    locations.update(current => 
      current.filter(location => location.id !== locationId)
    );
    // Clear cache
    locationCache.delete(locationId);
  } catch (err) {
    console.error('Failed to remove location:', err);
    error.set(err.message);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Get analytics chart data
 */
export async function getAnalyticsChart(chartType, timeframe = 'MONTHLY') {
  try {
    return await analyticsAPI.getAnalyticsChart(chartType, timeframe);
  } catch (err) {
    console.error(`Failed to load chart ${chartType}:`, err);
    error.set(err.message);
    return null;
  }
}

/**
 * Load all chart data for dashboard
 */
export async function loadAllChartsData(timeframe = 'DAILY') {
  // Loading chart data...
  
  try {
    isLoading.set(true);
    
    const [visitorTrends, locationDistribution, cameraPerformance] = await Promise.allSettled([
      analyticsAPI.getVisitorTrendsChart(timeframe),
      analyticsAPI.getLocationDistributionChart(timeframe),
      analyticsAPI.getCameraPerformanceChart()
    ]);
    
    const chartDataObj = {
      visitorTrends: visitorTrends.status === 'fulfilled' ? visitorTrends.value : null,
      locationDistribution: locationDistribution.status === 'fulfilled' ? locationDistribution.value : null,
      cameraPerformance: cameraPerformance.status === 'fulfilled' ? cameraPerformance.value : null
    };
    
    chartData.set(chartDataObj);
    // Chart data loaded successfully
    
    return chartDataObj;
  } catch (err) {
    console.error('❌ CounterWeb: Failed to load chart data:', err);
    error.set(err.message);
    return null;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Load cameras data
 */
export async function loadCameras() {
  // Loading cameras data...
  
  try {
    const data = await analyticsAPI.getAllCameras();
    cameras.set(data.all_cameras || []);
    // Cameras loaded successfully
    return data.all_cameras || [];
  } catch (err) {
    console.error('❌ CounterWeb: Failed to load cameras:', err);
    error.set(err.message);
    return [];
  }
}

/**
 * Load realtime count data
 */
export async function loadRealtimeCount() {
  // Loading realtime count data...
  
  try {
    const data = await analyticsAPI.getRealtimeCount();
    realtimeCountData.set(data);
    lastUpdate.set(new Date().toISOString());
    // Realtime count loaded successfully
    return data;
  } catch (err) {
    console.error('❌ CounterWeb: Failed to load realtime count:', err);
    error.set(err.message);
    return null;
  }
}

/**
 * Get historical data for table
 */
export async function getHistoryData(params = {}) {
  try {
    return await analyticsAPI.getHistory(params);
  } catch (err) {
    console.error('Failed to load history data:', err);
    error.set(err.message);
    return null;
  }
}

// Global real-time subscription management
let globalUnsubscribe = null;
let subscribers = 0;

/**
 * Setup real-time updates with timeframe (singleton pattern)
 */
export function setupRealTimeUpdates(timeframe = 'HOURLY') {
  subscribers++;
  
  // Only create one global connection
  if (!globalUnsubscribe) {
    connectionStatus.set('connecting');
    
    globalUnsubscribe = analyticsAPI.subscribe((data) => {
    connectionStatus.set('connected');
    
    // Create message object for UI display
    const messageForUI = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: data.event || data.type || 'unknown',
      data: data,
      source: 'Svelte Analytics API',
      rawSize: JSON.stringify(data).length
    };
    
    // Add to WebSocket messages store for UI display
    webSocketMessages.update(messages => [messageForUI, ...messages.slice(0, 99)]);
    
    // 🔥 LOG ALL WEBSOCKET MESSAGES FOR TESTING
    console.log('📡 WebSocket Message Received:', {
      timestamp: messageForUI.timestamp,
      messageType: messageForUI.type,
      fullData: data,
      dataKeys: Object.keys(data),
      dataSize: messageForUI.rawSize
    });
    
    // Handle different types of real-time updates
    if (data.event === 'liveUpdate') {
      // Update specific location in the store
      locations.update(current => {
        // If no locations loaded yet, skip update
        if (current.length === 0) {
          return current;
        }
        
        const updated = current.map(location => 
          location.id === data.locationId 
            ? { ...location, liveCount: data.liveCount }
            : location
        );
        
        return updated;
      });
      
      // Clear cache for updated location
      locationCache.delete(data.locationId);
      
      // Update last update timestamp
      lastUpdate.set(new Date().toISOString());
      
    } else if (data.event === 'analyticsUpdate') {
      // Update analytics summary
      if (data.data) {
        analyticsSummary.set(data.data);
      }
      
    } else if (data.type === 'live_count_update') {
      // Handle WebSocket live count updates from backend
      
      locations.update(current => {
        if (current.length === 0) return current;
        
        return current.map(location => 
          location.id === data.location_id 
            ? { ...location, liveCount: data.live_count }
            : location
        );
      });
      
      lastUpdate.set(new Date().toISOString());
      
    } else if (data.event === 'pong') {
      // Handle ping/pong for connection health
      // WebSocket ping response received
    } else if (data.type === 'progressive_sample') {
      // Handle progressive sample loading for smooth animation
      console.log(`📈 Progressive sample: ${data.location_id} (${data.sample_index}/${data.total_samples}) count: ${data.current_count}`);
      
      // Dispatch custom event for LiveCounter components to handle animation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('progressiveSample', {
          detail: {
            locationId: data.location_id,
            timeframe: data.timeframe,
            sampleIndex: data.sample_index,
            totalSamples: data.total_samples,
            currentCount: data.current_count,
            cumulativeCount: data.cumulative_count,
            chartData: data.chart_data,
            isFinal: data.is_final
          }
        }));
      }
      
    } else if (data.type === 'progressive_loading_complete') {
      // Handle progressive loading completion
      console.log(`✅ Progressive loading complete: ${data.location_id}, final count: ${data.final_count}`);
      
      // Update the location with final count
      locations.update(current => {
        return current.map(location => 
          location.id === data.location_id 
            ? { ...location, liveCount: data.final_count }
            : location
        );
      });
      
      // Dispatch completion event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('progressiveLoadingComplete', {
          detail: {
            locationId: data.location_id,
            timeframe: data.timeframe,
            finalCount: data.final_count,
            totalSamplesSent: data.total_samples_sent
          }
        }));
      }
      
    } else if (data.type === 'progressive_loading_error') {
      // Handle progressive loading errors
      console.error(`❌ Progressive loading error: ${data.location_id}`, data.error);
      
    } else {
      console.warn('⚠️ Unknown WebSocket message type:', data.type);
    }
    });

    // Handle connection status
    const originalConnect = analyticsAPI.connectWebSocket;
    analyticsAPI.connectWebSocket = () => {
      connectionStatus.set('connecting');
      originalConnect.call(analyticsAPI);
    };
  }

  // Return unsubscribe function that manages global state
  return () => {
    subscribers--;
    if (subscribers <= 0 && globalUnsubscribe) {
      globalUnsubscribe();
      globalUnsubscribe = null;
      subscribers = 0;
    }
  };
}

/**
 * Update timeframe for live WebSocket updates
 */
export function updateLiveTimeframe(timeframe) {
  // Map frontend timeframe to backend format
  const timeframeMap = {
    'Hourly': 'HOURLY',
    'Daily': 'DAILY',
    'Weekly': 'WEEKLY',
    'Monthly': 'MONTHLY'
  };
  
  const backendTimeframe = timeframeMap[timeframe] || 'HOURLY';
  
  // Update the timeframe for existing WebSocket connections
  analyticsAPI.updateTimeframe(backendTimeframe);
  
  console.log(`📅 Store: Updated live timeframe to ${timeframe} (${backendTimeframe})`);
}

/**
 * Subscribe to specific location with timeframe for immediate data
 */
export function subscribeToLocationWithTimeframe(locationId, timeframe) {
  if (!locationId || locationId === 'default' || locationId === 'all-data') {
    return;
  }
  
  // Map frontend timeframe to backend format
  const timeframeMap = {
    'Hourly': 'HOURLY',
    'Daily': 'DAILY',
    'Weekly': 'WEEKLY',
    'Monthly': 'MONTHLY'
  };
  
  const backendTimeframe = timeframeMap[timeframe] || 'HOURLY';
  
  // Subscribe to specific location with timeframe to get immediate data
  analyticsAPI.subscribeToLocation(locationId, backendTimeframe);
  
  console.log(`🔔 Store: Subscribed to location ${locationId} with timeframe ${timeframe} (${backendTimeframe})`);
}

/**
 * Request progressive sample loading for smooth counter initialization
 */
export function loadProgressiveSamples(locationId, timeframe, sampleCount = 50) {
  if (!locationId || locationId === 'default' || locationId === 'all-data') {
    return;
  }
  
  // Map frontend timeframe to backend format
  const timeframeMap = {
    'Hourly': 'HOURLY',
    'Daily': 'DAILY',
    'Weekly': 'WEEKLY',
    'Monthly': 'MONTHLY'
  };
  
  const backendTimeframe = timeframeMap[timeframe] || 'HOURLY';
  
  // Request progressive sample loading
  analyticsAPI.loadProgressiveSamples(locationId, backendTimeframe, sampleCount);
  
  console.log(`📈 Store: Requesting progressive samples for ${locationId} with timeframe ${timeframe} (${backendTimeframe}), ${sampleCount} samples`);
}

/**
 * Refresh all data
 */
export async function refreshAllData() {
  // Refreshing all data...
  const timeframe = get(selectedTimeframe);
  
  // Clear caches
  locationCache.clear();
  locationHistoryCache.clear();
  
  // Load all data in parallel
  await Promise.allSettled([
    loadLocations(),
    loadAnalyticsSummary(timeframe),
    loadMapPoints(),
    loadAllChartsData(timeframe),
    loadCameras(),
    loadRealtimeCount()
  ]);
  
  // All data refreshed successfully
}

/**
 * Auto-refresh timer
 */
let refreshTimer = null;

export function startAutoRefresh(intervalMs = 30000) {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  
  refreshTimer = setInterval(() => {
    if (get(autoRefresh)) {
      refreshAllData();
    }
  }, intervalMs);
}

export function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Derived stores for computed values
 */
export const totalVisitors = derived(
  locations, 
  $locations => $locations.reduce((sum, loc) => sum + loc.liveCount, 0)
);

export const activeLocations = derived(
  locations,
  $locations => $locations.filter(loc => loc.liveCount > 0)
);

export const locationsByCount = derived(
  locations,
  $locations => [...$locations].sort((a, b) => b.liveCount - a.liveCount)
);

// Initialize health check with enhanced logging
// Initializing analytics store...

analyticsAPI.healthCheck().then(isHealthy => {
  if (isHealthy) {
    // Analytics API is healthy
    // Test GraphQL connection
    analyticsAPI.testConnection().then(connected => {
      if (connected) {
        // GraphQL connection verified
      } else {
        console.warn('⚠️ CounterWeb: GraphQL connection test failed');
      }
    });
  } else {
    console.warn('⚠️ CounterWeb: Analytics API health check failed');
  }
});

// Analytics store ready

// 🧪 TESTING HELPERS - Available in browser console
if (typeof window !== 'undefined') {
  window.testWebSocket = {
    // Log current connection status
    status: () => {
      console.log('🔌 WebSocket Status:', get(connectionStatus));
      console.log('📊 Last Update:', get(lastUpdate));
      console.log('📍 Locations:', get(locations));
    },
    
    // Simulate a test message
    simulateMessage: (type = 'liveUpdate', data = {}) => {
      const testMessage = {
        event: type,
        locationId: 'test-location',
        liveCount: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString(),
        ...data
      };
      console.log('🧪 Simulating WebSocket message:', testMessage);
      // This would normally come from the WebSocket
    },
    
    // Get analytics API instance  
    api: analyticsAPI
  };
  
  console.log('🧪 WebSocket Testing Helpers Available:');
  console.log('   - window.testWebSocket.status()');
  console.log('   - window.testWebSocket.simulateMessage()');
  console.log('   - window.testWebSocket.api');
}