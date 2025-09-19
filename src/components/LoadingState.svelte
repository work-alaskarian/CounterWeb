<script>
  export let size = 'medium'; // 'small', 'medium', 'large'
  export let variant = 'default'; // 'default', 'overlay', 'inline'
  export let message = 'جاري التحميل...';
  export let showMessage = true;
  export let timeout = 30000; // 30 seconds default timeout
  export let onTimeout = null;
  
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
    inline: 'loading-inline'
  }[variant] || 'loading-default';
</script>

<svelte:window on:beforeunload={cleanup} />

{#if !isTimedOut}
  <div class="loading-container {sizeClass} {variantClass}" role="status" aria-live="polite">
    {#if variant === 'overlay'}
      <div class="loading-backdrop"></div>
    {/if}
    
    <div class="loading-content">
      <!-- Animated spinner -->
      <div class="spinner" aria-hidden="true">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      
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

