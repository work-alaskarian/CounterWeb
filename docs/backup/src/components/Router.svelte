<script>
  import './styles/Router.css';
  import { createEventDispatcher } from 'svelte';
  
  export let currentPage = 'live-counter';
  
  const dispatch = createEventDispatcher();
  
  function navigate(page) {
    currentPage = page;
    dispatch('navigate', page);
  }
</script>

<nav class="navigation">
  <div class="nav-brand">
    <h1>نظام عداد الأشخاص</h1>
  </div>
  
  <div class="nav-links">
    <button 
      class="nav-link {currentPage === 'live-counter' ? 'active' : ''}"
      on:click={() => navigate('live-counter')}
    >
      العداد المباشر
    </button>
    <button 
      class="nav-link {currentPage === 'locations' ? 'active' : ''}"
      on:click={() => navigate('locations')}
    >
      مواقع متعددة
    </button>
    <button 
      class="nav-link {currentPage === 'analytics' ? 'active' : ''}"
      on:click={() => navigate('analytics')}
    >
      لوحة تحكم التحليلات
    </button>
  </div>
</nav>

