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

<style>
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .loading-default {
    width: 100%;
    min-height: 200px;
  }
  
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9998;
  }
  
  .loading-inline {
    display: inline-flex;
    min-height: auto;
  }
  
  .loading-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }
  
  .loading-content {
    position: relative;
    text-align: center;
    z-index: 1;
  }
  
  .spinner {
    position: relative;
    display: inline-block;
  }
  
  .loading-small .spinner {
    width: 24px;
    height: 24px;
  }
  
  .loading-medium .spinner {
    width: 40px;
    height: 40px;
  }
  
  .loading-large .spinner {
    width: 64px;
    height: 64px;
  }
  
  .spinner-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 2px solid transparent;
    border-top: 2px solid #16a085;
    border-radius: 50%;
    animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  }
  
  .spinner-ring:nth-child(1) {
    animation-delay: -0.45s;
  }
  
  .spinner-ring:nth-child(2) {
    animation-delay: -0.3s;
  }
  
  .spinner-ring:nth-child(3) {
    animation-delay: -0.15s;
  }
  
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  .loading-message {
    margin-top: 1rem;
    margin-bottom: 0;
    color: #2c3e50;
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .loading-small .loading-message {
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }
  
  .loading-large .loading-message {
    font-size: 1.1rem;
    margin-top: 1.5rem;
  }
  
  .loading-overlay .loading-message {
    color: white;
  }
  
  /* Timeout styles */
  .timeout-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .timeout-content {
    position: relative;
    text-align: center;
    z-index: 1;
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    max-width: 300px;
  }
  
  .timeout-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    color: #e67e22;
  }
  
  .timeout-icon svg {
    width: 100%;
    height: 100%;
  }
  
  .timeout-message {
    color: #2c3e50;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
  
  .timeout-retry {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #16a085;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .timeout-retry:hover {
    background: #148f76;
    transform: translateY(-1px);
  }
  
  .timeout-retry svg {
    width: 16px;
    height: 16px;
  }
  
  .loading-inline .timeout-content {
    padding: 1rem;
    min-width: 200px;
  }
  
  .loading-small .timeout-content {
    padding: 1rem;
    max-width: 250px;
  }
  
  .loading-small .timeout-icon {
    width: 32px;
    height: 32px;
  }
  
  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .spinner-ring {
      animation: none;
    }
    
    .spinner::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 4px;
      height: 4px;
      background: #16a085;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
  }
  
  @media (max-width: 768px) {
    .timeout-content {
      margin: 1rem;
      padding: 1.5rem;
    }
  }
</style>