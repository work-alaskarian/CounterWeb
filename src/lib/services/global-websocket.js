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
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // Start with 3 seconds

    console.log('🌐 Global WebSocket Service initialized');
  }

  /**
   * Connect to WebSocket - SINGLE CONNECTION
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.info('🌐 Already connected to WebSocket');
      return;
    }

    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://10.10.1.205:8080/ws/analytics';
    console.info(`🌐 Connecting to: ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('🌐 ✅ WebSocket connected');
      this.isConnected = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 3000;

      // Notify connection callbacks
      this.connectionCallbacks.forEach(callback => {
        try {
          callback({ type: 'connected' });
        } catch (error) {
          console.error('🌐 Connection callback error:', error);
        }
      });

      // Send subscription and start keep-alive
      this.sendSubscription();
      this.startKeepAlive();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('🌐 Message parse error:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      if (event.code !== 1000) {
        console.warn(`🌐 WebSocket closed (code: ${event.code})`, event.reason);
      }

      // Only notify disconnection if we're not intentionally reconnecting
      if (!this.isReconnecting) {
        this.connectionCallbacks.forEach(callback => {
          try {
            callback({ type: 'disconnected' });
          } catch (error) {
            console.error('🌐 Error in connection callback:', error);
          }
        });

        // Attempt to reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
          console.info(`🌐 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

          setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          console.error('🌐 Max reconnection attempts reached');
          this.connectionCallbacks.forEach(callback => {
            try {
              callback({ type: 'fallback', reason: 'WebSocket connection failed after multiple attempts' });
            } catch (error) {
              console.error('🌐 Connection callback error:', error);
            }
          });
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error('🌐 WebSocket error:', error);

      this.connectionCallbacks.forEach(callback => {
        try {
          callback({ type: 'error', error });
        } catch (error) {
          console.error('🌐 Connection callback error:', error);
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

      // IMPORTANT: Only process if timeframe matches current selection
      if (data.timeframe !== this.currentTimeframe) {
        console.debug(`🌐 Ignoring ${data.timeframe} (want ${this.currentTimeframe})`);
        return;
      }

      // Log important counts
      console.log('📊 Live counts:', {
        total: data.data?.total_count,
        men: data.data?.men_region?.live,
        women: data.data?.women_region?.live,
        timeframe: data.timeframe
      });

      // Extract different counts for different locations
      const menRegionLive = data.data?.men_region?.live;
      const womenRegionLive = data.data?.women_region?.live;
      const totalCount = data.data?.total_count;

      // Notify subscribers with location-specific data
      this.subscribers.forEach((callback, locationId) => {
        try {
          let countForLocation;

          // Determine which count to send based on location ID
          if (locationId === 'men_region' || locationId === 'northern-gate') {
            countForLocation = menRegionLive;
          } else if (locationId === 'women_region' || locationId === 'womens-section') {
            countForLocation = womenRegionLive;
          } else if (locationId === 'all') {
            countForLocation = totalCount;
          } else {
            countForLocation = totalCount; // Default fallback
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
            console.warn(`🌐 No count available for ${locationId}`);
          }
        } catch (error) {
          console.error(`🌐 Update error for ${locationId}:`, error);
        }
      });
    } else if (data.type === 'live_count_subscribed') {
      console.log('🌐 Subscription confirmed');
    } else {
      console.debug(`🌐 Ignoring message: ${data.type}`);
    }
  }

  /**
   * Subscribe to live count updates - SIMPLE
   */
  subscribe(locationId, callback) {
    this.subscribers.set(locationId, callback);
    console.info(`🌐 Subscribed: ${locationId} (${this.subscribers.size} total)`);

    // Connect if not already connected
    if (!this.isConnected) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(locationId);
      console.info(`🌐 Unsubscribed: ${locationId}`);
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
   * Start keep-alive ping to prevent server timeout
   */
  startKeepAlive() {
    // Clear any existing keep-alive
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "ping" }));
      } else {
        clearInterval(this.keepAliveInterval);
      }
    }, 30000);
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
        interval: 5,
        timeframe: this.currentTimeframe
      };

      try {
        this.ws.send(JSON.stringify(subscribeMessage));
        console.log(`🌐 Subscribed to ${this.currentTimeframe} updates`);
      } catch (error) {
        console.error('🌐 Subscription failed:', error);
      }
    } else {
      console.error('🌐 Cannot send subscription - WebSocket not ready');
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