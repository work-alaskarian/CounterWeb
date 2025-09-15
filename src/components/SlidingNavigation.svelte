<script>
  import './styles/SlidingNavigation.css';
  import { createEventDispatcher } from 'svelte';
  // import { customization } from '../lib/stores/customization'; // Commented out for now
  
  export let currentPage = 'live-counter';
  
  const dispatch = createEventDispatcher();
  
  const pages = [
    { id: 'live-counter', name: 'العداد المباشر', icon: 'analytics' },
    { id: 'locations', name: 'مواقع متعددة', icon: 'location_on' },
    { id: 'analytics', name: 'لوحة تحكم التحليلات', icon: 'dashboard' }
  ];
  
  let currentIndex = pages.findIndex(page => page.id === currentPage);
  let isTransitioning = false;
  
  $: currentIndex = pages.findIndex(page => page.id === currentPage);
  
  function navigateTo(pageId) {
    if (isTransitioning) return;
    
    isTransitioning = true;
    dispatch('navigate', pageId);
    
    setTimeout(() => {
      isTransitioning = false;
    }, 500);
  }
  
  function handleKeydown(event, pageId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateTo(pageId);
    }
  }
  
  function handleSwipe(direction) {
    if (isTransitioning) return;
    
    let newIndex;
    if (direction === 'left' && currentIndex < pages.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'right' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else {
      return;
    }
    
    navigateTo(pages[newIndex].id);
  }
  
  let touchStartX = 0;
  let touchEndX = 0;
  
  function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
  }
  
  function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        handleSwipe('left');
      } else {
        handleSwipe('right');
      }
    }
  }
</script>

<div 
  class="sliding-container"
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
>
  <!-- Page Indicators -->
  <div class="page-indicators">
    <div class="brand">
      <h1>نظام عداد الأشخاص</h1>
    </div>
    
    <div class="indicators">
      {#each pages as page, index}
        <button
          class="indicator {index === currentIndex ? 'active' : ''}"
          on:click={() => navigateTo(page.id)}
          on:keydown={(e) => handleKeydown(e, page.id)}
          title={page.name}
        >
          <span class="material-icons icon">{page.icon}</span>
          <span class="name">{page.name}</span>
        </button>
      {/each}
    </div>
    
    <div class="navigation-arrows">
      <!-- <button
        class="customization-btn"
        on:click={() => customization.update(c => ({...c, showCustomization: !c.showCustomization}))}
        title="تخصيص"
      >
        ⚙️
      </button> -->
      <button
        class="nav-arrow right {currentIndex === 0 ? 'disabled' : ''}"
        on:click={() => handleSwipe('right')}
        disabled={currentIndex === 0}
        title="السابق"
      >
        <span class="material-icons">chevron_right</span>
      </button>
      <span class="page-counter">{currentIndex + 1} / {pages.length}</span>
      <button
        class="nav-arrow left {currentIndex === pages.length - 1 ? 'disabled' : ''}"
        on:click={() => handleSwipe('left')}
        disabled={currentIndex === pages.length - 1}
        title="التالي"
      >
        <span class="material-icons">chevron_left</span>
      </button>
    </div>
  </div>

  <!-- Content Slider -->
  <div class="content-slider" style="transform: translateX(-{currentIndex * 100}%)">
    <div class="slide">
      <slot name="live-counter" />
    </div>
    <div class="slide">
      <slot name="locations" />
    </div>
    <div class="slide">
      <slot name="analytics" />
    </div>
  </div>
</div>

