<script lang="ts">
  import { onMount } from 'svelte';
  import { organization, currentView } from '$lib/stores/organization';
  import { generateSampleOrganization } from '$lib/sampleData';
  import SlidingProfessionalDashboard from '$lib/components/SlidingProfessionalDashboard.svelte';
  
  onMount(() => {
    // Initialize with sample data
    const sampleOrg = generateSampleOrganization();
    organization.set(sampleOrg);
    currentView.set({ type: 'organization', entityId: sampleOrg.id });
  });
</script>

<SlidingProfessionalDashboard />
