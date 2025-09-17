/**
 * WebSocket Worker for per-LiveCounter dedicated connections
 * Provides isolated WebSocket connections for each location counter
 */

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
    
    console.log(`🔌 WebSocketWorker created for ${locationId} (${this.connectionId})`);
  }
  
  /**
   * Connect to WebSocket with auto-reconnection
   */
  connect() {
    if (this.isConnected || this.websocket) {
      console.log(`⚠️ ${this.connectionId}: Already connected or connecting`);
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
   * Subscribe to location-specific updates
   */
  subscribe() {
    if (!this.isConnected || !this.websocket) {
      console.warn(`⚠️ ${this.connectionId}: Cannot subscribe - not connected`);
      return;
    }
    
    const subscriptionMessage = {
      type: 'subscribe',
      location_id: this.locationId,
      timeframe: this.timeframe,
      worker_id: this.connectionId,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📡 ${this.connectionId}: Subscribing to location ${this.locationId}`);
    this.websocket.send(JSON.stringify(subscriptionMessage));
    
    // Request initial data
    this.requestData();
  }
  
  /**
   * Request initial data for this location
   */
  requestData() {
    if (!this.isConnected || !this.websocket) {
      return;
    }
    
    // Request live count
    this.websocket.send(JSON.stringify({
      type: 'request_live_count',
      location_id: this.locationId,
      timeframe: this.timeframe,
      worker_id: this.connectionId
    }));
    
    // Request chart data
    this.websocket.send(JSON.stringify({
      type: 'request_chart_data',
      location_id: this.locationId,
      timeframe: this.timeframe,
      worker_id: this.connectionId
    }));
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
      case 'live_count_update':
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
        
      case 'pong':
        // Heartbeat response
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
    this.cumulativeCountsByTimeframe[currentTimeframe] = Math.max(
      this.cumulativeCountsByTimeframe[currentTimeframe], 
      incomingCount
    );
    
    // Always use cumulative count - never show 0 if we've received data before
    if (incomingCount > 0 || !this.hasReceivedData) {
      this.cumulativeCount = Math.max(this.cumulativeCount, incomingCount);
      this.lastKnownCount = this.cumulativeCount;
      this.hasReceivedData = true;
    }
    
    // Always display the cumulative total, never 0
    const displayCount = this.hasReceivedData ? Math.max(this.cumulativeCount, 1) : 0;
    
    console.log(`📈 ${this.connectionId}: Count update - incoming: ${incomingCount}, cumulative: ${this.cumulativeCount}, display: ${displayCount}`);
    
    if (this.onUpdate) {
      this.onUpdate({
        count: displayCount,
        cumulativeCount: this.cumulativeCount,
        timeframeCount: this.cumulativeCountsByTimeframe[currentTimeframe],
        timeframe: currentTimeframe,
        timestamp: data.timestamp,
        source: 'realtime_thread',
        isCumulative: true
      });
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
      
      console.log(`📊 ${this.connectionId}: Chart data update - ${this.lastChartData.length} points, cumulative total: ${this.totalChartData[this.totalChartData.length - 1] || 0}`);
      
      if (this.onChartData) {
        this.onChartData({
          chartData: this.totalChartData, // Always use cumulative data
          rawData: this.lastChartData,    // Original data for reference
          timeframe: data.timeframe || this.timeframe,
          timestamp: data.timestamp,
          isCumulative: true
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
    
    console.log(`📊 ${this.connectionId}: Reducing chart data from ${data.length} to ${maxPoints} points`);
    
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
    
    console.log(`📈 ${this.connectionId}: Adaptive resolution complete - ${adaptiveData.length} points preserved`);
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
    
    console.log(`✅ ${this.connectionId}: Progressive loading complete - final: ${finalCount}, cumulative: ${this.cumulativeCount}, display: ${displayCount}`);
    
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
    console.log(`📷 ${this.connectionId}: Camera health update:`, {
      healthy: data.healthy_cameras,
      total: data.total_cameras,
      percentage: data.health_percentage
    });
    
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
    console.warn(`⚠️ ${this.connectionId}: Connection warning:`, data.message);
    
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
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'ping',
          worker_id: this.connectionId,
          timestamp: new Date().toISOString()
        }));
        
        // Check if we haven't received a heartbeat response in too long
        if (this.lastHeartbeat && (Date.now() - this.lastHeartbeat) > 15000) {
          console.warn(`💔 ${this.connectionId}: Heartbeat timeout - reconnecting`);
          this.handleDisconnect();
        }
      }
    }, 10000); // Send ping every 10 seconds
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
    
    console.log(`🔄 ${this.connectionId}: Updating timeframe from ${this.timeframe} to ${newTimeframe}`);
    this.timeframe = newTimeframe;
    
    // If connected, send update to server
    if (this.isConnected && this.websocket) {
      this.websocket.send(JSON.stringify({
        type: 'update_timeframe',
        location_id: this.locationId,
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
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.websocket) {
      // Send unsubscribe message
      try {
        this.websocket.send(JSON.stringify({
          type: 'unsubscribe',
          location_id: this.locationId,
          worker_id: this.connectionId
        }));
      } catch (error) {
        // Ignore errors during cleanup
      }
      
      this.websocket.close();
      this.websocket = null;
    }
    
    // Clear event handlers
    this.onUpdate = null;
    this.onChartData = null;
    this.onError = null;
    this.onConnect = null;
    this.onDisconnect = null;
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
}

export default WebSocketWorker;