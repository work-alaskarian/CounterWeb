<script>
  import { onMount, createEventDispatcher } from 'svelte';
  
  export const fallbackComponent = null;
  export let errorMessage = 'حدث خطأ غير متوقع';
  export let showRetry = true;
  export let retryText = 'إعادة المحاولة';
  export let onRetry = null;
  
  const dispatch = createEventDispatcher();
  
  let hasError = false;
  let errorDetails = null;
  let errorId = null;
  
  onMount(() => {
    
    // Global error handler for unhandled errors
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });
  
  function handleGlobalError(event) {
    console.error('🚨 Global error caught:', event.error);
    setError(event.error, 'Global Error');
  }
  
  function handleUnhandledRejection(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    setError(event.reason, 'Unhandled Promise Rejection');
  }
  
  export function setError(error, source = 'Component') {
    hasError = true;
    errorId = Math.random().toString(36).substring(7);
    
    errorDetails = {
      message: error?.message || error?.toString() || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      source: source,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: errorId
    };
    
    console.error(`🚨 [${errorId}] Error boundary activated:`, errorDetails);
    
    // Dispatch error event for analytics/logging
    dispatch('error', errorDetails);
    
    // Report to external service if available
    reportError(errorDetails);
  }
  
  export function clearError() {
    hasError = false;
    errorDetails = null;
    errorId = null;
  }
  
  function handleRetry() {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior - reload the page
      window.location.reload();
    }
    clearError();
  }
  
  function reportError(details) {
    // In production, send to error reporting service
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'exception', {
          description: details.message,
          fatal: false,
          custom_map: {
            error_id: details.errorId,
            source: details.source
          }
        });
      }
    } catch (reportingError) {
      console.warn('Failed to report error to analytics:', reportingError);
    }
  }
  
  function copyErrorDetails() {
    const errorText = `
Error ID: ${errorDetails.errorId}
Message: ${errorDetails.message}
Source: ${errorDetails.source}
Timestamp: ${errorDetails.timestamp}
URL: ${errorDetails.url}
User Agent: ${errorDetails.userAgent}
Stack Trace:
${errorDetails.stack}
    `.trim();
    
    navigator.clipboard.writeText(errorText).then(() => {
      alert('تم نسخ تفاصيل الخطأ إلى الحافظة');
    }).catch(() => {
      prompt('نسخ تفاصيل الخطأ:', errorText);
    });
  }
</script>

{#if hasError}
  <div class="error-boundary">
    <div class="error-container">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      
      <h2 class="error-title">{errorMessage}</h2>
      
      <p class="error-description">
        نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو إعادة تحميل الصفحة.
      </p>
      
      <div class="error-actions">
        {#if showRetry}
          <button class="retry-button" on:click={handleRetry}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {retryText}
          </button>
        {/if}
        
        <button class="copy-button" on:click={copyErrorDetails}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          نسخ تفاصيل الخطأ
        </button>
      </div>
      
      <details class="error-details">
        <summary>تفاصيل تقنية</summary>
        <div class="error-technical">
          <p><strong>معرف الخطأ:</strong> {errorDetails.errorId}</p>
          <p><strong>الوقت:</strong> {new Date(errorDetails.timestamp).toLocaleString('ar-SA')}</p>
          <p><strong>المصدر:</strong> {errorDetails.source}</p>
          <p><strong>الرسالة:</strong> {errorDetails.message}</p>
          {#if errorDetails.stack}
            <pre class="error-stack">{errorDetails.stack}</pre>
          {/if}
        </div>
      </details>
    </div>
  </div>
{:else}
  <!-- Render child content -->
  <slot />
{/if}

