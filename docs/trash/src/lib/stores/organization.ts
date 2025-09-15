import { writable, derived } from 'svelte/store';
import type { Organization, Division, Location, Floor, Camera, Alert, TimeRange } from '../types';

// Main organization store
export const organization = writable<Organization | null>(null);

// Current navigation state
export const currentView = writable<{
  type: 'organization' | 'division' | 'location' | 'floor' | 'camera';
  entityId: string;
}>({ type: 'organization', entityId: '' });

// Time range for analytics
export const selectedTimeRange = writable<TimeRange>('live');

// Real-time updates (would connect to WebSocket in real implementation)
export const realTimeUpdates = writable<boolean>(false);

// Derived stores for easy access to specific parts of the hierarchy
export const currentDivision = derived(
  [organization, currentView],
  ([$organization, $currentView]) => {
    if (!$organization || $currentView.type === 'organization') return null;
    return $organization.divisions.find(d => d.id === $currentView.entityId) || null;
  }
);

export const currentLocation = derived(
  [organization, currentView],
  ([$organization, $currentView]) => {
    if (!$organization || $currentView.type === 'organization') return null;
    
    for (const division of $organization.divisions) {
      const location = division.locations.find(l => l.id === $currentView.entityId);
      if (location) return location;
    }
    return null;
  }
);

export const currentFloor = derived(
  [organization, currentView],
  ([$organization, $currentView]) => {
    if (!$organization) return null;
    
    for (const division of $organization.divisions) {
      for (const location of division.locations) {
        const floor = location.floors.find(f => f.id === $currentView.entityId);
        if (floor) return floor;
      }
    }
    return null;
  }
);

export const currentCamera = derived(
  [organization, currentView],
  ([$organization, $currentView]) => {
    if (!$organization) return null;
    
    for (const division of $organization.divisions) {
      for (const location of division.locations) {
        for (const floor of location.floors) {
          const camera = floor.cameras.find(c => c.id === $currentView.entityId);
          if (camera) return camera;
        }
      }
    }
    return null;
  }
);

// All alerts across the organization
export const allAlerts = derived(
  [organization],
  ([$organization]) => {
    if (!$organization) return [];
    
    const alerts: Alert[] = [...$organization.alerts];
    
    for (const division of $organization.divisions) {
      alerts.push(...division.alerts);
      
      for (const location of division.locations) {
        alerts.push(...location.alerts);
        
        for (const floor of location.floors) {
          alerts.push(...floor.alerts);
          
          for (const camera of floor.cameras) {
            alerts.push(...camera.alerts);
          }
        }
      }
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
);

// Critical alerts (high and critical severity, unacknowledged)
export const criticalAlerts = derived(
  [allAlerts],
  ([$allAlerts]) => $allAlerts.filter(alert => 
    !alert.acknowledged && (alert.severity === 'high' || alert.severity === 'critical')
  )
);

// Organization summary stats
export const organizationSummary = derived(
  [organization],
  ([$organization]) => {
    if (!$organization) return null;
    
    return {
      totalDivisions: $organization.divisions.length,
      totalLocations: $organization.divisions.reduce((sum, div) => sum + div.locations.length, 0),
      totalFloors: $organization.divisions.reduce((sum, div) => 
        sum + div.locations.reduce((locSum, loc) => locSum + loc.floors.length, 0), 0
      ),
      totalCameras: $organization.divisions.reduce((sum, div) => 
        sum + div.locations.reduce((locSum, loc) => 
          locSum + loc.floors.reduce((floorSum, floor) => floorSum + floor.cameras.length, 0), 0
        ), 0
      ),
      totalRealTimeCount: $organization.totalRealTimeCount,
      maxCapacity: $organization.maxCapacity || 0,
      occupancyRate: $organization.maxCapacity ? 
        ($organization.totalRealTimeCount / $organization.maxCapacity) * 100 : 0
    };
  }
);

// Functions for updating data (would typically connect to API)
export function updateRealTimeCount(entityId: string, entityType: string, newCount: number) {
  organization.update(org => {
    if (!org) return org;
    
    // Implementation would recursively find and update the entity
    // For now, just trigger a re-render
    return { ...org };
  });
}

export function acknowledgeAlert(alertId: string) {
  organization.update(org => {
    if (!org) return org;
    
    // Recursively find and acknowledge the alert
    const acknowledgeInAlerts = (alerts: Alert[]) => {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) alert.acknowledged = true;
    };
    
    acknowledgeInAlerts(org.alerts);
    
    for (const division of org.divisions) {
      acknowledgeInAlerts(division.alerts);
      
      for (const location of division.locations) {
        acknowledgeInAlerts(location.alerts);
        
        for (const floor of location.floors) {
          acknowledgeInAlerts(floor.alerts);
          
          for (const camera of floor.cameras) {
            acknowledgeInAlerts(camera.alerts);
          }
        }
      }
    }
    
    return org;
  });
}

export function navigateToEntity(entityType: string, entityId: string) {
  currentView.set({ type: entityType as any, entityId });
}