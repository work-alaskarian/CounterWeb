import type { Organization, Division, Location, Floor, Camera, CountData, Alert, Threshold } from './types';

function generateHistoricalData(): CountData[] {
  const data: CountData[] = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp,
      count: Math.floor(Math.random() * 100) + 10,
      peak: Math.floor(Math.random() * 50) + 80,
      average: Math.floor(Math.random() * 30) + 30
    });
  }
  
  return data;
}

function generateThresholds(): Threshold[] {
  return [
    {
      id: 'threshold-1',
      name: 'High Occupancy',
      maxCount: 80,
      enabled: true,
      alertSeverity: 'high'
    },
    {
      id: 'threshold-2', 
      name: 'Critical Capacity',
      maxCount: 95,
      enabled: true,
      alertSeverity: 'critical'
    }
  ];
}

function generateAlerts(entityId: string, entityType: any): Alert[] {
  const alerts: Alert[] = [];
  
  if (Math.random() > 0.7) {
    alerts.push({
      id: `alert-${entityId}-${Date.now()}`,
      type: 'threshold',
      message: 'High occupancy detected',
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      severity: 'high',
      acknowledged: Math.random() > 0.5,
      entityId,
      entityType
    });
  }
  
  return alerts;
}

function generateCamera(floorId: string, index: number): Camera {
  const id = `camera-${floorId}-${index}`;
  const realTimeCount = Math.floor(Math.random() * 50) + 5;
  const arabicZones = ['المنطقة أ', 'المنطقة ب', 'المنطقة ج', 'المنطقة د', 'المنطقة هـ'];
  
  return {
    id,
    name: `كاميرا ${index + 1}`,
    location: arabicZones[index] || `المنطقة ${index + 1}`,
    status: Math.random() > 0.1 ? 'online' : 'offline',
    realTimeCount,
    maxCapacity: 60,
    historicalData: {
      hourly: generateHistoricalData(),
      daily: generateHistoricalData(),
      weekly: generateHistoricalData(),
      monthly: generateHistoricalData()
    },
    thresholds: generateThresholds(),
    alerts: generateAlerts(id, 'camera'),
    lastUpdated: new Date()
  };
}

function generateFloor(locationId: string, index: number): Floor {
  const id = `floor-${locationId}-${index}`;
  const cameras = Array.from({ length: Math.floor(Math.random() * 4) + 3 }, (_, i) => 
    generateCamera(id, i)
  );
  const totalRealTimeCount = cameras.reduce((sum, camera) => sum + camera.realTimeCount, 0);
  
  return {
    id,
    name: index === 0 ? 'الطابق الأرضي' : `الطابق ${index + 1}`,
    description: `المستوى ${index + 1} من المبنى`,
    cameras,
    totalRealTimeCount,
    maxCapacity: cameras.length * 60,
    analytics: {
      averageOccupancy: Math.floor(totalRealTimeCount * 0.8),
      peakOccupancy: Math.floor(totalRealTimeCount * 1.2),
      peakTime: new Date(),
      trends: generateHistoricalData()
    },
    thresholds: generateThresholds(),
    alerts: generateAlerts(id, 'floor')
  };
}

function generateLocation(divisionId: string, index: number): Location {
  const id = `location-${divisionId}-${index}`;
  const floors = Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, i) => 
    generateFloor(id, i)
  );
  const totalRealTimeCount = floors.reduce((sum, floor) => sum + floor.totalRealTimeCount, 0);
  const buildingNames = ['المبنى الرئيسي', 'المبنى الإداري', 'مبنى المبيعات', 'مركز الخدمات'];
  
  return {
    id,
    name: buildingNames[index] || `المبنى ${String.fromCharCode(65 + index)}`,
    address: `شارع الأعمال ${100 + index * 10}، الرياض`,
    floors,
    totalRealTimeCount,
    maxCapacity: floors.reduce((sum, floor) => sum + (floor.maxCapacity || 0), 0),
    analytics: {
      averageOccupancy: Math.floor(totalRealTimeCount * 0.85),
      peakOccupancy: Math.floor(totalRealTimeCount * 1.15),
      peakTime: new Date(),
      trends: generateHistoricalData(),
      floorComparison: floors.map(floor => ({
        floorId: floor.id,
        floorName: floor.name,
        occupancy: floor.totalRealTimeCount
      }))
    },
    thresholds: generateThresholds(),
    alerts: generateAlerts(id, 'location')
  };
}

function generateDivision(orgId: string, index: number): Division {
  const id = `division-${orgId}-${index}`;
  const locations = Array.from({ length: Math.floor(Math.random() * 2) + 2 }, (_, i) => 
    generateLocation(id, i)
  );
  const totalRealTimeCount = locations.reduce((sum, location) => sum + location.totalRealTimeCount, 0);
  
  const divisionNames = ['العمليات التجارية', 'المقر الرئيسي', 'قسم التصنيع', 'إدارة المخازن'];
  
  return {
    id,
    name: divisionNames[index] || `القسم ${index + 1}`,
    description: `${divisionNames[index] || 'القسم'} يضم مواقع متعددة`,
    locations,
    totalRealTimeCount,
    maxCapacity: locations.reduce((sum, location) => sum + (location.maxCapacity || 0), 0),
    analytics: {
      averageOccupancy: Math.floor(totalRealTimeCount * 0.82),
      peakOccupancy: Math.floor(totalRealTimeCount * 1.18),
      peakTime: new Date(),
      trends: generateHistoricalData(),
      locationComparison: locations.map(location => ({
        locationId: location.id,
        locationName: location.name,
        occupancy: location.totalRealTimeCount
      }))
    },
    thresholds: generateThresholds(),
    alerts: generateAlerts(id, 'division')
  };
}

export function generateSampleOrganization(): Organization {
  const id = 'org-sample';
  const divisions = Array.from({ length: 3 }, (_, i) => generateDivision(id, i));
  const totalRealTimeCount = divisions.reduce((sum, division) => sum + division.totalRealTimeCount, 0);
  const maxCapacity = divisions.reduce((sum, division) => sum + (division.maxCapacity || 0), 0);
  
  return {
    id,
    name: 'شركة المؤسسة العالمية',
    divisions,
    totalRealTimeCount,
    maxCapacity,
    analytics: {
      summary: {
        totalLocations: divisions.reduce((sum, div) => sum + div.locations.length, 0),
        totalFloors: divisions.reduce((sum, div) => 
          sum + div.locations.reduce((locSum, loc) => locSum + loc.floors.length, 0), 0
        ),
        totalCameras: divisions.reduce((sum, div) => 
          sum + div.locations.reduce((locSum, loc) => 
            locSum + loc.floors.reduce((floorSum, floor) => floorSum + floor.cameras.length, 0), 0
          ), 0
        ),
        averageOccupancy: Math.floor(totalRealTimeCount * 0.8),
        peakOccupancy: Math.floor(totalRealTimeCount * 1.2),
        peakTime: new Date()
      },
      trends: generateHistoricalData(),
      divisionComparison: divisions.map(division => ({
        divisionId: division.id,
        divisionName: division.name,
        occupancy: division.totalRealTimeCount
      })),
      reports: []
    },
    globalThresholds: generateThresholds(),
    alerts: generateAlerts(id, 'organization')
  };
}