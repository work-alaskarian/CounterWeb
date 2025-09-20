<script>
  import './styles/LoadingState.css';

  export let size = 'medium'; // 'small', 'medium', 'large'
  export let variant = 'default'; // 'default', 'overlay', 'inline', 'card'
  export let message = 'جاري التحميل...';
  export let showMessage = true;
  export let timeout = 30000; // 30 seconds default timeout
  export let onTimeout = null;
  export let type = 'spinner'; // 'spinner', 'dots', 'bars', 'pulse', 'chart'
  export let showProgress = false;
  export let progress = 0; // 0-100
  
  let timeoutId = null;
  let isTimedOut = false;
  
  // Set up timeout if specified
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      isTimedOut = true;
      if (onTimeout) {
        onTimeout();
      }
    }, timeout);
  }
  
  // Cleanup timeout on destroy
  function cleanup() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
  
  // Handle timeout retry
  function handleRetry() {
    isTimedOut = false;
    cleanup();
    
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        if (onTimeout) {
          onTimeout();
        }
      }, timeout);
    }
  }
  
  // Size classes
  $: sizeClass = {
    small: 'loading-small',
    medium: 'loading-medium', 
    large: 'loading-large'
  }[size] || 'loading-medium';
  
  // Variant classes
  $: variantClass = {
    default: 'loading-default',
    overlay: 'loading-overlay',
    inline: 'loading-inline',
    card: 'loading-card'
  }[variant] || 'loading-default';

  // Type classes
  $: typeClass = {
    spinner: 'type-spinner',
    dots: 'type-dots',
    bars: 'type-bars',
    pulse: 'type-pulse',
    chart: 'type-chart'
  }[type] || 'type-spinner';
</script>

<svelte:window on:beforeunload={cleanup} />

{#if !isTimedOut}
  <div class="loading-container {sizeClass} {variantClass} {typeClass}" role="status" aria-live="polite">
    {#if variant === 'overlay'}
      <div class="loading-backdrop"></div>
    {/if}

    <div class="loading-content">
      <!-- Different loading animations based on type -->
      {#if type === 'spinner'}
        <div class="spinner" aria-hidden="true">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
      {:else if type === 'dots'}
        <div class="dots-loader" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      {:else if type === 'bars'}
        <div class="bars-loader" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      {:else if type === 'pulse'}
        <div class="pulse-loader" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle class="pulse-outer" cx="50" cy="50" r="45" />
            <circle class="pulse-inner" cx="50" cy="50" r="30" />
            <circle class="pulse-center" cx="50" cy="50" r="15" />
          </svg>
        </div>
      {:else if type === 'chart'}
        <div class="chart-loader" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path class="chart-line" d="M10 80 L30 50 L50 60 L70 30 L90 40" />
            <circle class="chart-dot" cx="10" cy="80" r="4" />
            <circle class="chart-dot" cx="30" cy="50" r="4" />
            <circle class="chart-dot" cx="50" cy="60" r="4" />
            <circle class="chart-dot" cx="70" cy="30" r="4" />
            <circle class="chart-dot" cx="90" cy="40" r="4" />
          </svg>
        </div>
      {/if}

      {#if showProgress && progress > 0}
        <div class="progress-container">
          <div class="progress-bar" style="width: {progress}%"></div>
        </div>
      {/if}

      {#if showMessage}
        <p class="loading-message">{message}</p>
      {/if}
    </div>
  </div>
{:else}
  <!-- Timeout state -->
  <div class="timeout-container {sizeClass} {variantClass}">
    {#if variant === 'overlay'}
      <div class="loading-backdrop"></div>
    {/if}
    
    <div class="timeout-content">
      <div class="timeout-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12,6 12,12 16,14"></polyline>
        </svg>
      </div>
      
      <p class="timeout-message">
        انتهت مهلة التحميل. يرجى المحاولة مرة أخرى.
      </p>
      
      <button class="timeout-retry" on:click={handleRetry}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        إعادة المحاولة
      </button>
    </div>
  </div>
{/if}

