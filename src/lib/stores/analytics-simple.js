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
    console.debug('📊 Loading locations...');

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
      console.debug('✅ GraphQL response:', result?.data?.allLocations?.length || 0);

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
        console.info(`✅ Loaded ${graphqlLocations.length} locations`);
      } else {
        console.debug('📊 No locations in response');
        locations.set([]);
      }
    } else {
      console.warn('⚠️ GraphQL request failed');
      locations.set([]);
    }

  } catch (err) {
    console.error('❌ Failed to load locations:', err);
    error.set(err.message);
    // Set empty array on error
    locations.set([]);
  } finally {
    isLoading.set(false);
  }
}

export async function addLocation(location) {
  try {
    console.debug('➕ Adding location:', location.id);

    locations.update(current => {
      // Check if location already exists
      const exists = current.find(loc => loc.id === location.id);
      if (exists) {
        console.debug('ℹ️ Updating location:', location.id);
        return current.map(loc =>
          loc.id === location.id ? { ...loc, ...location } : loc
        );
      } else {
        console.debug('✅ Added location:', location.id);
        return [...current, location];
      }
    });

  } catch (err) {
    console.error('❌ Failed to add location:', err);
    throw err;
  }
}

export async function removeLocation(locationId) {
  try {
    console.debug('🗑️ Removing location:', locationId);

    locations.update(current =>
      current.filter(loc => loc.id !== locationId)
    );

    console.debug('✅ Removed location:', locationId);
  } catch (err) {
    console.error('❌ Failed to remove location:', err);
    throw err;
  }
}

export function setFallbackMode(inFallback, reason = '') {
  fallbackMode.set(inFallback);
  fallbackReason.set(reason);
  console.info(`🔄 Fallback mode ${inFallback ? 'enabled' : 'disabled'}${reason ? ': ' + reason : ''}`);
}