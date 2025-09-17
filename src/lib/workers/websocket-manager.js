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
    
    console.log('🏗️ WebSocketManager initialized');
  }
  
  /**
   * Create or get worker for a specific location
   */
  createWorker(locationId, timeframe = null) {
    const actualTimeframe = timeframe || this.globalTimeframe;
    const workerId = this.getWorkerId(locationId, actualTimeframe);
    
    if (this.workers.has(workerId)) {
      console.log(`♻️ WebSocketManager: Reusing existing worker for ${locationId}`);
      return this.workers.get(workerId);
    }
    
    console.log(`🚀 WebSocketManager: Creating new worker for ${locationId} (${actualTimeframe})`);
    
    const worker = new WebSocketWorker(locationId, actualTimeframe);
    this.workers.set(workerId, worker);
    
    // Setup worker lifecycle handlers
    worker.onConnect = () => {
      console.log(`✅ WebSocketManager: Worker connected for ${locationId}`);
    };
    
    worker.onDisconnect = () => {
      console.log(`🔌 WebSocketManager: Worker disconnected for ${locationId}`);
    };
    
    worker.onError = (error) => {
      console.error(`❌ WebSocketManager: Worker error for ${locationId}:`, error);
      
      // If worker fails permanently, remove it so it can be recreated
      if (error.code === 'MAX_RECONNECT_ATTEMPTS') {
        console.log(`🗑️ WebSocketManager: Removing failed worker for ${locationId}`);
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
      console.log(`🗑️ WebSocketManager: Removing worker for ${locationId}`);
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
    
    console.log(`🔄 WebSocketManager: Updating global timeframe from ${this.globalTimeframe} to ${newTimeframe}`);
    this.globalTimeframe = newTimeframe;
    
    // Update all existing workers
    for (const [workerId, worker] of this.workers) {
      worker.updateTimeframe(newTimeframe);
    }
  }
  
  /**
   * Update timeframe for specific location worker
   */
  updateWorkerTimeframe(locationId, newTimeframe) {
    const worker = this.getWorker(locationId);
    if (worker) {
      worker.updateTimeframe(newTimeframe);
    } else {
      console.warn(`⚠️ WebSocketManager: No worker found for ${locationId} to update timeframe`);
    }
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
    console.log(`🔌 WebSocketManager: Disconnecting all ${this.workers.size} workers`);
    
    for (const [workerId, worker] of this.workers) {
      worker.disconnect();
    }
    
    this.workers.clear();
  }
  
  /**
   * Reconnect all workers
   */
  reconnectAll() {
    console.log(`🔄 WebSocketManager: Reconnecting all workers`);
    
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
        console.log(`🧹 WebSocketManager: Cleaning up failed worker ${workerId}`);
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
      console.log(`💓 WebSocketManager Health:`, {
        connected: health.connectedWorkers,
        total: health.totalWorkers,
        health: `${(health.overallHealth * 100).toFixed(1)}%`
      });
      
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
    console.log('🔥 WebSocketManager: Destroying manager');
    
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