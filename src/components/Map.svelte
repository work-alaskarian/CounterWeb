<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import './styles/Map.css';
  // Leaflet is loaded globally in index.html
  // import 'leaflet/dist/leaflet.css'; // Already loaded in index.html
  // import L from 'leaflet'; // Use global L instead

  let mapContainer;
  const dispatch = createEventDispatcher();

  function tile2latlon(x, y, z) {
    const n = Math.pow(2, z);
    const lon_deg = (x / n) * 360.0 - 180.0;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat_deg = (lat_rad * 180.0) / Math.PI;
    return [lat_deg, lon_deg];
  }
// 26136
  onMount(() => {
    if (typeof L === 'undefined') {
      console.error('❌ Map: Leaflet library not loaded');
      mapContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">❌ Map library not loaded</div>';
      return;
    }

    if (!mapContainer) {
      console.error('❌ Map: Container not found');
      return;
    }

    console.log('🗺️ Map: Initializing...', { container: mapContainer });

    try {
      const initialTileX = 40755;
      const initialTileY = 26136;
      const initialZoom = 16;

      const initialCoords = tile2latlon(initialTileX, initialTileY, initialZoom);
      console.log('🗺️ Map: Initial coordinates:', initialCoords);

      const map = L.map(mapContainer).setView(initialCoords, initialZoom);
      console.log('🗺️ Map: Map instance created successfully');

    // Try custom tile server first, fallback to OpenStreetMap
    const customMapUrl = import.meta.env?.VITE_MAP_URL || 'http://10.10.1.205/';
    console.log('🗺️ Map: Trying custom tile server:', customMapUrl);

    const customTileLayer = L.tileLayer(customMapUrl + '{z}/{x}/{y}.png', {
      attribution: 'Custom Map Server',
      maxZoom: 23,
      minZoom: 16,
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    });

    // Fallback to OpenStreetMap if custom server fails
    const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    // Add custom tile layer first
    customTileLayer.addTo(map);

    // Add fallback error handling
    customTileLayer.on('tileerror', function(e) {
      console.log('🗺️ Map: Custom tile server failed, switching to OpenStreetMap');
      map.removeLayer(customTileLayer);
      osmTileLayer.addTo(map);
    });

    const points = [
      { tileX: initialTileX, tileY: initialTileY, text: 'Point 1' },
      { lat: 34.20049, lng: 43.87228, text: 'Specific Point' },
      { tileX: initialTileX - 1, tileY: initialTileY - 1, text: 'Point 3' }
    ];

    points.forEach(point => {
      let latlng;
      if (point.tileX !== undefined && point.tileY !== undefined) {
        latlng = tile2latlon(point.tileX, point.tileY, initialZoom);
      } else {
        latlng = [point.lat, point.lng];
      }
      
      L.circle(latlng, {
        color: '#16a085',
        fillColor: '#1abc9c',
        fillOpacity: 0.5,
        radius: 10
      }).addTo(map);

      const textIcon = L.divIcon({
        html: `<div style="font-size: 12px; color: #000; text-shadow: 1px 1px #fff;">${point.text}</div>`,
        className: '' // to avoid default icon styles
      });

      L.marker(latlng, { icon: textIcon }).addTo(map);
    });

      // Dispatch mousemove events
      map.on('mousemove', function (e) {
        dispatch('mapmousemove', { latlng: e.latlng });
      });

      console.log('🗺️ Map: Initialization complete');
    } catch (error) {
      console.error('❌ Map: Failed to initialize:', error);
      mapContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">❌ Map failed to load: ${error.message}</div>`;
    }
  });
</script>

<div bind:this={mapContainer} class="map-container"></div>


