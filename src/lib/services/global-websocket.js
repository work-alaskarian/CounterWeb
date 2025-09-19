/**
 * SIMPLE Global WebSocket Service
 * ONE connection for entire app - no complexity, no stores, no buffering
 */

class GlobalWebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.subscribers = new Map(); // locationId -> callback function
    this.connectionCallbacks = new Set(); // connection status callbacks
    this.currentTimeframe = 'HOURLY'; // Track current timeframe
    this.isReconnecting = false; // Track if we're reconnecting due to timeframe change

    console.log('🌐 Global WebSocket Service initialized');
  }

  /**
   * Connect to WebSocket - SINGLE CONNECTION
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🌐 Already connected to WebSocket');
      return;
    }

    const wsUrl = 'ws://10.10.1.205:8080/ws/analytics';
    console.log(`🌐 Connecting to ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('🌐 ✅ Global WebSocket connected');
      this.isConnected = true;
      this.isReconnecting = false;

      // Notify all connection callbacks
      this.connectionCallbacks.forEach(callback => {
        try {
          callback({ type: 'connected' });
        } catch (error) {
          console.error('🌐 Error in connection callback:', error);
        }
      });

      // Subscribe to live count pattern for all locations with current timeframe
      this.sendSubscription();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🌐 📨 Raw WebSocket message:', data);

        this.handleMessage(data);
      } catch (error) {
        console.error('🌐 Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🌐 🔌 WebSocket disconnected');
      this.isConnected = false;

      // Only notify disconnection if we're not intentionally reconnecting
      if (!this.isReconnecting) {
        this.connectionCallbacks.forEach(callback => {
          try {
            callback({ type: 'disconnected' });
          } catch (error) {
            console.error('🌐 Error in connection callback:', error);
          }
        });

        // Attempt to reconnect after 5 seconds (only for unexpected disconnections)
        setTimeout(() => {
          console.log('🌐 🔄 Attempting to reconnect...');
          this.connect();
        }, 5000);
      }
    };

    this.ws.onerror = (error) => {
      console.error('🌐 ❌ WebSocket error:', error);

      // Notify all connection callbacks
      this.connectionCallbacks.forEach(callback => {
        try {
          callback({ type: 'error', error });
        } catch (error) {
          console.error('🌐 Error in connection callback:', error);
        }
      });
    };
  }

  /**
   * Handle incoming WebSocket messages - TIMEFRAME FILTERED VERSION
   */
  handleMessage(data) {
    // ONLY process live_count_update messages
    if (data.type === 'live_count_update' && data.location_id === 'all') {
      console.log('🌐 🎯 Processing live_count_update for location_id=all');
      console.log('🌐 📊 Message timeframe:', data.timeframe, 'Current timeframe:', this.currentTimeframe);

      // IMPORTANT: Only process if timeframe matches current selection
      if (data.timeframe !== this.currentTimeframe) {
        console.log(`🌐 🚫 IGNORING message - timeframe mismatch: got ${data.timeframe}, want ${this.currentTimeframe}`);
        return;
      }

      console.log('🌐 ✅ Timeframe matches, processing data');
      console.log('🌐 📊 Full data received:', data.data);

      // Extract different counts for different locations
      const menRegionLive = data.data?.men_region?.live;
      const womenRegionLive = data.data?.women_region?.live;
      const totalCount = data.data?.total_count;

      console.log(`🌐 📊 Extracted counts for ${this.currentTimeframe}:`, {
        men_region: menRegionLive,
        women_region: womenRegionLive,
        total_count: totalCount
      });

      // Notify subscribers with location-specific data
      this.subscribers.forEach((callback, locationId) => {
        try {
          let countForLocation;

          // Determine which count to send based on location ID
          if (locationId === 'men_region' || locationId === 'northern-gate') {
            countForLocation = menRegionLive;
            console.log(`🌐 📊 Updating ${locationId} with men_region.live: ${countForLocation}`);
          } else if (locationId === 'women_region' || locationId === 'womens-section') {
            countForLocation = womenRegionLive;
            console.log(`🌐 📊 Updating ${locationId} with women_region.live: ${countForLocation}`);
          } else if (locationId === 'all') {
            countForLocation = totalCount;
            console.log(`🌐 📊 Updating ${locationId} with total_count: ${countForLocation}`);
          } else {
            countForLocation = totalCount; // Default fallback
            console.log(`🌐 📊 Updating ${locationId} with total_count (fallback): ${countForLocation}`);
          }

          if (countForLocation !== undefined) {
            callback({
              count: countForLocation,
              data: data.data,
              locationSpecific: {
                men_region: menRegionLive,
                women_region: womenRegionLive,
                total_count: totalCount
              }
            });
          } else {
            console.log(`🌐 ⚠️ No count available for ${locationId}`);
          }
        } catch (error) {
          console.error(`🌐 Error updating ${locationId}:`, error);
        }
      });
    } else if (data.type === 'live_count_subscribed') {
      console.log('🌐 🔔 Live count subscription confirmed:', data.message);
    } else {
      console.log(`🌐 🚫 Ignoring message - type: ${data.type}, location_id: ${data.location_id}`);
    }
  }

  /**
   * Subscribe to live count updates - SIMPLE
   */
  subscribe(locationId, callback) {
    console.log(`🌐 📝 Subscribing ${locationId} to live count updates`);
    this.subscribers.set(locationId, callback);

    // Connect if not already connected
    if (!this.isConnected) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      console.log(`🌐 📝 Unsubscribing ${locationId} from live count updates`);
      this.subscribers.delete(locationId);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);

    // Immediately notify of current status
    if (this.isConnected) {
      callback({ type: 'connected' });
    }

    // Return unsubscribe function
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * Send subscription message with current timeframe
   */
  sendSubscription() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        action: "subscribe_pattern",
        pattern: "live_count",
        locationId: "all",
        interval: 3,
        timeframe: this.currentTimeframe
      };
      console.log('🌐 📤 Subscribing to live count pattern:', subscribeMessage);
      this.ws.send(JSON.stringify(subscribeMessage));
    } else {
      console.log('🌐 ⚠️ Cannot send subscription - WebSocket not connected');
    }
  }

  /**
   * Update timeframe - close and reopen WebSocket connection
   */
  updateTimeframe(newTimeframe) {
    console.log(`🌐 📅 Timeframe changing from ${this.currentTimeframe} to ${newTimeframe}`);

    if (this.currentTimeframe === newTimeframe) {
      console.log('🌐 📅 Timeframe unchanged, no reconnection needed');
      return;
    }

    this.currentTimeframe = newTimeframe;

    if (this.isConnected) {
      console.log('🌐 🔄 Closing WebSocket for timeframe change...');

      // Mark as reconnecting to avoid showing disconnection state
      this.isReconnecting = true;

      // Notify subscribers to reset their counts for timeframe change
      this.connectionCallbacks.forEach(callback => {
        try {
          callback({ type: 'timeframe_reset', reason: 'timeframe_change' });
        } catch (error) {
          console.error('🌐 Error in connection callback:', error);
        }
      });

      // Close current connection
      this.ws.close();

      // Reconnect after a short delay
      setTimeout(() => {
        console.log('🌐 🔄 Reconnecting with new timeframe...');
        this.connect();
      }, 300); // Shorter delay for faster reconnection
    } else {
      console.log('🌐 📅 WebSocket not connected, timeframe updated for next connection');
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    console.log('🌐 🔌 Disconnecting global WebSocket');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribers.clear();
    this.connectionCallbacks.clear();
  }
}

// Create singleton instance
const globalWebSocketService = new GlobalWebSocketService();

export default globalWebSocketService;