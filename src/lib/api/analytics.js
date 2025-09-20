/**
 * SIMPLE Direct Real-time Analytics Service
 * Uses global WebSocket service - no individual workers
 */

class DirectAnalyticsService {
  constructor() {
    this.workers = new Map(); // Map of locationId -> WebSocketWorker
    this.activeTimeframe = 'HOURLY';
    this.isEnabled = true;
  }

  /**
   * Create or get WebSocket worker for a specific location
   * Each LiveCounter component gets its own dedicated worker
   */
  getWorkerForLocation(locationId, timeframe = 'HOURLY') {
    const workerKey = `${locationId}_${timeframe}`;
    
    if (!this.workers.has(workerKey)) {
      console.debug(`🏭 Creating worker: ${locationId} (${timeframe})`);
      
      const worker = new WebSocketWorker(locationId, timeframe);
      this.workers.set(workerKey, worker);
      
      // Auto-connect the worker
      worker.connect();
    }
    
    return this.workers.get(workerKey);
  }

  /**
   * Remove worker for a location (when component unmounts)
   */
  removeWorkerForLocation(locationId, timeframe = 'HOURLY') {
    const workerKey = `${locationId}_${timeframe}`;
    
    if (this.workers.has(workerKey)) {
      console.debug(`🗑️ Removing worker: ${locationId}`);
      
      const worker = this.workers.get(workerKey);
      worker.disconnect();
      this.workers.delete(workerKey);
    }
  }

  /**
   * Update timeframe for a specific location
   */
  updateLocationTimeframe(locationId, oldTimeframe, newTimeframe) {
    // Remove old worker
    this.removeWorkerForLocation(locationId, oldTimeframe);
    
    // Create new worker with new timeframe
    return this.getWorkerForLocation(locationId, newTimeframe);
  }

  /**
   * Get connection status for all workers
   */
  getConnectionStatus() {
    const status = {
      totalWorkers: this.workers.size,
      connectedWorkers: 0,
      disconnectedWorkers: 0,
      workers: []
    };

    for (const [key, worker] of this.workers) {
      const workerStatus = worker.getStatus();
      status.workers.push({
        key,
        locationId: workerStatus.locationId,
        timeframe: workerStatus.timeframe,
        isConnected: workerStatus.isConnected,
        connectionHealth: workerStatus.connectionHealth,
        lastKnownCount: workerStatus.lastKnownCount,
        cumulativeCount: workerStatus.cumulativeCount
      });

      if (workerStatus.isConnected) {
        status.connectedWorkers++;
      } else {
        status.disconnectedWorkers++;
      }
    }

    return status;
  }

  /**
   * Reconnect all workers
   */
  reconnectAll() {
    console.debug(`🔄 Reconnecting ${this.workers.size} workers`);
    
    for (const [key, worker] of this.workers) {
      if (!worker.isConnected) {
        worker.connect();
      }
    }
  }

  /**
   * Disconnect all workers (cleanup)
   */
  disconnectAll() {
    console.debug(`🔌 Disconnecting ${this.workers.size} workers`);
    
    for (const [key, worker] of this.workers) {
      worker.disconnect();
    }
    
    this.workers.clear();
  }

  /**
   * Enable/disable all analytics
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.reconnectAll();
    } else {
      this.disconnectAll();
    }
  }

  /**
   * Get health summary of all connections
   */
  getHealthSummary() {
    const workers = Array.from(this.workers.values());
    const totalWorkers = workers.length;
    
    if (totalWorkers === 0) {
      return {
        status: 'no_workers',
        score: 0,
        message: 'No active workers'
      };
    }

    const healthyWorkers = workers.filter(w => w.isConnected).length;
    const healthPercentage = (healthyWorkers / totalWorkers) * 100;

    let status = 'healthy';
    let message = `${healthyWorkers}/${totalWorkers} workers connected`;

    if (healthPercentage === 100) {
      status = 'healthy';
    } else if (healthPercentage >= 75) {
      status = 'warning';
    } else if (healthPercentage >= 50) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: healthPercentage,
      message,
      totalWorkers,
      healthyWorkers,
      unhealthyWorkers: totalWorkers - healthyWorkers
    };
  }

  /**
   * Get detailed metrics for monitoring
   */
  getMetrics() {
    const workers = Array.from(this.workers.values());
    
    return {
      timestamp: new Date().toISOString(),
      totalWorkers: workers.length,
      connectedWorkers: workers.filter(w => w.isConnected).length,
      totalCumulativeCount: workers.reduce((sum, w) => sum + (w.cumulativeCount || 0), 0),
      averageReconnectAttempts: workers.reduce((sum, w) => sum + (w.reconnectAttempts || 0), 0) / Math.max(workers.length, 1),
      locations: workers.map(w => ({
        locationId: w.locationId,
        timeframe: w.timeframe,
        isConnected: w.isConnected,
        cumulativeCount: w.cumulativeCount,
        reconnectAttempts: w.reconnectAttempts,
        hasReceivedData: w.hasReceivedData
      }))
    };
  }
}

// Create singleton instance
const directAnalyticsService = new DirectAnalyticsService();

// Export functions for direct use in components
export function createLocationWorker(locationId, timeframe = 'HOURLY') {
  return directAnalyticsService.getWorkerForLocation(locationId, timeframe);
}

export function removeLocationWorker(locationId, timeframe = 'HOURLY') {
  return directAnalyticsService.removeWorkerForLocation(locationId, timeframe);
}

export function updateWorkerTimeframe(locationId, oldTimeframe, newTimeframe) {
  return directAnalyticsService.updateLocationTimeframe(locationId, oldTimeframe, newTimeframe);
}

export function getAnalyticsStatus() {
  return directAnalyticsService.getConnectionStatus();
}

export function getAnalyticsHealth() {
  return directAnalyticsService.getHealthSummary();
}

export function getAnalyticsMetrics() {
  return directAnalyticsService.getMetrics();
}

export function reconnectAllAnalytics() {
  return directAnalyticsService.reconnectAll();
}

export function disconnectAllAnalytics() {
  return directAnalyticsService.disconnectAll();
}

export function setAnalyticsEnabled(enabled) {
  return directAnalyticsService.setEnabled(enabled);
}

// Export service instance for advanced usage
export { directAnalyticsService };

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    directAnalyticsService.disconnectAll();
  });
}

export default directAnalyticsService;