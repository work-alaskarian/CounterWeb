/**
 * IndexedDB Service for persistent storage of live count data
 * Provides stability for counting view across WebSocket disconnections
 */

class IndexedDBService {
  constructor() {
    this.dbName = 'AnalyticsCountDB';
    this.dbVersion = 1;
    this.db = null;
    this.isInitialized = false;
    
    // Store names
    this.stores = {
      LIVE_COUNTS: 'live_counts',
      CHART_DATA: 'chart_data',
      LOCATIONS: 'locations',
      METADATA: 'metadata'
    };
    
    console.log('🗄️ IndexedDBService initialized');
  }
  
  /**
   * Initialize IndexedDB database
   */
  async init() {
    if (this.isInitialized && this.db) {
      return this.db;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to open database', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ IndexedDB: Database initialized successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔄 IndexedDB: Upgrading database schema');
        
        // Create live_counts store
        if (!db.objectStoreNames.contains(this.stores.LIVE_COUNTS)) {
          const liveCountsStore = db.createObjectStore(this.stores.LIVE_COUNTS, { 
            keyPath: 'id' 
          });
          liveCountsStore.createIndex('location_id', 'location_id', { unique: false });
          liveCountsStore.createIndex('timeframe', 'timeframe', { unique: false });
          liveCountsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Create chart_data store
        if (!db.objectStoreNames.contains(this.stores.CHART_DATA)) {
          const chartDataStore = db.createObjectStore(this.stores.CHART_DATA, { 
            keyPath: 'id' 
          });
          chartDataStore.createIndex('location_id', 'location_id', { unique: false });
          chartDataStore.createIndex('timeframe', 'timeframe', { unique: false });
          chartDataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Create locations store
        if (!db.objectStoreNames.contains(this.stores.LOCATIONS)) {
          const locationsStore = db.createObjectStore(this.stores.LOCATIONS, { 
            keyPath: 'location_id' 
          });
          locationsStore.createIndex('last_updated', 'last_updated', { unique: false });
        }
        
        // Create metadata store for settings and state
        if (!db.objectStoreNames.contains(this.stores.METADATA)) {
          db.createObjectStore(this.stores.METADATA, { keyPath: 'key' });
        }
      };
    });
  }
  
  /**
   * Store live count data persistently
   */
  async storeLiveCount(locationId, timeframe, data) {
    await this.init();
    
    const record = {
      id: `${locationId}_${timeframe}_${Date.now()}`,
      location_id: locationId,
      timeframe: timeframe,
      count: data.count || 0,
      cumulative_count: data.cumulativeCount || 0,
      timeframe_count: data.timeframeCount || 0,
      timestamp: data.timestamp || new Date().toISOString(),
      source: data.source || 'websocket',
      is_cumulative: data.isCumulative || false,
      stored_at: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.LIVE_COUNTS], 'readwrite');
      const store = transaction.objectStore(this.stores.LIVE_COUNTS);
      const request = store.add(record);
      
      request.onsuccess = () => {
        console.log(`💾 IndexedDB: Stored live count for ${locationId}:`, record);
        
        // Keep only last 100 records per location to prevent storage bloat
        this.cleanupOldRecords(locationId, timeframe, 100);
        resolve(record);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to store live count', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get latest live count for a location
   */
  async getLatestLiveCount(locationId, timeframe = null) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.LIVE_COUNTS], 'readonly');
      const store = transaction.objectStore(this.stores.LIVE_COUNTS);
      const index = store.index('location_id');
      const request = index.getAll(locationId);
      
      request.onsuccess = () => {
        const records = request.result;
        
        // Filter by timeframe if specified
        const filteredRecords = timeframe 
          ? records.filter(r => r.timeframe === timeframe)
          : records;
        
        // Get the most recent record
        const latest = filteredRecords.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        )[0];
        
        if (latest) {
          console.log(`📖 IndexedDB: Retrieved latest count for ${locationId}:`, latest);
        } else {
          console.log(`📖 IndexedDB: No stored count found for ${locationId}`);
        }
        
        resolve(latest || null);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get latest live count', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Store chart data persistently
   */
  async storeChartData(locationId, timeframe, chartData) {
    await this.init();
    
    const record = {
      id: `chart_${locationId}_${timeframe}_${Date.now()}`,
      location_id: locationId,
      timeframe: timeframe,
      chart_data: chartData,
      timestamp: new Date().toISOString(),
      data_points: chartData ? chartData.length : 0
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.CHART_DATA], 'readwrite');
      const store = transaction.objectStore(this.stores.CHART_DATA);
      const request = store.add(record);
      
      request.onsuccess = () => {
        console.log(`📊 IndexedDB: Stored chart data for ${locationId}:`, record.data_points, 'points');
        
        // Keep only last 10 chart datasets per location
        this.cleanupOldChartData(locationId, timeframe, 10);
        resolve(record);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to store chart data', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get latest chart data for a location
   */
  async getLatestChartData(locationId, timeframe = null) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.CHART_DATA], 'readonly');
      const store = transaction.objectStore(this.stores.CHART_DATA);
      const index = store.index('location_id');
      const request = index.getAll(locationId);
      
      request.onsuccess = () => {
        const records = request.result;
        
        // Filter by timeframe if specified
        const filteredRecords = timeframe 
          ? records.filter(r => r.timeframe === timeframe)
          : records;
        
        // Get the most recent record
        const latest = filteredRecords.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        )[0];
        
        if (latest) {
          console.log(`📊 IndexedDB: Retrieved chart data for ${locationId}:`, latest.data_points, 'points');
        }
        
        resolve(latest ? latest.chart_data : null);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get chart data', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Store location metadata
   */
  async storeLocation(locationData) {
    await this.init();
    
    const record = {
      location_id: locationData.location_id,
      name: locationData.name,
      live_count: locationData.live_count || 0,
      last_updated: locationData.last_updated || new Date().toISOString(),
      is_active: locationData.is_active !== false,
      stored_at: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.LOCATIONS], 'readwrite');
      const store = transaction.objectStore(this.stores.LOCATIONS);
      const request = store.put(record); // Use put to update existing
      
      request.onsuccess = () => {
        console.log(`🏢 IndexedDB: Stored location data for ${locationData.location_id}`);
        resolve(record);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to store location', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get all stored locations
   */
  async getAllLocations() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.LOCATIONS], 'readonly');
      const store = transaction.objectStore(this.stores.LOCATIONS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const locations = request.result;
        console.log(`🏢 IndexedDB: Retrieved ${locations.length} locations`);
        resolve(locations);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get locations', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Store metadata (settings, state, etc.)
   */
  async storeMetadata(key, value) {
    await this.init();
    
    const record = {
      key: key,
      value: value,
      timestamp: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.METADATA], 'readwrite');
      const store = transaction.objectStore(this.stores.METADATA);
      const request = store.put(record);
      
      request.onsuccess = () => {
        console.log(`⚙️ IndexedDB: Stored metadata: ${key}`);
        resolve(record);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to store metadata', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get metadata by key
   */
  async getMetadata(key) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.METADATA], 'readonly');
      const store = transaction.objectStore(this.stores.METADATA);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.value : null);
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get metadata', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Cleanup old records to prevent storage bloat
   */
  async cleanupOldRecords(locationId, timeframe, keepCount = 100) {
    await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db.transaction([this.stores.LIVE_COUNTS], 'readwrite');
      const store = transaction.objectStore(this.stores.LIVE_COUNTS);
      const index = store.index('location_id');
      const request = index.getAll(locationId);
      
      request.onsuccess = () => {
        const records = request.result
          .filter(r => r.timeframe === timeframe)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Delete old records beyond keepCount
        if (records.length > keepCount) {
          const toDelete = records.slice(keepCount);
          
          toDelete.forEach(record => {
            store.delete(record.id);
          });
          
          console.log(`🧹 IndexedDB: Cleaned up ${toDelete.length} old records for ${locationId}`);
        }
        
        resolve();
      };
    });
  }
  
  /**
   * Cleanup old chart data
   */
  async cleanupOldChartData(locationId, timeframe, keepCount = 10) {
    await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db.transaction([this.stores.CHART_DATA], 'readwrite');
      const store = transaction.objectStore(this.stores.CHART_DATA);
      const index = store.index('location_id');
      const request = index.getAll(locationId);
      
      request.onsuccess = () => {
        const records = request.result
          .filter(r => r.timeframe === timeframe)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Delete old chart data beyond keepCount
        if (records.length > keepCount) {
          const toDelete = records.slice(keepCount);
          
          toDelete.forEach(record => {
            store.delete(record.id);
          });
          
          console.log(`📊 IndexedDB: Cleaned up ${toDelete.length} old chart datasets for ${locationId}`);
        }
        
        resolve();
      };
    });
  }
  
  /**
   * Get database statistics
   */
  async getStats() {
    await this.init();
    
    const stats = {
      live_counts: 0,
      chart_data: 0,
      locations: 0,
      metadata: 0
    };
    
    return new Promise((resolve) => {
      const transaction = this.db.transaction(Object.values(this.stores), 'readonly');
      
      // Count records in each store
      Object.entries(this.stores).forEach(([key, storeName]) => {
        const store = transaction.objectStore(storeName);
        const request = store.count();
        
        request.onsuccess = () => {
          stats[key.toLowerCase()] = request.result;
        };
      });
      
      transaction.oncomplete = () => {
        console.log('📈 IndexedDB Stats:', stats);
        resolve(stats);
      };
    });
  }
  
  /**
   * Clear all data (useful for debugging)
   */
  async clearAll() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(Object.values(this.stores), 'readwrite');
      
      Object.values(this.stores).forEach(storeName => {
        const store = transaction.objectStore(storeName);
        store.clear();
      });
      
      transaction.oncomplete = () => {
        console.log('🧹 IndexedDB: All data cleared');
        resolve();
      };
      
      transaction.onerror = () => {
        console.error('❌ IndexedDB: Failed to clear data', transaction.error);
        reject(transaction.error);
      };
    });
  }
}

// Global singleton instance
let globalIndexedDBService = null;

/**
 * Get or create the global IndexedDB service instance
 */
export function getIndexedDBService() {
  if (!globalIndexedDBService) {
    globalIndexedDBService = new IndexedDBService();
  }
  
  return globalIndexedDBService;
}

export default IndexedDBService;