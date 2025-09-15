/**
 * Analytics API Service
 * Provides GraphQL integration with the Analytics API
 */

const API_URL = 'http://localhost:8000';
const GRAPHQL_ENDPOINT = `${API_URL}/graphql`;
const WEBSOCKET_URL = 'ws://localhost:8000/ws/analytics';

class AnalyticsAPI {
  constructor() {
    this.websocket = null;
    this.subscribers = new Set();
  }

  /**
   * Execute GraphQL query
   */
  async graphql(query, variables = {}) {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }

      return result.data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
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
    return data.allLocations || [];
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
    return data.location;
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
      live_count: locationData.initialCount || locationData.live_count || 0
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
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.websocket = new WebSocket(WEBSOCKET_URL);

      this.websocket.onopen = () => {
        console.log('✅ WebSocket connected to Analytics API');
        
        // Send ping to keep connection alive
        this.sendWebSocketMessage({ action: 'ping' });
        
        // Subscribe to all locations updates
        this.subscribeToAllLocations();
        
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

      this.websocket.onclose = () => {
        console.log('❌ WebSocket disconnected from Analytics API');
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
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
   * Subscribe to all locations for real-time updates
   */
  async subscribeToAllLocations() {
    try {
      // Get all locations first
      const locations = await this.getAllLocations();
      
      // Subscribe to each location
      locations.forEach(location => {
        this.sendWebSocketMessage({
          action: 'subscribe',
          locationId: location.id
        });
        console.log(`🔔 Subscribed to location: ${location.id}`);
      });
    } catch (error) {
      console.error('Failed to subscribe to locations:', error);
    }
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
      if (this.subscribers.size === 0 && this.websocket) {
        this.websocket.close();
        this.websocket = null;
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
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
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