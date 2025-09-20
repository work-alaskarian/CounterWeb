import { writable } from 'svelte/store';

export const locations = writable([]);
export const isLoading = writable(false);
export const error = writable(null);
export const fallbackMode = writable(false);
export const fallbackReason = writable('');

export async function loadLocations() {
  isLoading.set(true);
  error.set(null);

  try {
    console.log('📊 Analytics Simple: Loading locations from GraphQL...');

    // Use GraphQL to get locations data
    const apiUrl = import.meta.env.VITE_API_URL || 'http://10.10.1.205:8080';

    const graphqlQuery = {
      query: `{
        allLocations {
          id
          name
          liveCount
        }
      }`
    };

    const response = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Analytics Simple: Got GraphQL locations:', result);

      // Update locations with GraphQL data
      if (result.data && result.data.allLocations) {
        const graphqlLocations = result.data.allLocations.map(loc => ({
          id: loc.id,
          name: loc.name,
          liveCount: loc.liveCount || 0,
          initialCount: loc.liveCount || 0,
          status: 'active'
        }));

        locations.set(graphqlLocations);
        console.log('✅ Analytics Simple: Set locations from GraphQL:', graphqlLocations);
      } else {
        console.log('📊 Analytics Simple: No locations in GraphQL response, using empty array');
        locations.set([]);
      }
    } else {
      console.warn('⚠️ Analytics Simple: GraphQL request failed, using empty array');
      locations.set([]);
    }

    console.log('✅ Analytics Simple: Locations loaded successfully from GraphQL');
  } catch (err) {
    console.error('❌ Analytics Simple: Failed to load locations:', err);
    error.set(err.message);
    // Set empty array on error
    locations.set([]);
  } finally {
    isLoading.set(false);
  }
}

export async function addLocation(location) {
  try {
    console.log('➕ Analytics Simple: Adding location:', location);

    locations.update(current => {
      // Check if location already exists
      const exists = current.find(loc => loc.id === location.id);
      if (exists) {
        console.log('ℹ️ Analytics Simple: Location already exists, updating:', location.id);
        return current.map(loc =>
          loc.id === location.id ? { ...loc, ...location } : loc
        );
      } else {
        console.log('✅ Analytics Simple: Added new location:', location.id);
        return [...current, location];
      }
    });

  } catch (err) {
    console.error('❌ Analytics Simple: Failed to add location:', err);
    throw err;
  }
}

export async function removeLocation(locationId) {
  try {
    console.log('🗑️ Analytics Simple: Removing location:', locationId);

    locations.update(current =>
      current.filter(loc => loc.id !== locationId)
    );

    console.log('✅ Analytics Simple: Location removed:', locationId);
  } catch (err) {
    console.error('❌ Analytics Simple: Failed to remove location:', err);
    throw err;
  }
}

export function setFallbackMode(inFallback, reason = '') {
  fallbackMode.set(inFallback);
  fallbackReason.set(reason);
  console.log(`🔄 Analytics Simple: Fallback mode ${inFallback ? 'enabled' : 'disabled'}${reason ? `: ${reason}` : ''}`);
}