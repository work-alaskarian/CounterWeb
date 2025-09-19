/**
 * SIMPLE Analytics Data Store
 * No buffering, no complex state management, just basic stores
 */

import { writable, derived } from 'svelte/store';
import analyticsAPI from '../services/api.js';

// Core data stores - SIMPLE
export const locations = writable([]);
export const analyticsSummary = writable(null);
export const mapPoints = writable([]);
export const isLoading = writable(false);
export const error = writable(null);
export const connectionStatus = writable('disconnected');

// Basic fallback system
export const fallbackMode = writable(false);
export const fallbackReason = writable(null);

// UI state
export const selectedTimeframe = writable('HOURLY');
export const autoRefresh = writable(true);

// Chart data stores
export const chartData = writable({
  visitorTrends: null,
  locationDistribution: null,
  cameraPerformance: null
});
export const cameras = writable([]);
export const realtimeCountData = writable(null);
export const lastUpdate = writable(null);

/**
 * Load all locations - SIMPLE
 */
export async function loadLocations() {
  isLoading.set(true);
  error.set(null);

  try {
    console.log('🔄 SIMPLE: Loading locations from API...');
    const data = await analyticsAPI.getAllLocations();
    console.log('✅ SIMPLE: Loaded locations:', data?.length || 0, 'locations');

    // Add aggregated "all" location
    const locationsWithAll = data || [];
    const totalCount = locationsWithAll.reduce((sum, loc) => sum + (loc.liveCount || 0), 0);
    locationsWithAll.push({
      id: 'all',
      name: 'جميع البيانات',
      liveCount: totalCount,
      status: 'active'
    });

    locations.set(locationsWithAll);
    return locationsWithAll;
  } catch (err) {
    console.warn('⚠️ SIMPLE: API not available, using fallback mode:', err.message);

    // Work offline with empty locations
    locations.set([]);
    fallbackMode.set(true);
    fallbackReason.set('API not available - working offline');

    return [];
  } finally {
    isLoading.set(false);
  }
}

/**
 * Load analytics summary - SIMPLE
 */
export async function loadAnalyticsSummary(timeframe = 'DAILY') {
  try {
    const data = await analyticsAPI.getAnalyticsSummary(timeframe);
    analyticsSummary.set(data);
    return data;
  } catch (err) {
    console.error('SIMPLE: Failed to load analytics summary:', err);
    error.set(err.message);
    return null;
  }
}

/**
 * Load map points - SIMPLE
 */
export async function loadMapPoints() {
  try {
    const data = await analyticsAPI.getMapPoints();
    mapPoints.set(data);
    return data;
  } catch (err) {
    console.error('SIMPLE: Failed to load map points:', err);
    error.set(err.message);
    return [];
  }
}

/**
 * Get location by ID - SIMPLE
 */
export async function getLocation(locationId) {
  try {
    const data = await analyticsAPI.getLocation(locationId);
    return data;
  } catch (err) {
    console.error(`SIMPLE: Failed to load location ${locationId}:`, err);
    error.set(err.message);
    return null;
  }
}

/**
 * Load cameras data - SIMPLE
 */
export async function loadCameras() {
  try {
    const data = await analyticsAPI.getAllCameras();
    cameras.set(data.all_cameras || []);
    return data.all_cameras || [];
  } catch (err) {
    console.error('SIMPLE: Failed to load cameras:', err);
    error.set(err.message);
    return [];
  }
}

/**
 * Load realtime count data - SIMPLE
 */
export async function loadRealtimeCount() {
  try {
    const data = await analyticsAPI.getRealtimeCount();
    realtimeCountData.set(data);
    lastUpdate.set(new Date().toISOString());
    return data;
  } catch (err) {
    console.error('SIMPLE: Failed to load realtime count:', err);
    error.set(err.message);
    return null;
  }
}

/**
 * Load all chart data for dashboard - SIMPLE
 */
export async function loadAllChartsData(timeframe = 'DAILY') {
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
    return chartDataObj;
  } catch (err) {
    console.error('SIMPLE: Failed to load chart data:', err);
    error.set(err.message);
    return null;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Add a new location - SIMPLE
 */
export async function addLocation(locationData) {
  isLoading.set(true);
  error.set(null);

  try {
    const newLocation = await analyticsAPI.createLocation(locationData);
    if (newLocation) {
      locations.update(current => [...current, newLocation]);
    }
    return newLocation;
  } catch (err) {
    console.error('SIMPLE: Failed to add location:', err);
    error.set(err.message);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Remove a location - SIMPLE
 */
export async function removeLocation(locationId) {
  isLoading.set(true);
  error.set(null);

  try {
    await analyticsAPI.removeLocation(locationId);
    locations.update(current =>
      current.filter(location => location.id !== locationId)
    );
  } catch (err) {
    console.error('SIMPLE: Failed to remove location:', err);
    error.set(err.message);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Derived stores for computed values - SIMPLE
 */
export const totalVisitors = derived(
  locations,
  $locations => $locations.reduce((sum, loc) => sum + (loc.liveCount || 0), 0)
);

export const activeLocations = derived(
  locations,
  $locations => $locations.filter(loc => (loc.liveCount || 0) > 0)
);

export const locationsByCount = derived(
  locations,
  $locations => [...$locations].sort((a, b) => (b.liveCount || 0) - (a.liveCount || 0))
);

// Simple initialization
console.log('🚀 SIMPLE: Analytics store initialized');

// Test API health and load initial data
analyticsAPI.healthCheck().then(isHealthy => {
  if (isHealthy) {
    console.log('✅ SIMPLE: Analytics API is healthy');
    loadLocations();
  } else {
    console.warn('⚠️ SIMPLE: Analytics API health check failed');
    fallbackMode.set(true);
    fallbackReason.set('API health check failed');
  }
});

console.log('✅ SIMPLE: Analytics store ready');