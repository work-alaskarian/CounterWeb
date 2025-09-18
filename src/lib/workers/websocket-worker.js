/**
 * WebSocket Worker for per-LiveCounter dedicated connections
 * Provides isolated WebSocket connections for each location counter with IndexedDB persistence
 */

import { getIndexedDBService } from '../storage/indexeddb-service.js';

class WebSocketWorker {
  constructor(locationId, timeframe = 'HOURLY') {
    this.locationId = locationId;
    this.timeframe = timeframe;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.lastHeartbeat = null;
    
    // IndexedDB service for persistent storage
    this.indexedDB = getIndexedDBService();
    this.hasPersistedData = false;
    
    // Subscription tracking
    this.isSubscribed = false;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    this.websocket = null;
    
    // Event handlers that can be set by the component
    this.onUpdate = null;
    this.onChartData = null;
    this.onError = null;
    this.onConnect = null;
    this.onDisconnect = null;
    
    // Data caching for resilience and cumulative counting
    this.lastKnownCount = 0;
    this.cumulativeCount = 0; // Never reset to 0 - always cumulative
    this.lastChartData = [];
    this.totalChartData = []; // Cumulative chart data
    this.connectionId = `ws_${locationId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Cumulative tracking to prevent showing 0
    this.hasReceivedData = false;
    this.cumulativeCountsByTimeframe = {
      'HOURLY': 0,
      'DAILY': 0, 
      'WEEKLY': 0,
      'MONTHLY': 0
    };
    
    // Camera health tracking
    this.cameraHealth = null;
    
    
    // Load persisted data on initialization
    this.loadPersistedData();
  }
  
  /**
   * Load persisted data from IndexedDB
   */
  async loadPersistedData() {
    try {
      // Load latest count data
      const latestCount = await this.indexedDB.getLatestLiveCount(this.locationId, this.timeframe);
      if (latestCount) {
        this.cumulativeCount = latestCount.cumulative_count || 0;
        this.lastKnownCount = latestCount.count || 0;
        
        // Update timeframe counts
        const timeframeKey = this.timeframe.toUpperCase();
        if (this.cumulativeCountsByTimeframe[timeframeKey] !== undefined) {
          this.cumulativeCountsByTimeframe[timeframeKey] = latestCount.timeframe_count || 0;
        }
        
        this.hasPersistedData = true;
        this.hasReceivedData = true;
        
        
        // Trigger initial update with persisted data
        if (this.onUpdate) {
          this.onUpdate({
            count: this.cumulativeCount,
            cumulativeCount: this.cumulativeCount,
            timeframeCount: latestCount.timeframe_count || 0,
            timeframe: this.timeframe,
            timestamp: latestCount.timestamp,
            source: 'indexeddb',
            isCumulative: true,
            isPersisted: true
          });
        }
      }
      
      // Load latest chart data
      const latestChartData = await this.indexedDB.getLatestChartData(this.locationId, this.timeframe);
      if (latestChartData && this.onChartData) {
        this.lastChartData = latestChartData;
        this.totalChartData = this.makeCumulative(latestChartData);
        
        
        this.onChartData({
          chartData: this.totalChartData,
          locationId: this.locationId,
          timeframe: this.timeframe,
          source: 'indexeddb',
          isPersisted: true
        });
      }
      
    } catch (error) {
      console.error(`❌ ${this.connectionId}: Failed to load persisted data:`, error);
    }
  }
  
  /**
   * Connect to WebSocket with auto-reconnection
   */
  connect() {
    if (this.isConnected || this.websocket) {
      return;
    }
    
    try {
      const wsUrl = this.getWebSocketUrl();
      console.log(`🔌 ${this.connectionId}: Connecting to ${wsUrl}`);
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log(`✅ ${this.connectionId}: Connected`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay
        
        // Send subscription request for this specific location
        this.subscribe();
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Sync offline data if this is a reconnection
        if (this.reconnectAttempts > 0 || this.hasPersistedData) {
          this.syncOfflineData();
        }
        
        if (this.onConnect) {
          this.onConnect();
        }
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error(`❌ ${this.connectionId}: Failed to parse message:`, error);
        }
      };
      
      this.websocket.onclose = (event) => {
        console.warn(`🔌 ${this.connectionId}: Connection closed (${event.code}: ${event.reason})`);
        this.handleDisconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error(`❌ ${this.connectionId}: WebSocket error:`, error);
        this.handleError(error);
      };
      
    } catch (error) {
      console.error(`❌ ${this.connectionId}: Failed to create WebSocket:`, error);
      this.handleError(error);
    }
  }
  
  /**
   * Get WebSocket URL for this worker
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8080'; // Backend analytics server port
    return `${protocol}//${host}:${port}/ws/analytics`;
  }
  
  /**
   * Subscribe to location-specific updates using new pattern-based API
   */
  subscribe() {
    if (!this.isConnected || !this.websocket) {
      return;
    }
    
    // Prevent duplicate subscriptions
    if (this.isSubscribed) {
      return;
    }
    
    console.log(`📡 ${this.connectionId}: Subscribing to pattern-based updates for ${this.locationId}`);
    
    // Subscribe to live count pattern - auto-sends live counts every 3 seconds
    const liveCountSubscription = {
      action: 'subscribe_pattern',
      pattern: 'live_count',
      locationId: this.locationId,
      interval: 3, // Every 3 seconds for live updates
      timeframe: this.timeframe
    };
    this.websocket.send(JSON.stringify(liveCountSubscription));
    
    // Subscribe to chart data pattern - auto-sends chart data every 10 seconds
    const chartDataSubscription = {
      action: 'subscribe_pattern',
      pattern: 'chart_data',
      locationId: this.locationId,
      interval: 10, // Every 10 seconds for chart updates
      timeframe: this.timeframe,
      limit: 20 // Last 20 data points
    };
    this.websocket.send(JSON.stringify(chartDataSubscription));
    
    // Subscribe to ping_pong pattern for health monitoring - every 30 seconds
    const pingPongSubscription = {
      action: 'subscribe_pattern',
      pattern: 'ping_pong',
      interval: 30 // Every 30 seconds for health checks
    };
    this.websocket.send(JSON.stringify(pingPongSubscription));
    
    // Mark as subscribed after sending all subscription messages
    this.isSubscribed = true;
  }
  
  /**
   * Request initial data for this location (no longer needed with pattern-based auto-sending)
   */
  requestData() {
    // No longer needed - pattern subscriptions automatically send data
    // The pattern manager will handle sending initial and periodic updates
    console.log(`📡 ${this.connectionId}: Pattern subscriptions active - data will be sent automatically`);
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    this.lastHeartbeat = Date.now();
    
    // Only process messages for this worker's location
    if (data.location_id && data.location_id !== this.locationId) {
      return; // Ignore messages for other locations
    }
    
    // Only process messages for this worker instance
    if (data.worker_id && data.worker_id !== this.connectionId) {
      return; // Ignore messages for other workers
    }
    
    console.log(`📡 ${this.connectionId}: Message received:`, data.type);
    
    switch (data.type) {
      // NEW PATTERN-BASED MESSAGE TYPES
      case 'live_count_subscribed':
        console.log(`✅ ${this.connectionId}: Live count pattern subscribed`);
        break;
        
      case 'live_count_update':
        this.handleLiveCountUpdate(data);
        break;
        
      case 'chart_data_subscribed':
        console.log(`✅ ${this.connectionId}: Chart data pattern subscribed`);
        break;
        
      case 'chart_data_point':
        this.handleChartDataUpdate(data);
        break;
        
      case 'ping_pong_subscribed':
        console.log(`✅ ${this.connectionId}: Ping pong pattern subscribed`);
        break;
        
      case 'ping':
        // Health ping from server - respond with pong
        this.websocket.send(JSON.stringify({
          action: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
        
      // LEGACY MESSAGE TYPES (for backward compatibility)
      case 'timeframe_update':
        this.handleLiveCountUpdate(data);
        break;
        
      case 'chart_data_update':
      case 'chart_data_response':
        this.handleChartDataUpdate(data);
        break;
        
      case 'progressive_sample':
        this.handleProgressiveSample(data);
        break;
        
      case 'progressive_loading_complete':
        this.handleProgressiveComplete(data);
        break;
        
      case 'live_count_error':
      case 'chart_data_error':
        this.handleServerError(data);
        break;
        
      case 'pong':
        // Heartbeat response (legacy)
        break;
        
      case 'camera_health_update':
        this.handleCameraHealthUpdate(data);
        break;
        
      case 'error':
        this.handleServerError(data);
        break;
        
      case 'connection_warning':
        this.handleConnectionWarning(data);
        break;
        
      default:
        console.log(`🤷 ${this.connectionId}: Unknown message type:`, data.type);
    }
  }
  
  /**
   * Handle live count updates with cumulative logic
   */
  handleLiveCountUpdate(data) {
    const incomingCount = data.cumulative_count || data.live_count || 0;
    const currentTimeframe = data.timeframe || this.timeframe;
    
    // Store count by timeframe for cumulative tracking
    // Handle both "Daily" and "DAILY" format
    const timeframeKey = currentTimeframe && currentTimeframe.toUpperCase();
    if (timeframeKey && this.cumulativeCountsByTimeframe.hasOwnProperty(timeframeKey)) {
      this.cumulativeCountsByTimeframe[timeframeKey] = Math.max(
        this.cumulativeCountsByTimeframe[timeframeKey] || 0, 
        incomingCount
      );
    }
    
    // Always use cumulative count - never show 0 if we've received data before
    if (incomingCount > 0 || !this.hasReceivedData) {
      this.cumulativeCount = Math.max(this.cumulativeCount, incomingCount);
      this.lastKnownCount = this.cumulativeCount;
      this.hasReceivedData = true;
    }
    
    // Always display the cumulative total, never 0
    const displayCount = this.hasReceivedData ? Math.max(this.cumulativeCount, 1) : 0;
    
    
    if (this.onUpdate) {
      // Get timeframe count safely
      const timeframeKey = currentTimeframe && currentTimeframe.toUpperCase();
      const timeframeCount = (timeframeKey && this.cumulativeCountsByTimeframe[timeframeKey]) || 0;
      
      const updateData = {
        count: displayCount,
        cumulativeCount: this.cumulativeCount,
        timeframeCount: timeframeCount,
        timeframe: currentTimeframe,
        timestamp: data.timestamp,
        source: 'realtime_thread',
        isCumulative: true
      };
      
      // Persist to IndexedDB for stability
      this.persistLiveCount(updateData);
      
      this.onUpdate(updateData);
    }
  }
  
  /**
   * Handle chart data updates with cumulative totals
   */
  handleChartDataUpdate(data) {
    if (data.chart_data && Array.isArray(data.chart_data)) {
      this.lastChartData = data.chart_data;
      
      // Convert chart data to cumulative totals - never show 0 or decreasing values
      this.totalChartData = this.makeCumulative(this.lastChartData);
      
      
      // Persist chart data for stability
      this.persistChartData(this.lastChartData);
      
      if (this.onChartData) {
        this.onChartData({
          chartData: this.totalChartData, // Always use cumulative data
          rawData: this.lastChartData,    // Original data for reference
          timeframe: data.timeframe || this.timeframe,
          timestamp: data.timestamp,
          isCumulative: true,
          source: 'realtime_thread'
        });
      }
    }
  }
  
  /**
   * Convert chart data to cumulative format with adaptive resolution
   */
  makeCumulative(chartData) {
    if (!Array.isArray(chartData) || chartData.length === 0) {
      return [];
    }
    
    let cumulative = 0;
    const cumulativeData = [];
    
    for (const point of chartData) {
      const value = typeof point === 'number' ? point : (point.count || point.value || 0);
      
      // Always increase cumulative total - never decrease
      if (value > 0) {
        cumulative += value;
      }
      
      // Store as cumulative total
      if (typeof point === 'number') {
        cumulativeData.push(cumulative);
      } else {
        cumulativeData.push({
          ...point,
          count: cumulative,
          originalCount: value,
          isCumulative: true
        });
      }
    }
    
    // Apply adaptive resolution - max 100 data points
    return this.adaptiveResolution(cumulativeData, 100);
  }
  
  /**
   * Adaptive chart resolution to limit data points while preserving trends
   * Reduces data to maxPoints while maintaining shape and important peaks
   */
  adaptiveResolution(data, maxPoints = 100) {
    if (!Array.isArray(data) || data.length <= maxPoints) {
      return data; // No reduction needed
    }
    
    
    // Calculate step size for uniform sampling
    const step = data.length / maxPoints;
    const adaptiveData = [];
    
    for (let i = 0; i < maxPoints; i++) {
      const startIndex = Math.floor(i * step);
      const endIndex = Math.min(Math.floor((i + 1) * step), data.length);
      
      // Sample multiple points in this range and pick the representative one
      let representative = data[startIndex];
      let maxValue = typeof representative === 'number' ? representative : (representative.count || 0);
      
      // Find peak value in this range for better trend preservation
      for (let j = startIndex; j < endIndex; j++) {
        const currentValue = typeof data[j] === 'number' ? data[j] : (data[j].count || 0);
        if (currentValue > maxValue) {
          maxValue = currentValue;
          representative = data[j];
        }
      }
      
      adaptiveData.push(representative);
    }
    
    return adaptiveData;
  }
  
  /**
   * Advanced adaptive resolution using Douglas-Peucker algorithm for line simplification
   * Better preserves important trends and changes in the data
   */
  douglasPeuckerSimplify(data, tolerance = 1.0) {
    if (!Array.isArray(data) || data.length <= 2) {
      return data;
    }
    
    // Convert to points array for algorithm
    const points = data.map((item, index) => ({
      x: index,
      y: typeof item === 'number' ? item : (item.count || 0),
      original: item
    }));
    
    const simplified = this.douglasPeucker(points, tolerance);
    return simplified.map(point => point.original);
  }
  
  /**
   * Douglas-Peucker line simplification algorithm
   */
  douglasPeucker(points, tolerance) {
    if (points.length <= 2) {
      return points;
    }
    
    // Find the point with maximum distance from line between first and last
    let maxDistance = 0;
    let maxIndex = 0;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], firstPoint, lastPoint);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftSegment = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const rightSegment = this.douglasPeucker(points.slice(maxIndex), tolerance);
      
      // Combine segments (remove duplicate middle point)
      return leftSegment.slice(0, -1).concat(rightSegment);
    } else {
      // All points between first and last can be removed
      return [firstPoint, lastPoint];
    }
  }
  
  /**
   * Calculate perpendicular distance from point to line
   */
  perpendicularDistance(point, lineStart, lineEnd) {
    const A = lineEnd.x - lineStart.x;
    const B = lineEnd.y - lineStart.y;
    const C = A * lineStart.x + B * lineStart.y;
    
    const distance = Math.abs(A * point.y - B * point.x + C) / Math.sqrt(A * A + B * B);
    return distance;
  }
  
  /**
   * Handle progressive sample loading with cumulative counting
   */
  handleProgressiveSample(data) {
    const progressiveCount = data.cumulative_count || data.current_count || 0;
    
    // Update cumulative count during progressive loading
    if (progressiveCount > 0) {
      this.cumulativeCount = Math.max(this.cumulativeCount, progressiveCount);
      this.hasReceivedData = true;
    }
    
    // Never show 0 during progressive loading
    const displayCount = this.hasReceivedData ? Math.max(this.cumulativeCount, progressiveCount) : progressiveCount;
    
    if (this.onUpdate) {
      this.onUpdate({
        count: displayCount,
        cumulativeCount: this.cumulativeCount,
        timeframe: data.timeframe || this.timeframe,
        timestamp: data.timestamp,
        isProgressive: true,
        isCumulative: true,
        sampleIndex: data.sample_index,
        totalSamples: data.total_samples
      });
    }
  }
  
  /**
   * Handle progressive loading completion with final cumulative total
   */
  handleProgressiveComplete(data) {
    const finalCount = data.final_count || 0;
    
    // Ensure final count is cumulative
    this.cumulativeCount = Math.max(this.cumulativeCount, finalCount);
    this.lastKnownCount = this.cumulativeCount;
    this.hasReceivedData = true;
    
    // Never show 0 for final count
    const displayCount = Math.max(this.cumulativeCount, 1);
    
    
    if (this.onUpdate) {
      this.onUpdate({
        count: displayCount,
        cumulativeCount: this.cumulativeCount,
        timeframe: data.timeframe || this.timeframe,
        timestamp: data.timestamp,
        isProgressive: false,
        isCumulative: true,
        isComplete: true
      });
    }
  }
  
  /**
   * Handle server errors
   */
  handleServerError(data) {
    console.error(`❌ ${this.connectionId}: Server error:`, data.message);
    
    if (this.onError) {
      this.onError({
        type: 'server_error',
        message: data.message,
        code: data.code,
        timestamp: data.timestamp
      });
    }
  }
  
  /**
   * Handle camera health updates
   */
  handleCameraHealthUpdate(data) {
    
    // Store camera health info
    this.cameraHealth = {
      healthyCount: data.healthy_cameras,
      totalCount: data.total_cameras,
      healthPercentage: data.health_percentage,
      details: data.camera_details,
      lastUpdate: data.timestamp
    };
    
    // Notify error handler if health is poor
    if (data.health_percentage < 50 && this.onError) {
      this.onError({
        type: 'camera_health_degraded',
        message: `Camera health degraded: ${data.healthy_cameras}/${data.total_cameras} cameras healthy (${data.health_percentage.toFixed(1)}%)`,
        code: 'CAMERA_HEALTH_DEGRADED',
        healthData: this.cameraHealth
      });
    }
  }
  
  /**
   * Handle connection warnings from server
   */
  handleConnectionWarning(data) {
    
    if (this.onError) {
      this.onError({
        type: 'connection_warning',
        message: data.message,
        code: data.warning_code || 'CONNECTION_WARNING',
        timestamp: data.timestamp,
        severity: data.severity || 'warning'
      });
    }
  }
  
  /**
   * Start heartbeat to keep connection alive (now handled by ping_pong pattern)
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    // The ping_pong pattern subscription handles health monitoring
    // No need for manual heartbeat - the pattern manager will send pings every 30 seconds
    console.log(`💓 ${this.connectionId}: Heartbeat monitoring delegated to ping_pong pattern`);
    
    // Still check for connection health periodically
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.lastHeartbeat) {
        // Check if we haven't received any message in too long
        if ((Date.now() - this.lastHeartbeat) > 45000) { // 45 seconds timeout
          console.warn(`💔 ${this.connectionId}: Connection timeout - reconnecting`);
          this.handleDisconnect();
        }
      }
    }, 15000); // Check every 15 seconds
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Handle connection disconnection
   */
  handleDisconnect() {
    this.isConnected = false;
    this.isSubscribed = false; // Reset subscription status on disconnect
    this.stopHeartbeat();
    
    if (this.websocket) {
      this.websocket = null;
    }
    
    if (this.onDisconnect) {
      this.onDisconnect();
    }
    
    // Auto-reconnect if not at max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error(`❌ ${this.connectionId}: Max reconnection attempts reached`);
      if (this.onError) {
        this.onError({
          message: 'Max reconnection attempts reached',
          code: 'MAX_RECONNECT_ATTEMPTS'
        });
      }
    }
  }
  
  /**
   * Handle connection errors
   */
  handleError(error) {
    console.error(`❌ ${this.connectionId}: Connection error:`, error);
    
    if (this.onError) {
      this.onError({
        message: error.message || 'WebSocket connection error',
        code: 'CONNECTION_ERROR'
      });
    }
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`🔄 ${this.connectionId}: Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Update timeframe for this worker
   */
  updateTimeframe(newTimeframe) {
    if (newTimeframe === this.timeframe) {
      return; // No change needed
    }
    
    this.timeframe = newTimeframe;
    
    // If connected, send update to server
    if (this.isConnected && this.websocket) {
      this.websocket.send(JSON.stringify({
        action: 'set_timeframe',
        timeframe: newTimeframe,
        worker_id: this.connectionId
      }));
      
      // Request fresh data for new timeframe
      this.requestData();
    }
  }
  
  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log(`🔌 ${this.connectionId}: Disconnecting worker`);

    this.isConnected = false;
    this.isSubscribed = false; // Reset subscription status on manual disconnect
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Send unsubscribe messages for all patterns
      try {
        console.log(`📤 ${this.connectionId}: Sending unsubscribe messages`);

        // Unsubscribe from live count pattern with location info
        this.websocket.send(JSON.stringify({
          action: 'unsubscribe_pattern',
          pattern: 'live_count',
          locationId: this.locationId,
          timeframe: this.timeframe
        }));

        // Unsubscribe from chart data pattern with location info
        this.websocket.send(JSON.stringify({
          action: 'unsubscribe_pattern',
          pattern: 'chart_data',
          locationId: this.locationId,
          timeframe: this.timeframe
        }));

        // Unsubscribe from ping pong pattern
        this.websocket.send(JSON.stringify({
          action: 'unsubscribe_pattern',
          pattern: 'ping_pong'
        }));

        // Wait a moment for unsubscribe messages to be sent
        setTimeout(() => {
          if (this.websocket) {
            this.websocket.close();
          }
        }, 100);
      } catch (error) {
        console.warn(`⚠️ ${this.connectionId}: Error during unsubscribe:`, error);
        // Still close the connection
        if (this.websocket) {
          this.websocket.close();
        }
      }
    } else if (this.websocket) {
      // Connection not open, just close
      this.websocket.close();
    }

    this.websocket = null;

    // DON'T clear event handlers here - they will be transferred to new worker
    console.log(`✅ ${this.connectionId}: Worker disconnected`);
  }
  
  /**
   * Get current status with enhanced error reporting
   */
  getStatus() {
    return {
      locationId: this.locationId,
      timeframe: this.timeframe,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastKnownCount: this.lastKnownCount,
      cumulativeCount: this.cumulativeCount,
      lastHeartbeat: this.lastHeartbeat,
      connectionId: this.connectionId,
      hasReceivedData: this.hasReceivedData,
      cameraHealth: this.cameraHealth,
      connectionHealth: this.getConnectionHealth()
    };
  }
  
  /**
   * Get connection health status
   */
  getConnectionHealth() {
    const now = Date.now();
    const timeSinceHeartbeat = this.lastHeartbeat ? (now - this.lastHeartbeat) : null;
    
    let status = 'unknown';
    let healthScore = 0;
    
    if (!this.isConnected) {
      status = 'disconnected';
      healthScore = 0;
    } else if (this.reconnectAttempts > 0) {
      status = 'degraded';
      healthScore = Math.max(0, 50 - (this.reconnectAttempts * 10));
    } else if (!timeSinceHeartbeat || timeSinceHeartbeat < 15000) {
      status = 'healthy';
      healthScore = 100;
    } else if (timeSinceHeartbeat < 30000) {
      status = 'warning';
      healthScore = 75;
    } else {
      status = 'critical';
      healthScore = 25;
    }
    
    return {
      status,
      healthScore,
      timeSinceHeartbeat,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
  
  /**
   * Persist live count data to IndexedDB
   */
  async persistLiveCount(data) {
    try {
      await this.indexedDB.storeLiveCount(this.locationId, this.timeframe, data);
    } catch (error) {
      console.error(`❌ ${this.connectionId}: Failed to persist live count:`, error);
    }
  }
  
  /**
   * Persist chart data to IndexedDB
   */
  async persistChartData(chartData) {
    try {
      if (chartData && chartData.length > 0) {
        await this.indexedDB.storeChartData(this.locationId, this.timeframe, chartData);
      }
    } catch (error) {
      console.error(`❌ ${this.connectionId}: Failed to persist chart data:`, error);
    }
  }
  
  /**
   * Sync offline data when reconnecting
   */
  async syncOfflineData() {
    try {
      
      // Load latest persisted data
      const latestCount = await this.indexedDB.getLatestLiveCount(this.locationId, this.timeframe);
      if (latestCount && this.onUpdate) {
        // Send cached data to maintain continuity
        this.onUpdate({
          count: latestCount.count || 0,
          cumulativeCount: latestCount.cumulative_count || 0,
          timeframeCount: latestCount.timeframe_count || 0,
          timeframe: this.timeframe,
          timestamp: latestCount.timestamp,
          source: 'offline_sync',
          isCumulative: true,
          isSync: true
        });
      }
      
    } catch (error) {
      console.error(`❌ ${this.connectionId}: Failed to sync offline data:`, error);
    }
  }
}

export default WebSocketWorker;