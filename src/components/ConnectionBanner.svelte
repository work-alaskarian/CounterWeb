<script>
  import { fallbackMode, fallbackReason } from '../lib/stores/analytics-simple.js';
  
  let showBanner = false;
  let reason = '';
  let retryTime = null;
  
  // Subscribe to fallback mode changes
  fallbackMode.subscribe(inFallback => {
    showBanner = inFallback;
  });
  
  fallbackReason.subscribe(currentReason => {
    reason = currentReason || '';
  });
  
  
  function formatRetryTime(time) {
    if (!time) return '';
    const now = new Date();
    const retry = new Date(time);
    const diffSeconds = Math.max(0, Math.floor((retry - now) / 1000));
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s`;
    }
    
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }
</script>

{#if showBanner}
  <div class="connection-banner">
    <div class="banner-content">
      <div class="warning-icon">⚠️</div>
      <div class="banner-message">
        <span class="main-message">Connection Issues - Using Periodic Updates</span>
        {#if reason}
          <span class="reason">Reason: {reason}</span>
        {/if}
        {#if retryTime}
          <span class="retry-info">Retry in: {formatRetryTime(retryTime)}</span>
        {/if}
      </div>
      <div class="banner-status">
        <div class="status-dot fallback"></div>
        <span>Fallback Mode</span>
      </div>
    </div>
  </div>
{/if}

