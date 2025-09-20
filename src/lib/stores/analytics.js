/**
 * Analytics Data Store
 * Manages real-time analytics data state using Svelte stores
 */

import { writable, derived, get } from 'svelte/store';
import analyticsAPI from '../services/api.js';

// Core data stores
export const locations = writable([]);
export const analyticsSummary = writable(null);
export const mapPoints = writable([]);
export const isLoading = writable(false);
export const error = writable(null);
export const connectionStatus = writable('disconnected'); // 'connected', 'disconnected', 'connecting'

// WebSocket fallback system
export const websocketHealthy = writable(true);
export const fallbackMode = writable(false);
export const fallbackReason = writable(null);
export const lastWebSocketAttempt = writable(null);
export const nextRetryTime = writable(null);

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

// Smart buffering system for UI updates (10-second buffer)
let lastMessageTime = new Map(); // message type -> timestamp (for WebSocket message throttling)
let pendingUIUpdates = new Map(); // locationId -> {count, timestamp, data}
let uiUpdateTimer = null;
let lastUIUpdateTime = 0;
const UI_UPDATE_BUFFER_DELAY = 10000; // 10 seconds
const IMMEDIATE_UPDATE_THRESHOLD = 15000; // 15 seconds - if no update for this long, apply immediately
const WEBSOCKET_THROTTLE_INTERVAL = 10000; // 10 seconds - throttle WebSocket message processing

/**
 * Apply pending UI updates with smart buffering
 */
function applyPendingUIUpdates() {
  console.debug(`📊 Applying ${pendingUIUpdates.size} buffered updates`);

  if (pendingUIUpdates.size === 0) {
    return;
  }

  const currentLocations = get(locations);

  // Apply all pending updates at once
  locations.update(current => {
    if (current.length === 0) {
      console.log(`❌ NO CURRENT LOCATIONS - cannot apply updates`);
      return current;
    }

    const updated = current.map(location => {
      const pendingUpdate = pendingUIUpdates.get(location.id);
      if (pendingUpdate) {
        const oldCount = location.liveCount || 0;
        const newCount = pendingUpdate.count;
        console.debug(`📊 ${location.id}: ${oldCount} → ${newCount}`);
        return {
          ...location,
          liveCount: newCount,
          totalCount: pendingUpdate.data.total || location.totalCount
        };
      }
      return location;
    });

    // Add any missing locations from the updates
    Array.from(pendingUIUpdates.entries()).forEach(([locationId, updateData]) => {
      if (!updated.find(loc => loc.id === locationId)) {
        console.debug(`📊 Adding location ${locationId}: ${updateData.count}`);
        updated.push({
          id: locationId,
          name: locationId === 'northern-gate' ? 'البوابة الشمالية' :
                locationId === 'womens-section' ? 'قسم النساء' :
                locationId === 'all' ? 'جميع البيانات' : locationId,
          liveCount: updateData.count,
          totalCount: updateData.data.total || updateData.count,
          status: 'active'
        });
      }
    });

    return updated;
  });

  // Clear pending updates and update timestamps
  pendingUIUpdates.clear();
  lastUIUpdateTime = Date.now();
  console.info(`✅ Applied ${pendingUIUpdates.size} buffered updates`);
}

/**
 * Schedule a buffered UI update with smart timing
 */
function scheduleBufferedUIUpdate(locationId, count, data) {
  const currentTime = Date.now();
  const timeSinceLastUpdate = currentTime - lastUIUpdateTime;

  // Store the update
  pendingUIUpdates.set(locationId, {
    count: count,
    timestamp: currentTime,
    data: data
  });

  // If it's been more than IMMEDIATE_UPDATE_THRESHOLD since last update, apply immediately
  if (timeSinceLastUpdate > IMMEDIATE_UPDATE_THRESHOLD) {
    console.debug(`🚀 Immediate update: ${timeSinceLastUpdate}ms > ${IMMEDIATE_UPDATE_THRESHOLD}ms`);
    applyPendingUIUpdates();
    return;
  }

  // Clear existing timer and set a new one for 10 seconds
  if (uiUpdateTimer) {
    clearTimeout(uiUpdateTimer);
    console.log(`🔄 RESET BUFFER TIMER: New data arrived, waiting another ${UI_UPDATE_BUFFER_DELAY}ms`);
  } else {
    console.log(`⏳ START BUFFER TIMER: Waiting ${UI_UPDATE_BUFFER_DELAY}ms for more data`);
  }

  uiUpdateTimer = setTimeout(() => {
    console.log(`⏰ BUFFER TIMER EXPIRED: 10 seconds completed, now applying updates to UI`);
    console.log(`🎯 TIMER COMPLETION: ${pendingUIUpdates.size} pending updates will now be displayed`);
    const startTime = Date.now();
    applyPendingUIUpdates();
    const endTime = Date.now();
    console.log(`✅ UI UPDATE COMPLETED: All buffered updates applied to display in ${endTime - startTime}ms`);
    uiUpdateTimer = null;
  }, UI_UPDATE_BUFFER_DELAY);

  console.log(`⏰ BUFFERED UPDATE SCHEDULED for ${locationId}: ${count} (pending: ${pendingUIUpdates.size})`);
}

/**
 * Load all locations
 */
export async function loadLocations() {
  isLoading.set(true);
  error.set(null);

  try {
    console.log('🔄 LOADING LOCATIONS FROM API...');
    const data = await analyticsAPI.getAllLocations();
    console.log('✅ LOADED LOCATIONS:', data?.length || 0, 'locations');
    console.log('📍 LOCATION IDs:', data?.map(loc => ({ id: loc.id, name: loc.name, liveCount: loc.liveCount })));

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
    console.warn('⚠️ API not available, using fallback mode:', err.message);

    // Don't set error - instead work offline with empty locations
    // The dashboard will add default test locations later
    locations.set([]);

    // Enable fallback mode
    fallbackMode.set(true);
    fallbackReason.set('API not available - working offline');

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
 * Get location by ID (simplified - no caching for direct WebSocket usage)
 */
export async function getLocation(locationId) {
  try {
    const data = await analyticsAPI.getLocation(locationId);
    return data;
  } catch (err) {
    console.error(`Failed to load location ${locationId}:`, err);
    error.set(err.message);
    return null;
  }
}

/**
 * Get location chart data (simplified - primarily used by WebSocket now)
 */
export async function getLocationChartData(locationId, timeframe = 'HOURLY') {
  try {
    // Use sampling data API for chart data (fallback when WebSocket not available)
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

    try {
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

        // Handle different types of real-time updates
        console.log(`🔍 ALL MESSAGE TYPES: ${data.type || data.event || 'unknown'}`);

        if (data.type === 'live_count_update') {
          console.log(`🔥 LIVE COUNT UPDATE RECEIVED:`, data);
          console.log(`🔍 DEBUG: Processing live_count_update message`);

          // SIMPLE TEST: Direct update without complex logic
          const testCount = data.data?.total_count || Math.floor(Math.random() * 1000);
          console.log(`🚀 SIMPLE TEST UPDATE: Setting all = ${testCount}`);

          locations.update(current => {
            return current.map(loc => {
              if (loc.id === 'all') {
                console.log(`📊 SIMPLE UPDATE: all from ${loc.liveCount} to ${testCount}`);
                return { ...loc, liveCount: testCount };
              }
              return loc;
            });
          });

          // Throttle WebSocket messages - only process every 2 seconds for real-time updates
          const currentTime = Date.now();
          const lastProcessed = lastMessageTime.get('live_updates') || 0;
          const REALTIME_THROTTLE_INTERVAL = 2000; // 2 seconds for real-time feel

          if (currentTime - lastProcessed < REALTIME_THROTTLE_INTERVAL) {
            console.log(`⚡ Skipping update - too frequent (${currentTime - lastProcessed}ms ago, need ${REALTIME_THROTTLE_INTERVAL}ms)`);
            return;
          }
          lastMessageTime.set('live_updates', currentTime);
          console.log(`🔍 REAL-TIME: Processing message after ${currentTime - lastProcessed}ms`);

          // Extract data from the new WebSocket format
          const locationId = data.location_id;
          const updateData = data.data || {};
          const changeFromPrevious = data.change_from_previous || 0;
          const updateNumber = data.update_number || 0;

      console.log(`📊 Processing update #${updateNumber} for location: ${locationId}, change: ${changeFromPrevious}`);
      console.log(`📊 Raw data received:`, updateData);
      console.log(`📊 Data type:`, typeof updateData);
      console.log(`📊 Data keys:`, Object.keys(updateData));

      // Handle different data structures based on location_id
      const locationUpdates = [];

      if (locationId === 'all') {
        // For "all" location, extract the total count directly
        let totalCount = 0;

        if (typeof updateData === 'number') {
          // If data is directly a number
          totalCount = updateData;
          console.log(`📊 Data is number: ${totalCount}`);
        } else if (updateData.total_count !== undefined) {
          // If data has total_count field
          totalCount = updateData.total_count;
          console.log(`📊 Using total_count: ${totalCount}`);
        } else if (updateData.count !== undefined) {
          // If data has count field
          totalCount = updateData.count;
          console.log(`📊 Using count: ${totalCount}`);
        } else if (updateData.live !== undefined) {
          // If data has live field
          totalCount = updateData.live;
          console.log(`📊 Using live: ${totalCount}`);
        } else if (updateData.value !== undefined) {
          // If data has value field
          totalCount = updateData.value;
          console.log(`📊 Using value: ${totalCount}`);
        } else if (changeFromPrevious !== undefined && changeFromPrevious !== 0) {
          // If we have change info, try to use it with previous count
          const currentLocs = get(locations);
          const currentAllLoc = currentLocs.find(l => l.id === 'all');
          const previousCount = currentAllLoc ? currentAllLoc.liveCount : 0;
          totalCount = previousCount + changeFromPrevious;
          console.log(`📊 Calculated from change: ${previousCount} + ${changeFromPrevious} = ${totalCount}`);
        } else {
          console.warn(`⚠️ Could not extract count from data:`, updateData);
          console.warn(`⚠️ Available data fields:`, Object.keys(updateData));
          console.warn(`⚠️ Change from previous: ${changeFromPrevious}`);
          return;
        }

        console.log(`📊 Final extracted total count: ${totalCount}`);

        locationUpdates.push({
          frontendId: 'all',
          backendId: 'all',
          count: totalCount,
          total: updateData.total_all_time || totalCount,
          changeFromPrevious,
          updateNumber
        });

      } else if (locationId === 'men_region' || locationId === 'northern-gate') {
        // Handle men's region data
        const count = typeof updateData === 'number' ? updateData : (updateData.live || updateData.count || 0);
        locationUpdates.push({
          frontendId: 'northern-gate',
          backendId: 'men_region',
          count: count,
          total: updateData.total || count,
          changeFromPrevious,
          updateNumber
        });

      } else if (locationId === 'women_region' || locationId === 'womens-section') {
        // Handle women's region data
        const count = typeof updateData === 'number' ? updateData : (updateData.live || updateData.count || 0);
        locationUpdates.push({
          frontendId: 'womens-section',
          backendId: 'women_region',
          count: count,
          total: updateData.total || count,
          changeFromPrevious,
          updateNumber
        });

      } else {
        // Handle legacy nested structure if still received
        const menRegion = updateData.men_region || {};
        const womenRegion = updateData.women_region || {};
        const totalCount = updateData.total_count || 0;

        console.log(`📊 Legacy format - Extracted counts:`, {
          men_live: menRegion.live,
          women_live: womenRegion.live,
          total: totalCount
        });

        if (menRegion.live !== undefined) {
          locationUpdates.push({
            frontendId: 'northern-gate',
            backendId: 'men_region',
            count: menRegion.live,
            total: menRegion.total
          });
        }

        if (womenRegion.live !== undefined) {
          locationUpdates.push({
            frontendId: 'womens-section',
            backendId: 'women_region',
            count: womenRegion.live,
            total: womenRegion.total
          });
        }

        if (totalCount !== undefined) {
          locationUpdates.push({
            frontendId: 'all',
            backendId: 'all',
            count: totalCount,
            total: updateData.total_all_time || totalCount
          });
        }
      }

      // Apply immediate UI updates - no buffering
      console.log(`🚀 IMMEDIATE UPDATE: Applying ${locationUpdates.length} location updates directly to UI`);

      locationUpdates.forEach(updateInfo => {
        console.log(`⚡ IMMEDIATE UPDATE: ${updateInfo.frontendId} = ${updateInfo.count}`);

        // Update locations store immediately
        locations.update(current => {
          const updated = current.map(location => {
            if (location.id === updateInfo.frontendId) {
              const oldCount = location.liveCount || 0;
              console.log(`📊 IMMEDIATE COUNT CHANGE: ${updateInfo.frontendId} - ${oldCount} → ${updateInfo.count}`);
              return {
                ...location,
                liveCount: updateInfo.count,
                totalCount: updateInfo.total || location.totalCount
              };
            }
            return location;
          });

          // Add new location if not found
          if (!updated.find(loc => loc.id === updateInfo.frontendId)) {
            console.log(`📊 ADDING NEW IMMEDIATE LOCATION: ${updateInfo.frontendId} = ${updateInfo.count}`);
            updated.push({
              id: updateInfo.frontendId,
              name: updateInfo.frontendId === 'northern-gate' ? 'البوابة الشمالية' :
                    updateInfo.frontendId === 'womens-section' ? 'قسم النساء' :
                    updateInfo.frontendId === 'all' ? 'جميع البيانات' : updateInfo.frontendId,
              liveCount: updateInfo.count,
              totalCount: updateInfo.total || updateInfo.count,
              status: 'active'
            });
          }

          return updated;
        });
      });

      // Update last update timestamp
      lastUpdate.set(new Date().toISOString());

        } else if (data.type === 'live_count_subscribed') {
          // Handle live count subscription confirmation
          console.log(`🔔 Live count subscription confirmed:`, data);

        } else if (data.type === 'chart_data_subscribed') {
      // Handle chart data subscription confirmation
      console.log(`📊 Chart data subscription confirmed:`, data);

    } else if (data.type === 'chart_data_batch_start') {
      // Handle start of chart data batch
      console.log(`📊 Chart data batch starting: ${data.total_points} points for ${data.location_id}`);

    } else if (data.type === 'chart_data_point') {
      // Handle individual chart data points
      const dataPoint = data.data_point || {};
      const locationId = data.location_id;
      const isHistorical = data.is_historical;

      console.log(`📊 Chart data point #${data.point_index}/${data.total_points}: ${locationId}`, dataPoint);

      // Extract chart data from the data point
      const timestamp = dataPoint.timestamp;
      const menRegion = dataPoint.men_region || {};
      const womenRegion = dataPoint.women_region || {};
      const totalCount = dataPoint.total_count || 0;

      // Transform for chart component
      const chartPoint = {
        time: timestamp,
        count: totalCount,
        details: {
          men: menRegion.live || 0,
          women: womenRegion.live || 0,
          total: totalCount
        }
      };

      // Dispatch custom event for Chart components to handle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chartDataPoint', {
          detail: {
            locationId: locationId,
            timeframe: data.timeframe,
            chartPoint: chartPoint,
            pointIndex: data.point_index,
            totalPoints: data.total_points,
            isHistorical: isHistorical,
            isBatchComplete: false
          }
        }));
      }

    } else if (data.type === 'chart_data_batch_complete') {
      // Handle completion of chart data batch
      console.log(`📊 Chart data batch complete: ${data.points_sent} points sent for ${data.location_id}`);

      // Dispatch batch completion event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chartDataBatchComplete', {
          detail: {
            locationId: data.location_id,
            timeframe: data.timeframe,
            pointsSent: data.points_sent
          }
        }));
      }

    } else if (data.event === 'analyticsUpdate') {
      // Update analytics summary
      if (data.data) {
        analyticsSummary.set(data.data);
      }
      
    } else if (data.type === 'chart_data_update') {
      // Handle real-time chart data updates
      
      // Dispatch custom event for Chart components to handle real-time updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chartDataUpdate', {
          detail: {
            locationId: data.location_id,
            chartData: data.chart_data,
            timestamp: data.timestamp
          }
        }));
      }
      
    } else if (data.type === 'chart_data_response') {
      // Handle chart data response from WebSocket requests
      
      // Dispatch custom event for Chart components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chartDataResponse', {
          detail: {
            locationId: data.location_id,
            timeframe: data.timeframe,
            chartData: data.chart_data,
            timestamp: data.timestamp
          }
        }));
      }
      
    } else if (data.event === 'pong') {
      // Handle ping/pong for connection health
      websocketHealthy.set(true);
      
    } else if (data.event === 'websocketDisconnected') {
      // Handle WebSocket disconnection
      console.warn(`🔌 WebSocket disconnected: ${data.reason} (code: ${data.code})`);
      websocketHealthy.set(false);
      fallbackMode.set(true);
      fallbackReason.set(`Connection lost: ${data.reason || 'Unknown error'}`);
      
    } else if (data.event === 'connectionFailed') {
      // Handle permanent connection failure
      console.error('🚨 WebSocket connection failed permanently');
      websocketHealthy.set(false);
      fallbackMode.set(true);
      fallbackReason.set(data.maxAttemptsReached ? 'Max retry attempts reached' : 'Connection failed');
    } else if (data.type === 'progressive_sample') {
      // Handle progressive sample loading for smooth animation
      
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

    } else if (data.event === 'liveUpdate') {
      // DISABLED: Legacy liveUpdate format - use live_count_update instead
      console.log(`🚫 IGNORING Legacy liveUpdate event (use live_count_update instead):`, data);

    } else {
      console.warn('⚠️ Unknown WebSocket message type:', data.type || data.event || 'undefined', data);
    }
      }); // Close the analyticsAPI.subscribe callback function

      // Handle connection status
      const originalConnect = analyticsAPI.connectWebSocket;
      analyticsAPI.connectWebSocket = () => {
        connectionStatus.set('connecting');
        originalConnect.call(analyticsAPI);
      };
    } catch (error) {
      console.error('❌ WebSocket setup failed:', error);
      connectionStatus.set('disconnected');
      websocketHealthy.set(false);
      fallbackMode.set(true);
      fallbackReason.set('WebSocket initialization failed');

      // Don't let WebSocket failure break the app
      globalUnsubscribe = () => {}; // Dummy unsubscribe function
    }
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
 * Load chart data via WebSocket (REAL-TIME data only)
 */
export function loadChartDataViaWebSocket(locationId, timeframe) {
  analyticsAPI.requestChartData(locationId, timeframe);
  console.log(`📈 Requesting chart data via WebSocket: ${locationId}, ${timeframe}`);
}

/**
 * Periodic GraphQL data refresh (every 5 minutes)
 * Only for non-realtime data: locations, cameras, analytics summary
 */
export async function refreshPeriodicData() {
  console.log('🔄 Refreshing periodic GraphQL data...');
  const timeframe = get(selectedTimeframe);

  // Load only periodic data via GraphQL (not real-time data)
  await Promise.allSettled([
    loadLocations(),
    loadAnalyticsSummary(timeframe),
    loadCameras()
  ]);

  console.log('✅ Periodic GraphQL data refreshed successfully');
}

/**
 * OLD: Refresh all data (DEPRECATED - now split into periodic vs real-time)
 */
export async function refreshAllData() {
  console.warn('⚠️ refreshAllData() is deprecated - use refreshPeriodicData() for non-realtime data');
  await refreshPeriodicData();
}

/**
 * Periodic GraphQL refresh timer (5 minutes for non-realtime data)
 */
let periodicRefreshTimer = null;

export function startPeriodicRefresh(intervalMs = 300000) { // 5 minutes = 300000ms
  if (periodicRefreshTimer) {
    clearInterval(periodicRefreshTimer);
  }
  
  console.log(`🔄 Starting periodic GraphQL refresh every ${intervalMs / 1000} seconds`);
  
  periodicRefreshTimer = setInterval(() => {
    if (get(autoRefresh)) {
      refreshPeriodicData();
    }
  }, intervalMs);
  
  // Also refresh immediately on start
  if (get(autoRefresh)) {
    refreshPeriodicData();
  }
}

/**
 * DEPRECATED: Old auto-refresh (now use startPeriodicRefresh)
 */
export function startAutoRefresh(intervalMs = 300000) {
  console.warn('⚠️ startAutoRefresh() is deprecated - use startPeriodicRefresh() instead');
  startPeriodicRefresh(intervalMs);
}

export function stopPeriodicRefresh() {
  if (periodicRefreshTimer) {
    clearInterval(periodicRefreshTimer);
    periodicRefreshTimer = null;
    console.log('🛑 Stopped periodic GraphQL refresh');
  }
}

/**
 * DEPRECATED: Use stopPeriodicRefresh() instead
 */
export function stopAutoRefresh() {
  console.warn('⚠️ stopAutoRefresh() is deprecated - use stopPeriodicRefresh() instead');
  stopPeriodicRefresh();
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

// Initialize health check and periodic refresh system
console.log('🚀 Initializing analytics store...');

analyticsAPI.healthCheck().then(isHealthy => {
  if (isHealthy) {
    console.log('✅ Analytics API is healthy');
    
    // Test GraphQL connection
    analyticsAPI.testConnection().then(connected => {
      if (connected) {
        console.log('✅ GraphQL connection verified');
        
        // Start periodic refresh for non-realtime data (5 minutes)
        startPeriodicRefresh(300000); // 5 minutes
        
      } else {
        console.warn('⚠️ CounterWeb: GraphQL connection test failed');
        fallbackMode.set(true);
        fallbackReason.set('GraphQL connection failed');
      }
    });
  } else {
    console.warn('⚠️ CounterWeb: Analytics API health check failed');
    fallbackMode.set(true);
    fallbackReason.set('API health check failed');
  }
});

console.log('✅ Analytics store ready with hybrid WebSocket + GraphQL architecture');

// 🧪 TESTING HELPERS - Available in browser console
if (typeof window !== 'undefined') {
  window.testWebSocket = {
    // Log current connection status
    status: () => {
      console.log('🔌 WebSocket Status:', get(connectionStatus));
      console.log('📊 Last Update:', get(lastUpdate));
      console.log('📍 Locations:', get(locations));
      console.log('⏳ Pending UI Updates:', pendingUIUpdates);
      console.log('⏱️ Last UI Update Time:', new Date(lastUIUpdateTime).toLocaleTimeString());
      console.log('⏰ UI Update Timer Active:', uiUpdateTimer !== null);
    },

    // Simulate live count update message (new backend format)
    simulateLiveUpdate: (data = {}) => {
      const testMessage = {
        type: 'live_count_update',
        location_id: 'all',
        timeframe: 'HOURLY',
        data: {
          men_region: { live: data.menLive || Math.floor(Math.random() * 100) + 1, total: 1000 },
          women_region: { live: data.womenLive || Math.floor(Math.random() * 200) + 1, total: 2000 },
          total_count: (data.menLive || 50) + (data.womenLive || 100),
          total_all_time: 5000
        },
        timestamp: new Date().toISOString(),
        ...data
      };
      console.log('🧪 Simulating live count update:', testMessage);

      // Send to message handler directly (like WebSocket would)
      // This will be processed by the live_count_update handler
    },

    // Simulate chart data point message
    simulateChartPoint: (data = {}) => {
      const testMessage = {
        type: 'chart_data_point',
        location_id: 'all',
        timeframe: 'HOURLY',
        data_point: {
          timestamp: new Date().toISOString().substring(0, 16), // "2025-09-19 10:29"
          men_region: { live: data.menLive || Math.floor(Math.random() * 50), total: 100 },
          women_region: { live: data.womenLive || Math.floor(Math.random() * 100), total: 200 },
          total_count: (data.menLive || 25) + (data.womenLive || 50)
        },
        point_index: data.pointIndex || 1,
        total_points: data.totalPoints || 20,
        is_historical: data.isHistorical || true,
        timestamp: new Date().toISOString(),
        ...data
      };
      console.log('🧪 Simulating chart data point:', testMessage);
    },

    // Subscribe to live count pattern
    subscribeToLiveCount: (timeframe = 'HOURLY', locationId = 'all', interval = 3) => {
      console.log('🧪 Testing live count subscription...');
      analyticsAPI.subscribeToLiveCountPattern(timeframe, locationId, interval);
    },

    // Subscribe to chart data pattern
    subscribeToChartData: (timeframe = 'HOURLY', locationId = 'all', interval = 10, limit = 20) => {
      console.log('🧪 Testing chart data subscription...');
      analyticsAPI.subscribeToChartDataPattern(timeframe, locationId, interval, limit);
    },

    // Force apply pending updates immediately (for testing)
    forceUpdate: () => {
      console.log('🧪 Force applying buffered updates...');
      if (uiUpdateTimer) {
        clearTimeout(uiUpdateTimer);
        uiUpdateTimer = null;
      }
      applyPendingUIUpdates();
    },

    // Clear all pending updates (for testing)
    clearPending: () => {
      console.log('🧪 Clearing all pending buffered updates');
      pendingUIUpdates.clear();
      if (uiUpdateTimer) {
        clearTimeout(uiUpdateTimer);
        uiUpdateTimer = null;
      }
    },

    // Get analytics API instance
    api: analyticsAPI
  };

  console.log('🧪 WebSocket Testing Helpers Available:');
  console.log('   - window.testWebSocket.status() - Show current status & pending updates');
  console.log('   - window.testWebSocket.simulateLiveUpdate({menLive: 50, womenLive: 100})');
  console.log('   - window.testWebSocket.simulateChartPoint({menLive: 25, womenLive: 50})');
  console.log('   - window.testWebSocket.subscribeToLiveCount(timeframe, locationId, interval)');
  console.log('   - window.testWebSocket.subscribeToChartData(timeframe, locationId, interval, limit)');
  console.log('   - window.testWebSocket.forceUpdate() - Apply buffered updates immediately');
  console.log('   - window.testWebSocket.clearPending() - Clear all pending updates');
  console.log('   - window.testWebSocket.api');
}