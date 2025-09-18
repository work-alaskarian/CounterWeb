/**
 * Analytics API Service
 * Provides GraphQL integration with the Analytics API
 */

const API_URL = 'http://localhost:8080';
const GRAPHQL_ENDPOINT = `${API_URL}/graphql`;
const WEBSOCKET_URL = 'ws://localhost:8080/ws/analytics';

class AnalyticsAPI {
  constructor() {
    this.websocket = null;
    this.subscribers = new Set();
    this.currentTimeframe = 'HOURLY'; // Default timeframe
  }

  /**
   * Execute GraphQL query with enhanced debug logging and retry logic
   */
  async graphql(query, variables = {}, retries = 3) {
    const requestId = Math.random().toString(36).substring(7);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {

        const payload = { query, variables };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const startTime = Date.now();
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          
          // Retry on 500+ errors or network issues
          if (response.status >= 500 && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.errors) {
          console.error(`❌ [${requestId}] GraphQL Errors:`, result.errors);
          
          // Check if errors are retryable
          const isRetryable = result.errors.some(error => 
            error.message.includes('timeout') || 
            error.message.includes('connection') ||
            error.extensions?.code === 'INTERNAL_ERROR'
          );
          
          if (isRetryable && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          
          // Log each error individually for clarity
          result.errors.forEach((error, index) => {
            console.error(`🚫 [${requestId}] Error ${index + 1}:`, {
              message: error.message,
              locations: error.locations,
              path: error.path,
              extensions: error.extensions
            });
          });
          
          throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
        }

        if (!result.data) {
          return null;
        }

        return result.data;
        
      } catch (error) {
        console.error(`❌ [${requestId}] API request failed (attempt ${attempt}):`, error);
        
        // Retry on network errors, timeouts, or connection issues
        const isRetryable = 
          error.name === 'AbortError' ||
          error.name === 'TypeError' ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('timeout');
          
        if (isRetryable && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        
        console.log(`🔍 [${requestId}] Final error details:`, {
          message: error.message,
          stack: error.stack,
          query: query.replace(/\s+/g, ' ').trim(),
          variables: variables,
          attempt: attempt,
          maxRetries: retries
        });
        throw error;
      }
    }
  }

  /**
   * Get all locations
   */
  async getAllLocations() {
    const query = `
      query GetAllLocations {
        allLocations {
          id
          name
          liveCount
        }
      }
    `;
    
    const data = await this.graphql(query);
    // Map backend field names to frontend expectations
    return (data.allLocations || []).map(location => ({
      id: location.id,
      name: location.name,
      liveCount: location.liveCount || location.live_count || 0
    }));
  }

  async getAllLocationsTotal() {
    const query = `
      query GetAllLocationsTotal {
        allLocationsTotal {
          id
          name
          liveCount
        }
      }
    `;
    
    const data = await this.graphql(query);
    return {
      id: data.allLocationsTotal.id,
      name: data.allLocationsTotal.name,
      liveCount: data.allLocationsTotal.liveCount || 0
    };
  }

  /**
   * Get single location by ID
   */
  async getLocation(locationId) {
    const query = `
      query GetLocation($id: String!) {
        location(id: $id) {
          id
          name
          liveCount
        }
      }
    `;
    
    const data = await this.graphql(query, { id: locationId });
    if (data.location) {
      return {
        id: data.location.id,
        name: data.location.name,
        liveCount: data.location.liveCount || data.location.live_count || 0
      };
    }
    return null;
  }

  /**
   * Get real-time count data (NEW)
   */
  async getRealtimeCount(locationId = null, cameraId = null) {
    const query = `
      query GetRealtimeCount($locationId: String, $cameraId: String) {
        realtimeCount(locationId: $locationId, cameraId: $cameraId)
      }
    `;
    
    const data = await this.graphql(query, { locationId, cameraId });
    return JSON.parse(data.realtimeCount);
  }

  /**
   * Get sampling data (NEW)
   */
  async getSamplingData(locationId, period = "minutely") {
    const query = `
      query GetSamplingData($locationId: String!, $period: String!) {
        samplingData(locationId: $locationId, period: $period)
      }
    `;
    
    const data = await this.graphql(query, { locationId, period });
    return JSON.parse(data.samplingData);
  }

  /**
   * Get historical data for reports (NEW)
   */
  async getHistoricalDataReport(locationId = null, period = "daily", forReports = true) {
    const query = `
      query GetHistoricalData($locationId: String, $period: String!, $forReports: Boolean!) {
        historicalData(locationId: $locationId, period: $period, forReports: $forReports)
      }
    `;
    
    const data = await this.graphql(query, { locationId, period, forReports });
    return JSON.parse(data.historicalData);
  }

  /**
   * Get locations for filtering (NEW)
   */
  async getLocationsForFiltering() {
    const query = `
      query GetLocationsForFiltering {
        locationsForFiltering
      }
    `;
    
    const data = await this.graphql(query);
    return JSON.parse(data.locationsForFiltering);
  }

  /**
   * Get cameras for filtering (NEW)
   */
  async getCamerasForFiltering(locationId = null) {
    const query = `
      query GetCamerasForFiltering($locationId: String) {
        camerasForFiltering(locationId: $locationId)
      }
    `;
    
    const data = await this.graphql(query, { locationId });
    return JSON.parse(data.camerasForFiltering);
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(timeframe = 'DAILY') {
    const query = `
      query GetAnalyticsSummary($timeframe: Timeframe!) {
        analyticsSummary(timeframe: $timeframe) {
          totalVisitors
          newVisitors
          avgVisitDurationHours
          peakVisitorsToday
        }
      }
    `;
    
    const data = await this.graphql(query, { timeframe });
    return data.analyticsSummary;
  }

  /**
   * Get analytics chart data
   */
  async getAnalyticsChart(chartType, timeframe = 'MONTHLY') {
    const query = `
      query GetAnalyticsChart($chartType: String!, $timeframe: Timeframe!) {
        analyticsChart(chartType: $chartType, timeframe: $timeframe) {
          labels
          datasets {
            label
            data
          }
        }
      }
    `;
    
    const data = await this.graphql(query, { chartType, timeframe });
    return data.analyticsChart;
  }

  /**
   * Get visitor trends chart data (NEW)
   */
  async getVisitorTrendsChart(timeframe = 'DAILY') {
    return await this.getAnalyticsChart('visitors_over_time', timeframe);
  }

  /**
   * Get location distribution chart data (NEW)
   */
  async getLocationDistributionChart(timeframe = 'DAILY') {
    return await this.getAnalyticsChart('location_distribution', timeframe);
  }

  /**
   * Get camera performance chart data (NEW)
   */
  async getCameraPerformanceChart() {
    const query = `
      query GetCameraAggregations {
        cameraAggregations {
          cameraId
          locationId
          totalDetections
          uniqueFaces
          periodType
          periodStart
          periodEnd
          calculatedAt
        }
      }
    `;
    
    const data = await this.graphql(query);
    return {
      analytics_chart: {
        labels: (data.cameraAggregations || []).map(agg => agg.cameraId || `camera-${agg.locationId}`),
        datasets: [{
          label: 'Total Detections',
          data: (data.cameraAggregations || []).map(agg => agg.totalDetections || 0),
          backgroundColor: 'rgba(22, 160, 133, 0.6)',
          borderColor: '#16a085'
        }, {
          label: 'Unique Faces',
          data: (data.cameraAggregations || []).map(agg => agg.uniqueFaces || 0),
          backgroundColor: 'rgba(52, 152, 219, 0.6)',
          borderColor: '#3498db'
        }]
      }
    };
  }

  /**
   * Get all cameras (NEW)
   */
  async getAllCameras(status = null) {
    const query = `
      query GetAllCameras($status: CameraStatus) {
        allCameras(status: $status) {
          id
          cameraId
          cameraName
          status
          currentLocationId
        }
      }
    `;
    
    const data = await this.graphql(query, { status });
    return { all_cameras: data.allCameras || [] };
  }

  /**
   * Get historical data for table
   */
  async getHistory(params = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = null,
      sortOrder = 'desc',
      search = null,
      dateFrom = null,
      status = null
    } = params;

    const query = `
      query GetHistory(
        $page: Int!,
        $limit: Int!,
        $sortBy: String,
        $sortOrder: String!,
        $search: String,
        $dateFrom: String,
        $status: String
      ) {
        history(
          page: $page,
          limit: $limit,
          sortBy: $sortBy,
          sortOrder: $sortOrder,
          search: $search,
          dateFrom: $dateFrom,
          status: $status
        ) {
          totalItems
          totalPages
          currentPage
          data {
            id
            date
            location
            count
            status
            category
          }
        }
      }
    `;
    
    const data = await this.graphql(query, {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      dateFrom,
      status
    });
    return data.history;
  }

  /**
   * Get map points
   */
  async getMapPoints() {
    const query = `
      query GetMapPoints {
        mapPoints {
          lat
          lng
          text
          count
        }
      }
    `;
    
    const data = await this.graphql(query);
    return data.mapPoints || [];
  }

  /**
   * Create a new location (UPDATED)
   */
  async createLocation(locationData) {
    const mutation = `
      mutation AddLocationNew($locationData: String!) {
        addLocationNew(locationData: $locationData)
      }
    `;
    
    const locationJson = JSON.stringify({
      location_id: locationData.id || locationData.location_id,
      name: locationData.name,
      live_count: locationData.live_count || 0 // No fake initialCount, only real data
    });
    
    const data = await this.graphql(mutation, { locationData: locationJson });
    return JSON.parse(data.addLocationNew);
  }

  /**
   * Add camera (NEW)
   */
  async addCamera(cameraData) {
    const mutation = `
      mutation AddCamera($cameraData: String!) {
        addCamera(cameraData: $cameraData)
      }
    `;
    
    const cameraJson = JSON.stringify({
      camera_id: cameraData.camera_id || cameraData.id,
      location_id: cameraData.location_id || cameraData.locationId,
      name: cameraData.name
    });
    
    const data = await this.graphql(mutation, { cameraData: cameraJson });
    return JSON.parse(data.addCamera);
  }

  /**
   * Add activity (NEW)
   */
  async addActivity(locationId, detectedFaces = null, countOverride = null) {
    const mutation = `
      mutation AddActivity($locationId: String!, $detectedFaces: [String!], $countOverride: Int) {
        addActivity(locationId: $locationId, detectedFaces: $detectedFaces, countOverride: $countOverride)
      }
    `;
    
    const data = await this.graphql(mutation, { locationId, detectedFaces, countOverride });
    return data.addActivity;
  }

  /**
   * Remove a location
   */
  async removeLocation(locationId) {
    const mutation = `
      mutation RemoveLocation($id: String!) {
        removeLocation(id: $id)
      }
    `;
    
    const data = await this.graphql(mutation, { id: locationId });
    return data.removeLocation;
  }

  /**
   * Connect to WebSocket for real-time updates with exponential backoff
   */
  connectWebSocket() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    // Initialize reconnection state if not exists
    if (!this.reconnectionState) {
      this.reconnectionState = {
        attempts: 0,
        maxAttempts: 10,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 1.5
      };
    }

    try {
      console.log(`🔌 Attempting WebSocket connection (attempt ${this.reconnectionState.attempts + 1}/${this.reconnectionState.maxAttempts})`);
      this.websocket = new WebSocket(WEBSOCKET_URL);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.websocket?.readyState === WebSocket.CONNECTING) {
          console.log('⏰ WebSocket connection timeout');
          this.websocket.close();
        }
      }, 10000);

      this.websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ WebSocket connected to Analytics API');
        
        // Reset reconnection state on successful connection
        this.reconnectionState.attempts = 0;
        
        // Send ping to keep connection alive
        this.sendWebSocketMessage({ action: 'ping' });
        
        // Subscribe to all locations updates with current timeframe
        this.subscribeToAllLocations(this.currentTimeframe);
        
        // Keep alive ping every 30 seconds
        this.pingInterval = setInterval(() => {
          if (this.websocket?.readyState === WebSocket.OPEN) {
            this.sendWebSocketMessage({ action: 'ping' });
          }
        }, 30000);
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          
          // Transform the data to match expected format
          if (data.type === 'live_count_update') {
            const transformedData = {
              event: 'liveUpdate',
              locationId: data.location_id,
              liveCount: data.live_count,
              timestamp: data.timestamp,
              message: data.message
            };
            this.notifySubscribers(transformedData);
          } else {
            this.notifySubscribers(data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`❌ WebSocket disconnected from Analytics API (code: ${event.code}, reason: ${event.reason})`);
        
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        // Notify fallback system
        this.notifySubscribers({ 
          event: 'websocketDisconnected', 
          code: event.code,
          reason: event.reason,
          timestamp: new Date().toISOString()
        });
        
        // Only attempt reconnection if we have subscribers and haven't exceeded max attempts
        if (this.subscribers.size > 0 && this.reconnectionState.attempts < this.reconnectionState.maxAttempts) {
          this.scheduleReconnection();
        } else if (this.reconnectionState.attempts >= this.reconnectionState.maxAttempts) {
          console.error('❌ WebSocket max reconnection attempts reached. Connection failed permanently.');
          this.notifySubscribers({ 
            event: 'connectionFailed', 
            message: 'WebSocket connection failed after maximum retry attempts',
            maxAttemptsReached: true,
            timestamp: new Date().toISOString()
          });
        }
      };

      this.websocket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error:', error);
        this.reconnectionState.attempts++;
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.scheduleReconnection();
    }
  }

  /**
   * Schedule WebSocket reconnection with exponential backoff
   */
  scheduleReconnection() {
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
    }

    const delay = Math.min(
      this.reconnectionState.baseDelay * Math.pow(this.reconnectionState.backoffFactor, this.reconnectionState.attempts),
      this.reconnectionState.maxDelay
    );

    console.log(`🔄 Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectionState.attempts + 1}/${this.reconnectionState.maxAttempts})`);

    this.reconnectionTimeout = setTimeout(() => {
      if (this.subscribers.size > 0) {
        this.connectWebSocket();
      }
    }, delay);
  }

  /**
   * Reset WebSocket connection state
   */
  resetWebSocketConnection() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }
    
    this.reconnectionState = {
      attempts: 0,
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 1.5
    };
  }

  /**
   * Send message through WebSocket
   */
  sendWebSocketMessage(message) {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to all locations for real-time updates with timeframe
   */
  async subscribeToAllLocations(timeframe = 'HOURLY') {
    try {
      // Get all locations first
      const locations = await this.getAllLocations();
      
      // Subscribe to each location with timeframe
      locations.forEach(location => {
        this.sendWebSocketMessage({
          action: 'subscribe',
          locationId: location.id,
          timeframe: timeframe
        });
        console.log(`🔔 Subscribed to location: ${location.id} with timeframe: ${timeframe}`);
      });
    } catch (error) {
      console.error('Failed to subscribe to locations:', error);
    }
  }

  /**
   * Subscribe to specific location with timeframe
   */
  subscribeToLocation(locationId, timeframe = 'HOURLY') {
    this.sendWebSocketMessage({
      action: 'subscribe',
      locationId: locationId,
      timeframe: timeframe
    });
    console.log(`🔔 Subscribed to location: ${locationId} with timeframe: ${timeframe}`);
  }

  /**
   * Update timeframe for existing subscriptions
   */
  updateTimeframe(timeframe) {
    this.currentTimeframe = timeframe;
    this.sendWebSocketMessage({
      action: 'set_timeframe',
      timeframe: timeframe
    });
    console.log(`📅 Updated timeframe to: ${timeframe}`);
  }

  /**
   * Request progressive sample loading for smooth initialization
   */
  loadProgressiveSamples(locationId, timeframe, sampleCount = 50) {
    this.sendWebSocketMessage({
      action: 'load_progressive_samples',
      locationId: locationId,
      timeframe: timeframe,
      sampleCount: sampleCount
    });
    console.log(`📈 Requesting progressive samples: ${locationId}, ${timeframe}, ${sampleCount} samples`);
  }

  /**
   * Request chart data via WebSocket (replaces periodic GraphQL requests)
   */
  requestChartData(locationId, timeframe) {
    this.sendWebSocketMessage({
      action: 'request_chart_data',
      locationId: locationId,
      timeframe: timeframe
    });
    console.log(`📊 Requesting chart data: ${locationId}, ${timeframe}`);
  }

  /**
   * Request analytics summary via WebSocket (replaces periodic GraphQL requests)
   */
  requestAnalyticsSummary(timeframe = 'DAILY') {
    this.sendWebSocketMessage({
      action: 'request_analytics_summary',
      timeframe: timeframe
    });
    console.log(`📈 Requesting analytics summary: ${timeframe}`);
  }

  /**
   * Refresh all data via WebSocket (replaces periodic refresh)
   */
  refreshAllData() {
    this.sendWebSocketMessage({
      action: 'refresh_data'
    });
    console.log(`🔄 Requesting data refresh`);
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Connect WebSocket if not already connected
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      
      // Close WebSocket if no more subscribers
      if (this.subscribers.size === 0) {
        this.resetWebSocketConnection();
      }
    };
  }

  /**
   * Notify all subscribers of updates
   */
  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      console.log('🔍 CounterWeb: Testing API connection...');
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      const isHealthy = data.status === 'healthy';
      console.log(isHealthy ? '✅ CounterWeb: API is healthy' : '❌ CounterWeb: API is unhealthy');
      return isHealthy;
    } catch (error) {
      console.error('❌ CounterWeb: Health check failed:', error);
      return false;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      console.log('🔍 CounterWeb: Testing GraphQL connection...');
      
      // Test with a simple query
      const testQuery = `
        query TestConnection {
          allLocations {
            id
            name
          }
        }
      `;
      
      await this.graphql(testQuery);
      console.log('✅ CounterWeb: GraphQL connection successful');
      return true;
    } catch (error) {
      console.error('❌ CounterWeb: GraphQL connection test failed:', error);
      return false;
    }
  }

  /**
   * Setup connection change callbacks
   */
  onConnectionChange(callback) {
    // For now, just call healthCheck periodically
    setInterval(async () => {
      const isConnected = await this.healthCheck();
      callback(isConnected);
    }, 30000); // Every 30 seconds
  }

  /**
   * Get time-based chart data for location
   */
  async getLocationChartData(locationId, timeframe = 'HOURLY') {
    const location = await this.getLocation(locationId);
    if (!location || !location.historicalData) {
      return [];
    }

    return location.historicalData;
  }
}

// Create singleton instance
export const analyticsAPI = new AnalyticsAPI();
export default analyticsAPI;