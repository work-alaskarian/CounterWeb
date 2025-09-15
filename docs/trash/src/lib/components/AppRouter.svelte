<script lang="ts">
  import { currentView } from '../stores/organization';
  import OrganizationDashboard from './OrganizationDashboard.svelte';
  import DivisionView from './DivisionView.svelte';
  import LocationView from './LocationView.svelte';
  // TODO: Import other views as they're created
  // import FloorView from './FloorView.svelte';
  // import CameraView from './CameraView.svelte';
  
  $: view = $currentView;
</script>

<div class="app-router">
  {#if view.type === 'organization'}
    <OrganizationDashboard />
  {:else if view.type === 'division'}
    <DivisionView />
  {:else if view.type === 'location'}
    <LocationView />
  {:else if view.type === 'floor'}
    <!-- <FloorView /> -->
    <div class="coming-soon">
      <h2>Floor View</h2>
      <p>Coming soon...</p>
      <button on:click={() => history.back()}>Go Back</button>
    </div>
  {:else if view.type === 'camera'}
    <!-- <CameraView /> -->
    <div class="coming-soon">
      <h2>Camera View</h2>
      <p>Coming soon...</p>
      <button on:click={() => history.back()}>Go Back</button>
    </div>
  {:else}
    <OrganizationDashboard />
  {/if}
</div>

<style>
  .app-router {
    min-height: 100vh;
  }
  
  .coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    text-align: center;
    gap: 16px;
  }
  
  .coming-soon h2 {
    color: #374151;
    margin: 0;
  }
  
  .coming-soon p {
    color: #6b7280;
    margin: 0;
  }
  
  .coming-soon button {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  
  .coming-soon button:hover {
    background: #2563eb;
  }
</style>