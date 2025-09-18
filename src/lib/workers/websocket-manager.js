/**
 * WebSocket Manager for coordinating multiple per-location workers
 * Manages lifecycle and communication between workers
 */

import WebSocketWorker from './websocket-worker.js';

class WebSocketManager {
  constructor() {
    this.workers = new Map(); // locationId -> worker
    this.globalTimeframe = 'HOURLY';
    this.isInitialized = false;
    this.maxWorkersPerLocation = 1; // Prevent duplicate workers
    
  }
  
  /**
   * Create or get worker for a specific location
   */
  createWorker(locationId, timeframe = null) {
    const actualTimeframe = timeframe || this.globalTimeframe;
    const workerId = this.getWorkerId(locationId, actualTimeframe);
    
    if (this.workers.has(workerId)) {
      return this.workers.get(workerId);
    }
    
    // Check if we're exceeding the maximum workers per location
    const existingWorkers = Array.from(this.workers.keys()).filter(id => id.startsWith(locationId));
    if (existingWorkers.length >= this.maxWorkersPerLocation) {
      return this.workers.get(existingWorkers[0]);
    }
    
    
    const worker = new WebSocketWorker(locationId, actualTimeframe);
    this.workers.set(workerId, worker);
    
    // Setup worker lifecycle handlers
    worker.onConnect = () => {
    };
    
    worker.onDisconnect = () => {
    };
    
    worker.onError = (error) => {
      console.error(`❌ WebSocketManager: Worker error for ${locationId}:`, error);
      
      // If worker fails permanently, remove it so it can be recreated
      if (error.code === 'MAX_RECONNECT_ATTEMPTS') {
        this.removeWorker(locationId, actualTimeframe);
      }
    };
    
    return worker;
  }
  
  /**
   * Get worker for a location
   */
  getWorker(locationId, timeframe = null) {
    const actualTimeframe = timeframe || this.globalTimeframe;
    const workerId = this.getWorkerId(locationId, actualTimeframe);
    return this.workers.get(workerId);
  }
  
  /**
   * Remove worker for a location
   */
  removeWorker(locationId, timeframe = null) {
    const actualTimeframe = timeframe || this.globalTimeframe;
    const workerId = this.getWorkerId(locationId, actualTimeframe);
    
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.disconnect();
      this.workers.delete(workerId);
    }
  }
  
  /**
   * Connect worker for a location (creates if doesn't exist)
   */
  connectWorker(locationId, timeframe = null) {
    const worker = this.createWorker(locationId, timeframe);
    
    if (!worker.isConnected) {
      worker.connect();
    }
    
    return worker;
  }
  
  /**
   * Update global timeframe for all workers
   */
  updateGlobalTimeframe(newTimeframe) {
    if (newTimeframe === this.globalTimeframe) {
      return;
    }
    
    this.globalTimeframe = newTimeframe;
    
    // Update all existing workers
    for (const [workerId, worker] of this.workers) {
      worker.updateTimeframe(newTimeframe);
    }
  }
  
  /**
   * Update timeframe for specific location worker - close old connection and create new one
   */
  updateWorkerTimeframe(locationId, newTimeframe) {
    console.log(`🔄 WebSocketManager: Updating timeframe for ${locationId} from ${this.globalTimeframe} to ${newTimeframe}`);

    // Remove existing worker for this location (all timeframes)
    const existingWorkers = Array.from(this.workers.keys()).filter(id => id.startsWith(locationId));
    const oldHandlers = {};

    existingWorkers.forEach(workerId => {
      const worker = this.workers.get(workerId);
      if (worker) {
        // Store the event handlers before disconnecting
        oldHandlers[workerId] = {
          onUpdate: worker.onUpdate,
          onChartData: worker.onChartData,
          onError: worker.onError
        };

        console.log(`🔌 WebSocketManager: Disconnecting old worker ${workerId}`);
        worker.disconnect();
        this.workers.delete(workerId);
      }
    });

    // Create new worker with the new timeframe
    const newWorker = this.createWorker(locationId, newTimeframe);

    // Restore event handlers to the new worker
    if (existingWorkers.length > 0) {
      const oldWorkerId = existingWorkers[0];
      const handlers = oldHandlers[oldWorkerId];
      if (handlers) {
        newWorker.onUpdate = handlers.onUpdate;
        newWorker.onChartData = handlers.onChartData;
        newWorker.onError = handlers.onError;
      }
    }

    // Connect the new worker
    if (!newWorker.isConnected) {
      newWorker.connect();
    }

    console.log(`✅ WebSocketManager: Created new worker for ${locationId} with timeframe ${newTimeframe}`);
    return newWorker;
  }
  
  /**
   * Get all worker statuses
   */
  getAllWorkerStatuses() {
    const statuses = {};
    
    for (const [workerId, worker] of this.workers) {
      statuses[workerId] = worker.getStatus();
    }
    
    return {
      totalWorkers: this.workers.size,
      globalTimeframe: this.globalTimeframe,
      workers: statuses
    };
  }
  
  /**
   * Disconnect all workers
   */
  disconnectAll() {
    
    for (const [workerId, worker] of this.workers) {
      worker.disconnect();
    }
    
    this.workers.clear();
  }
  
  /**
   * Reconnect all workers
   */
  reconnectAll() {
    
    for (const [workerId, worker] of this.workers) {
      if (!worker.isConnected) {
        worker.connect();
      }
    }
  }
  
  /**
   * Health check for all workers
   */
  healthCheck() {
    const healthStatus = {
      totalWorkers: this.workers.size,
      connectedWorkers: 0,
      disconnectedWorkers: 0,
      errorWorkers: 0,
      workers: {}
    };
    
    for (const [workerId, worker] of this.workers) {
      const status = worker.getStatus();
      
      if (status.isConnected) {
        healthStatus.connectedWorkers++;
      } else {
        healthStatus.disconnectedWorkers++;
      }
      
      if (status.reconnectAttempts >= worker.maxReconnectAttempts) {
        healthStatus.errorWorkers++;
      }
      
      healthStatus.workers[workerId] = {
        locationId: status.locationId,
        isConnected: status.isConnected,
        reconnectAttempts: status.reconnectAttempts,
        lastHeartbeat: status.lastHeartbeat
      };
    }
    
    healthStatus.overallHealth = healthStatus.connectedWorkers / Math.max(healthStatus.totalWorkers, 1);
    
    return healthStatus;
  }
  
  /**
   * Cleanup failed workers and attempt recovery
   */
  cleanup() {
    const failedWorkers = [];
    
    for (const [workerId, worker] of this.workers) {
      if (worker.reconnectAttempts >= worker.maxReconnectAttempts) {
        failedWorkers.push(workerId);
      }
    }
    
    // Remove failed workers
    for (const workerId of failedWorkers) {
      const worker = this.workers.get(workerId);
      if (worker) {
        worker.disconnect();
        this.workers.delete(workerId);
      }
    }
    
    return {
      cleanedWorkers: failedWorkers.length,
      remainingWorkers: this.workers.size
    };
  }
  
  /**
   * Generate unique worker ID
   */
  getWorkerId(locationId, timeframe) {
    return `${locationId}_${timeframe}`;
  }
  
  /**
   * Subscribe to worker updates for a location
   */
  subscribeToLocation(locationId, timeframe, onUpdate, onChartData, onError) {
    const worker = this.connectWorker(locationId, timeframe);
    
    // Set up event handlers
    worker.onUpdate = onUpdate;
    worker.onChartData = onChartData;
    worker.onError = onError;
    
    return () => {
      // Return unsubscribe function
      if (worker.onUpdate === onUpdate) worker.onUpdate = null;
      if (worker.onChartData === onChartData) worker.onChartData = null;
      if (worker.onError === onError) worker.onError = null;
      
      // If no more handlers, we could optionally disconnect the worker
      // For now, keep it alive for potential reuse
    };
  }
  
  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring(intervalMs = 30000) {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    
    this.healthInterval = setInterval(() => {
      const health = this.healthCheck();
      
      // Auto-cleanup if too many workers are failing
      if (health.errorWorkers > 0) {
        this.cleanup();
      }
    }, intervalMs);
  }
  
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }
  
  /**
   * Destroy manager and all workers
   */
  destroy() {
    
    this.stopHealthMonitoring();
    this.disconnectAll();
    this.isInitialized = false;
  }
}

// Global singleton instance
let globalManager = null;

/**
 * Get or create the global WebSocket manager instance
 */
export function getWebSocketManager() {
  if (!globalManager) {
    globalManager = new WebSocketManager();
    globalManager.startHealthMonitoring();
    
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        globalManager.destroy();
      });
    }
  }
  
  return globalManager;
}

export default WebSocketManager;