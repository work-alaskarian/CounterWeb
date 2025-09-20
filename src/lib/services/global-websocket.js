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
      console.log('🌐 🎯 Processing live_count_update for location_id=all');
      console.log('🌐 📊 Message timeframe:', data.timeframe, 'Current timeframe:', this.currentTimeframe);

      // IMPORTANT: Only process if timeframe matches current selection
      if (data.timeframe !== this.currentTimeframe) {
        console.log(`🌐 🚫 IGNORING message - timeframe mismatch: got ${data.timeframe}, want ${this.currentTimeframe}`);
        return;
      }

      console.log('🌐 ✅ Timeframe matches, processing data');
      console.log('🌐 📊 Full data received:', data.data);
      console.log('🌐 🕐 Server timestamp:', data.data?.timestamp);
      console.log('🌐 📈 IMPORTANT COUNTS:');
      console.log('  🔢 Current hour total_count:', data.data?.total_count);
      console.log('  📊 All-time total_all_time:', data.data?.total_all_time);
      console.log('  👨 Men region live:', data.data?.men_region?.live);
      console.log('  👨 Men region total:', data.data?.men_region?.total);
      console.log('  👩 Women region live:', data.data?.women_region?.live);
      console.log('  👩 Women region total:', data.data?.women_region?.total);

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
    console.log(`🌐 📝 🚀 SUBSCRIBE called for locationId: ${locationId}`);
    console.log(`🌐 📊 Current subscribers before add:`, Array.from(this.subscribers.keys()));
    console.log(`🌐 🔧 Connection status: ${this.isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);

    this.subscribers.set(locationId, callback);
    console.log(`🌐 ✅ Subscriber added. Total subscribers: ${this.subscribers.size}`);
    console.log(`🌐 📊 All subscribers:`, Array.from(this.subscribers.keys()));

    // Connect if not already connected
    if (!this.isConnected) {
      console.log(`🌐 🔌 Not connected, calling connect()...`);
      this.connect();
    } else {
      console.log(`🌐 ✅ Already connected, no need to reconnect`);
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
   * Start keep-alive ping to prevent server timeout
   */
  startKeepAlive() {
    console.log('🌐 💓 Starting keep-alive ping every 30 seconds');

    // Clear any existing keep-alive
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('🌐 💓 Sending keep-alive ping...');
        this.ws.send(JSON.stringify({ action: "ping" }));
      } else {
        console.log('🌐 💓 WebSocket not open, stopping keep-alive');
        clearInterval(this.keepAliveInterval);
      }
    }, 30000);
  }

  /**
   * Send subscription message with current timeframe
   */
  sendSubscription() {
    console.log('🌐 📤 sendSubscription() called');
    console.log('🌐 📊 WebSocket state:', this.ws ? this.ws.readyState : 'null');
    console.log('🌐 📊 WebSocket.OPEN constant:', WebSocket.OPEN);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        action: "subscribe_pattern",
        pattern: "live_count",
        locationId: "all",
        interval: 5, // Better interval for viewing updates (5 seconds)
        timeframe: this.currentTimeframe
      };

      console.log('🌐 📤 SENDING SUBSCRIPTION MESSAGE:', subscribeMessage);
      console.log('🌐 📤 Message as JSON:', JSON.stringify(subscribeMessage));

      try {
        this.ws.send(JSON.stringify(subscribeMessage));
        console.log('🌐 ✅ Subscription message sent successfully!');
        console.log('🌐 📊 WebSocket state after send:', this.ws.readyState);
      } catch (error) {
        console.error('🌐 ❌ Failed to send subscription message:', error);
        console.error('🌐 📊 WebSocket state when send failed:', this.ws.readyState);
      }
    } else {
      console.error('🌐 ❌ Cannot send subscription - WebSocket not connected or not ready');
      console.error('🌐 ❌ WebSocket exists:', !!this.ws);
      console.error('🌐 ❌ WebSocket readyState:', this.ws ? this.ws.readyState : 'WebSocket is null');
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