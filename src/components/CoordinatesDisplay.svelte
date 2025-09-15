<script>
  export let lat = 0;
  export let lng = 0;
</script>

<div class="coordinates-display">
  Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
</div>

<style>
  .coordinates-display {
    background-color: rgba(255, 255, 255, 0.8);
    padding: 5px 10px;
    border-radius: 5px;
    font-family: sans-serif;
    font-size: 14px;
    color: #333;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-top: 10px; /* Adjust as needed for placement */
  }
</style>