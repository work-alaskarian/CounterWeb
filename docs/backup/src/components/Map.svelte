<script>
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import L from 'leaflet';

  let mapContainer;

  function tile2latlon(x, y, z) {
    const n = Math.pow(2, z);
    const lon_deg = (x / n) * 360.0 - 180.0;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat_deg = (lat_rad * 180.0) / Math.PI;
    return [lat_deg, lon_deg];
  }
// 26136
  onMount(() => {
    const initialTileX = 40755;
    const initialTileY = 26136;
    const initialZoom = 16;

    const initialCoords = tile2latlon(initialTileX, initialTileY, initialZoom);
    const map = L.map(mapContainer).setView(initialCoords, initialZoom);

    L.tileLayer(process.env.MAP_URL + '{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; OpenStreetMap contributors',
      maxZoom: 23,
      minZoom: 16
    }).addTo(map);

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
    const dispatch = createEventDispatcher();
    map.on('mousemove', function (e) {
      dispatch('mapmousemove', { latlng: e.latlng });
    });
  });
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style>
  .map-container {
    height: 50vh;
    width: 80vh;
    margin: 0 auto;
    border: 3px solid #16a085;
    border-radius: 15px;
    box-shadow: 0 4px 12px rgba(22, 160, 133, 0.15);
  }
</style>
