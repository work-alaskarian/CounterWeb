export interface HistoricalData {
  hourly: CountData[];
  daily: CountData[];
  weekly: CountData[];
  monthly: CountData[];
}

export interface CountData {
  timestamp: Date;
  count: number;
  peak?: number;
  average?: number;
}

export interface Alert {
  id: string;
  type: 'threshold' | 'system' | 'maintenance';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  entityId: string;
  entityType: 'camera' | 'floor' | 'location' | 'division' | 'organization';
}

export interface Threshold {
  id: string;
  name: string;
  maxCount: number;
  minCount?: number;
  enabled: boolean;
  alertSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  realTimeCount: number;
  maxCapacity?: number;
  historicalData: HistoricalData;
  thresholds: Threshold[];
  alerts: Alert[];
  lastUpdated: Date;
}

export interface Floor {
  id: string;
  name: string;
  description?: string;
  cameras: Camera[];
  totalRealTimeCount: number;
  maxCapacity?: number;
  analytics: {
    averageOccupancy: number;
    peakOccupancy: number;
    peakTime: Date;
    trends: CountData[];
  };
  thresholds: Threshold[];
  alerts: Alert[];
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  floors: Floor[];
  totalRealTimeCount: number;
  maxCapacity?: number;
  analytics: {
    averageOccupancy: number;
    peakOccupancy: number;
    peakTime: Date;
    trends: CountData[];
    floorComparison: {
      floorId: string;
      floorName: string;
      occupancy: number;
    }[];
  };
  thresholds: Threshold[];
  alerts: Alert[];
}

export interface Division {
  id: string;
  name: string;
  description?: string;
  locations: Location[];
  totalRealTimeCount: number;
  maxCapacity?: number;
  analytics: {
    averageOccupancy: number;
    peakOccupancy: number;
    peakTime: Date;
    trends: CountData[];
    locationComparison: {
      locationId: string;
      locationName: string;
      occupancy: number;
    }[];
  };
  thresholds: Threshold[];
  alerts: Alert[];
}

export interface Organization {
  id: string;
  name: string;
  divisions: Division[];
  totalRealTimeCount: number;
  maxCapacity?: number;
  analytics: {
    summary: {
      totalLocations: number;
      totalFloors: number;
      totalCameras: number;
      averageOccupancy: number;
      peakOccupancy: number;
      peakTime: Date;
    };
    trends: CountData[];
    divisionComparison: {
      divisionId: string;
      divisionName: string;
      occupancy: number;
    }[];
    reports: Report[];
  };
  globalThresholds: Threshold[];
  alerts: Alert[];
}

export interface Report {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  data: {
    summary: any;
    trends: CountData[];
    peaks: CountData[];
  };
  exportFormats: ('csv' | 'pdf' | 'json')[];
}

export type EntityType = 'organization' | 'division' | 'location' | 'floor' | 'camera';
export type TimeRange = 'live' | 'hour' | 'day' | 'week' | 'month' | 'custom';