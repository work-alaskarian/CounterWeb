/**
 * SUPER SIMPLE WebSocket Worker
 * Just WebSocket → Direct Display (NO STORES, NO INDEXEDDB, NO REACTIVE)
 */
export default class WebSocketWorker {
  constructor(locationId, timeframe = 'HOURLY') {
    this.locationId = locationId;
    this.timeframe = timeframe;
    this.ws = null;
    this.isConnected = false;

    // Only one callback needed - direct update
    this.onUpdate = null;

    console.log(`🔧 SIMPLE WebSocketWorker: Created for location ${locationId}`);
  }

  /**
   * Connect to WebSocket server - SIMPLE VERSION
   */
  connect() {
    const wsUrl = 'ws://10.10.1.234:8080/ws/analytics';
    console.log(`🔌 SIMPLE: Connecting to ${wsUrl} for ${this.locationId}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`✅ SIMPLE: Connected for ${this.locationId}`);
      this.isConnected = true;

      // Subscribe exactly as you specified
      const subscribeMessage = {
        action: "subscribe_pattern",
        pattern: "live_count",
        locationId: "all",
        interval: 3,
        timeframe: "HOURLY"
      };
      console.log(`📤 SIMPLE: Subscribing with your exact format:`, subscribeMessage);
      this.ws.send(JSON.stringify(subscribeMessage));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(`📨 SIMPLE: Raw message for ${this.locationId}:`, data);

      // ONLY process live_count_update messages for location_id = "all"
      if (data.type === 'live_count_update' && data.location_id === 'all') {
        console.log(`🎯 SIMPLE: Processing live_count_update for location_id=all`);
        console.log(`📊 SIMPLE: Full data received:`, data.data);

        // Extract ONLY data.total_count as you specified
        const totalCount = data.data?.total_count;

        if (totalCount !== undefined) {
          console.log(`✅ SIMPLE: Found total_count = ${totalCount}`);
          console.log(`📈 SIMPLE: Men region live: ${data.data?.men_region?.live || 'N/A'}`);
          console.log(`📈 SIMPLE: Women region live: ${data.data?.women_region?.live || 'N/A'}`);
          console.log(`🚀 SIMPLE: Updating display with total_count = ${totalCount}`);

          // Call the update callback with total_count
          if (this.onUpdate) {
            this.onUpdate({ count: totalCount });
          }
        } else {
          console.log(`⚠️ SIMPLE: No total_count found in data:`, data.data);
        }
      }
      else if (data.type === 'live_count_subscribed') {
        console.log(`🔔 SIMPLE: Subscription confirmed:`, data.message);
      }
      else {
        console.log(`🚫 SIMPLE: Ignoring message - type: ${data.type}, location_id: ${data.location_id}`);
      }
    };

    this.ws.onclose = () => {
      console.log(`🔌 SIMPLE: Disconnected for ${this.locationId}`);
      this.isConnected = false;
    };

    this.ws.onerror = (error) => {
      console.error(`❌ SIMPLE: Error for ${this.locationId}:`, error);
    };
  }

  /**
   * Disconnect from WebSocket - SIMPLE VERSION
   */
  disconnect() {
    console.log(`🔌 SIMPLE: Disconnecting ${this.locationId}`);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Update timeframe - SIMPLE VERSION
   */
  updateTimeframe(newTimeframe) {
    console.log(`📅 SIMPLE: Updating timeframe to ${newTimeframe} for ${this.locationId}`);
    this.timeframe = newTimeframe;
    // Just reconnect with new timeframe
    if (this.isConnected) {
      this.disconnect();
      setTimeout(() => this.connect(), 100);
    }
  }
}