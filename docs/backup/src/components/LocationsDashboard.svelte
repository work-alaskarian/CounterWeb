<script>
  import './styles/LocationsDashboard.css';
  import LiveCounter from './LiveCounter.svelte';
  import { customization } from '../lib/stores/customization.ts';
  
  export let timeframe = 'Hourly';
  let showAddModal = false;
  
  $: ({ showCustomization, gridSize } = $customization);

  let locationsData = [
    { id: 'main-entrance', name: 'بوابة الحرم الرئيسية', initialCount: 1200 },
    { id: 'second-floor', name: 'الطابق الثاني للحرم', initialCount: 850 },
    { id: 'shrine-courtyard', name: 'صحن الحرم الشريف', initialCount: 900 },
    { id: 'prayer-area', name: 'منطقة الصلاة', initialCount: 1500 },
    { id: 'eastern-gate', name: 'البوابة الشرقية', initialCount: 650 },
    { id: 'western-gate', name: 'البوابة الغربية', initialCount: 700 }
  ];
  
  const theme = { color: '#16a085', rgb: '22, 160, 133' };
  
  const availableLocations = [
    { id: 'northern-gate', name: 'البوابة الشمالية', initialCount: 800 },
    { id: 'southern-gate', name: 'البوابة الجنوبية', initialCount: 600 },
    { id: 'first-floor-shrine', name: 'الطابق الأول للحرم', initialCount: 1100 },
    { id: 'third-floor-shrine', name: 'الطابق الثالث للحرم', initialCount: 400 },
    { id: 'basement-shrine', name: 'قبو الحرم', initialCount: 200 },
    { id: 'rooftop-shrine', name: 'سطح الحرم', initialCount: 150 },
    { id: 'pilgrimage-parking', name: 'موقف الزوار', initialCount: 300 },
    { id: 'visitor-parking', name: 'موقف الحجاج', initialCount: 250 },
    { id: 'shrine-garden', name: 'حديقة الحرم', initialCount: 500 },
    { id: 'womens-section', name: 'قسم النساء', initialCount: 350 },
    { id: 'library-shrine', name: 'مكتبة الحرم', initialCount: 180 },
    { id: 'dining-area', name: 'منطقة الطعام', initialCount: 450 },
    { id: 'lecture-hall', name: 'قاعة المحاضرات', initialCount: 120 }
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
  
  function addExistingLocation(location) {
    if (!locationsData.find(loc => loc.id === location.id)) {
      locationsData = [...locationsData, { ...location }];
    }
    closeAddModal();
  }
  
  function addCustomLocation() {
    const locationName = prompt('اسم المنطقة الجديدة في الحرم:');
    if (locationName) {
      const newId = `custom-${Date.now()}`;
      const newLocation = {
        id: newId,
        name: locationName,
        initialCount: Math.floor(Math.random() * 800) + 200
      };
      locationsData = [...locationsData, newLocation];
    }
    closeAddModal();
  }
  
  function removeLocation(locationId) {
    locationsData = locationsData.filter(loc => loc.id !== locationId);
  }
  
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

<div class="dashboard-grid" style="grid-template-columns: {gridColumns}">
  {#each locationsData as location (location.id)}
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
