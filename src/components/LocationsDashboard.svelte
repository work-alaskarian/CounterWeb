<script>
  import './styles/LocationsDashboard.css';
  import LiveCounter from './LiveCounter.svelte';
  import { customization } from '../lib/stores/customization.ts';
  import { 
    locations, 
    isLoading, 
    error,
    loadLocations, 
    addLocation, 
    removeLocation as removeLocationFromAPI,
    setupRealTimeUpdates
  } from '../lib/stores/analytics.js';
  import { onMount, onDestroy } from 'svelte';
  
  export let timeframe = 'Hourly';
  let showAddModal = false;
  let unsubscribeRealTime = null;
  
  $: ({ showCustomization, gridSize } = $customization);

  // Start with empty data, only use real data from API
  let locationsData = [];

  // Reactive update from store - only use real API data and deduplicate
  $: locationsData = ($locations || []).reduce((unique, location, index) => {
    // Create unique key by combining id with index to handle duplicates
    const uniqueLocation = {
      ...location,
      uniqueKey: `${location.id}_${index}_${location.name || 'unnamed'}`
    };
    
    // Deduplicate by ID - only keep the first occurrence
    if (!unique.find(loc => loc.id === location.id)) {
      unique.push(uniqueLocation);
    }
    return unique;
  }, []);
  
  const theme = { color: '#16a085', rgb: '22, 160, 133' };
  
  const availableLocations = [
    { id: 'northern-gate', name: 'البوابة الشمالية', initialCount: 0 },
    { id: 'southern-gate', name: 'البوابة الجنوبية', initialCount: 0 },
    { id: 'first-floor-shrine', name: 'الطابق الأول للحرم', initialCount: 0 },
    { id: 'third-floor-shrine', name: 'الطابق الثالث للحرم', initialCount: 0 },
    { id: 'basement-shrine', name: 'قبو الحرم', initialCount: 0 },
    { id: 'rooftop-shrine', name: 'سطح الحرم', initialCount: 0 },
    { id: 'pilgrimage-parking', name: 'موقف الزوار', initialCount: 0 },
    { id: 'visitor-parking', name: 'موقف الحجاج', initialCount: 0 },
    { id: 'shrine-garden', name: 'حديقة الحرم', initialCount: 0 },
    { id: 'womens-section', name: 'قسم النساء', initialCount: 0 },
    { id: 'library-shrine', name: 'مكتبة الحرم', initialCount: 0 },
    { id: 'dining-area', name: 'منطقة الطعام', initialCount: 0 },
    { id: 'lecture-hall', name: 'قاعة المحاضرات', initialCount: 0 }
  ];
  
  function handleTimeframeChange(event) {
    timeframe = event.target.value;
  }
  
  function openAddModal() {
    showAddModal = true;
  }
  
  function closeAddModal() {
    showAddModal = false;
  }
  
  async function addExistingLocation(location) {
    try {
      await addLocation(location);
      closeAddModal();
    } catch (error) {
      console.error('❌ LocationsDashboard: Failed to add location:', error);
      alert('فشل في إضافة الموقع: ' + error.message);
    }
  }
  
  async function addCustomLocation() {
    const locationName = prompt('اسم المنطقة الجديدة في الحرم:');
    if (locationName) {
      const newId = `custom-${Date.now()}`;
      const newLocation = {
        id: newId,
        name: locationName,
        initialCount: 0  // Start with 0 instead of random count
      };
      
      try {
        await addLocation(newLocation);
        closeAddModal();
      } catch (error) {
        console.error('❌ LocationsDashboard: Failed to add custom location:', error);
        alert('فشل في إضافة الموقع المخصص: ' + error.message);
      }
    }
  }
  
  async function removeLocation(locationId) {
    if (confirm('هل أنت متأكد من حذف هذا الموقع؟')) {
      try {
        await removeLocationFromAPI(locationId);
      } catch (error) {
        console.error('❌ LocationsDashboard: Failed to remove location:', error);
        alert('فشل في حذف الموقع: ' + error.message);
      }
    }
  }

  // Component lifecycle
  onMount(async () => {
    try {
      // Load locations from API first, then setup real-time
      await loadLocations();
      
      // Small delay to ensure store is populated
      setTimeout(() => {
        unsubscribeRealTime = setupRealTimeUpdates();
      }, 100);
    } catch (error) {
      console.error('❌ LocationsDashboard: Initialization failed:', error);
    }
  });

  onDestroy(() => {
    if (unsubscribeRealTime) {
      unsubscribeRealTime();
    }
  });
  
  function toggleCustomization() {
    customization.update(c => ({...c, showCustomization: !c.showCustomization}));
  }
  
  $: gridColumns = {
    small: 'repeat(auto-fit, minmax(280px, 1fr))',
    medium: 'repeat(auto-fit, minmax(350px, 1fr))',
    large: 'repeat(auto-fit, minmax(450px, 1fr))'
  }[gridSize];
  
  $: cardSize = gridSize === 'small' ? 'small' : 'normal';
  $: showChart = gridSize !== 'small';
</script>

<svelte:head>
  <title>عدادات مواقع متعددة</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="locations-header">
  <h2>إحصائيات مناطق الحرم الشريف</h2>
  
  <div class="controls">
    <button class="control-btn" on:click={toggleCustomization}>
      <span class="icon">⚙️</span>
      تخصيص
    </button>
    
    {#if $customization.showCustomization}
      <div class="grid-size-control">
        <label for="grid-size-select">حجم الشبكة:</label>
        <select id="grid-size-select" bind:value={$customization.gridSize}>
          <option value="small">صغير</option>
          <option value="medium">متوسط</option>
          <option value="large">كبير</option>
        </select>
      </div>
    {/if}
  </div>
</div>

{#if $isLoading && locationsData.length === 0}
  <div class="loading-state">
    <div class="loading-spinner">⟳</div>
    <p>جاري تحميل البيانات...</p>
  </div>
{:else if $error && locationsData.length === 0}
  <div class="error-state">
    <div class="error-icon">⚠️</div>
    <p>خطأ في تحميل البيانات: {$error}</p>
    <button on:click={loadLocations}>إعادة المحاولة</button>
  </div>
{:else if locationsData.length === 0 && !$isLoading}
  <div class="empty-state">
    <div class="empty-icon">📍</div>
    <p>لا توجد مواقع متاحة</p>
    <p>اضغط على زر إضافة منطقة لإنشاء موقع جديد</p>
  </div>
{:else}
  <div class="dashboard-grid" style="grid-template-columns: {gridColumns}">
    {#each locationsData as location (location.uniqueKey || location.id)}
      <div class="location-wrapper">
        {#if $customization.showCustomization}
          <button class="remove-btn" on:click={() => removeLocation(location.id)} title="حذف الموقع">×</button>
        {/if}
        <LiveCounter 
          {location}
          {theme}
          {timeframe}
          showChart={showChart}
          showHover={true}
          smoothCurve={false}
          useSvg={false}
          cardSize={cardSize}
        />
      </div>
    {/each}
    
    {#if $customization.showCustomization}
      <button class="add-card" on:click={openAddModal}>
        <div class="add-icon">+</div>
        <div class="add-text">إضافة منطقة</div>
      </button>
    {/if}
  </div>
{/if}

<!-- Add Location Modal -->
{#if showAddModal}
  <div class="modal-overlay" on:click={closeAddModal} on:keydown={(e) => e.key === 'Escape' && closeAddModal()} role="dialog" tabindex="-1">
    <div class="modal-content" on:click|stopPropagation on:keydown|stopPropagation>
      <div class="modal-header">
        <h3>إضافة منطقة جديدة في الحرم</h3>
        <button class="modal-close" on:click={closeAddModal}>&times;</button>
      </div>
      
      <div class="modal-body">
        <h4>اختر من مناطق الحرم المتاحة:</h4>
        <div class="locations-grid">
          {#each availableLocations as location}
            {#if !locationsData.find(loc => loc.id === location.id)}
              <button class="location-option" on:click={() => addExistingLocation(location)}>
                <span class="location-icon">📍</span>
                <span class="location-name">{location.name}</span>
                <span class="location-count">{location.initialCount}</span>
              </button>
            {/if}
          {/each}
        </div>
        
        <div class="custom-location">
          <button class="custom-btn" on:click={addCustomLocation}>
            <span class="custom-icon">✨</span>
            إنشاء منطقة مخصصة
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
