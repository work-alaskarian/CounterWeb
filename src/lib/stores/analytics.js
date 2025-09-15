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

// UI state
export const selectedTimeframe = writable('HOURLY');
export const autoRefresh = writable(true);

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
    
    locationHistoryCache.set(cacheKey, {
      data: data.data || [],
      timestamp: Date.now()
    });
    return data.data || [];
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
 * Setup real-time updates (singleton pattern)
 */
export function setupRealTimeUpdates() {
  subscribers++;
  
  // Only create one global connection
  if (!globalUnsubscribe) {
    connectionStatus.set('connecting');
    
    globalUnsubscribe = analyticsAPI.subscribe((data) => {
    connectionStatus.set('connected');
    
    // Handle different types of real-time updates
    if (data.event === 'liveUpdate') {
      console.log(`🔄 Updating ${data.locationId} to count: ${data.liveCount}`);
      
      // Update specific location in the store
      locations.update(current => {
        console.log(`📋 Current locations count: ${current.length}`);
        
        // If no locations loaded yet, skip update
        if (current.length === 0) {
          console.log('⚠️ No locations loaded yet, skipping update');
          return current;
        }
        
        const updated = current.map(location => 
          location.id === data.locationId 
            ? { ...location, liveCount: data.liveCount }
            : location
        );
        
        console.log(`✅ Updated location ${data.locationId} - UI should refresh now`);
        return updated;
      });
      
      // Clear cache for updated location
      locationCache.delete(data.locationId);
      
    } else if (data.event === 'analyticsUpdate') {
      // Update analytics summary
      if (data.data) {
        analyticsSummary.set(data.data);
      }
      
    } else if (data.event === 'pong') {
      // Handle ping/pong for connection health
      console.log('🏓 WebSocket ping response received');
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
 * Refresh all data
 */
export async function refreshAllData() {
  const timeframe = get(selectedTimeframe);
  
  // Clear caches
  locationCache.clear();
  locationHistoryCache.clear();
  
  // Load all data in parallel
  await Promise.all([
    loadLocations(),
    loadAnalyticsSummary(timeframe),
    loadMapPoints()
  ]);
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

// Initialize health check
analyticsAPI.healthCheck().then(isHealthy => {
  if (isHealthy) {
    console.log('✅ Analytics API is healthy');
  } else {
    console.warn('⚠️ Analytics API health check failed');
  }
});