<!--
  WebSocket Message Log Component
  Displays real-time WebSocket messages for testing and debugging
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { connectionStatus, webSocketMessages } from '../lib/stores/analytics.js';
  
  export let maxMessages = 100;
  export let showDetails = false;
  
  let isVisible = false;
  let unsubscribe = null;
  let autoScroll = true;
  let messageContainer;
  
  // Subscribe to WebSocket messages from store
  onMount(() => {
    unsubscribe = webSocketMessages.subscribe(storeMessages => {
      // Auto-scroll to top if enabled
      if (autoScroll && messageContainer && storeMessages.length > 0) {
        setTimeout(() => {
          messageContainer.scrollTop = 0;
        }, 50);
      }
    });
  });
  
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  
  function addMessage(messageData) {
    const message = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: messageData.type || 'unknown',
      data: messageData.data || {},
      source: messageData.source || 'WebSocket',
      rawSize: messageData.rawSize || JSON.stringify(messageData.data || {}).length,
      ...messageData
    };
    
    // Add to the store instead of local state
    webSocketMessages.update(messages => [message, ...messages.slice(0, maxMessages - 1)]);
  }
  
  function clearMessages() {
    webSocketMessages.set([]);
  }
  
  function toggleVisibility() {
    isVisible = !isVisible;
  }
  
  function toggleAutoScroll() {
    autoScroll = !autoScroll;
  }
  
  function toggleDetails() {
    showDetails = !showDetails;
  }
  
  function downloadMessages() {
    const data = JSON.stringify($webSocketMessages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websocket-messages-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function getMessageTypeClass(type) {
    switch (type) {
      case 'live_count_update': return 'text-primary';
      case 'liveUpdate': return 'text-info';
      case 'analytics_update': return 'text-success';
      case 'pong': return 'text-secondary';
      case 'error': return 'text-danger';
      default: return 'text-muted';
    }
  }
  
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }
  
  // Simulate test message (for testing)
  function sendTestMessage() {
    addMessage({
      type: 'test_message',
      data: {
        test: true,
        message: 'This is a test message from UI',
        random: Math.floor(Math.random() * 1000)
      },
      source: 'UI Test',
      timestamp: new Date().toISOString()
    });
  }
</script>

<!-- WebSocket Log Toggle Button -->
<div class="websocket-log-container">
  <button 
    class="btn btn-outline-info btn-sm websocket-toggle"
    on:click={toggleVisibility}
    title="Toggle WebSocket Message Log"
  >
    <i class="fas fa-terminal me-1"></i>
    WebSocket Log
    {#if $webSocketMessages.length > 0}
      <span class="badge bg-info ms-1">{$webSocketMessages.length}</span>
    {/if}
  </button>
  
  {#if isVisible}
    <!-- WebSocket Log Panel -->
    <div class="websocket-log-panel">
      <div class="websocket-log-header">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="fas fa-satellite-dish me-2"></i>
            WebSocket Messages
            <span class="badge bg-secondary ms-2">{$webSocketMessages.length}</span>
          </h6>
          
          <div class="btn-group btn-group-sm">
            <button 
              class="btn btn-outline-secondary"
              on:click={toggleDetails}
              title="Toggle Details"
            >
              <i class="fas fa-{showDetails ? 'eye-slash' : 'eye'}"></i>
            </button>
            
            <button 
              class="btn btn-outline-secondary"
              on:click={sendTestMessage}
              title="Send Test Message"
            >
              <i class="fas fa-vial"></i>
            </button>
            
            <button 
              class="btn btn-outline-secondary"
              on:click={downloadMessages}
              title="Download Messages"
              disabled={$webSocketMessages.length === 0}
            >
              <i class="fas fa-download"></i>
            </button>
            
            <button 
              class="btn btn-outline-warning"
              on:click={clearMessages}
              title="Clear Messages"
            >
              <i class="fas fa-trash"></i>
            </button>
            
            <button 
              class="btn btn-outline-danger"
              on:click={toggleVisibility}
              title="Close Log"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div class="mt-2 d-flex align-items-center gap-3">
          <small class="text-muted">
            Connection: <span class="badge bg-{$connectionStatus === 'connected' ? 'success' : 'danger'}">{$connectionStatus}</span>
          </small>
          
          <label class="form-check-label">
            <input 
              type="checkbox" 
              class="form-check-input"
              bind:checked={autoScroll}
              on:change={toggleAutoScroll}
            >
            <small>Auto-scroll</small>
          </label>
        </div>
      </div>
      
      <div class="websocket-log-body" bind:this={messageContainer}>
        {#if $webSocketMessages.length === 0}
          <div class="text-center text-muted py-4">
            <i class="fas fa-inbox fa-2x mb-2"></i>
            <p>No WebSocket messages received yet</p>
            <small>Messages will appear here in real-time</small>
          </div>
        {:else}
          {#each $webSocketMessages as message (message.id)}
            <div class="message-item">
              <div class="message-header">
                <span class="message-time">{formatTimestamp(message.timestamp)}</span>
                <span class="message-type {getMessageTypeClass(message.type)}">
                  <i class="fas fa-circle me-1"></i>
                  {message.type}
                </span>
                <span class="message-source">
                  <i class="fas fa-tag me-1"></i>
                  {message.source}
                </span>
                <span class="message-size text-muted">
                  {message.rawSize} bytes
                </span>
              </div>
              
              {#if showDetails}
                <div class="message-data">
                  <pre>{JSON.stringify(message.data, null, 2)}</pre>
                </div>
              {:else}
                <div class="message-summary">
                  {#if message.data.location_id}
                    Location: <code>{message.data.location_id}</code>
                  {/if}
                  {#if message.data.live_count !== undefined}
                    Count: <code>{message.data.live_count}</code>
                  {/if}
                  {#if message.data.event}
                    Event: <code>{message.data.event}</code>
                  {/if}
                  {#if Object.keys(message.data).length === 0}
                    <em class="text-muted">Empty payload</em>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .websocket-log-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1050;
    max-width: 600px;
  }
  
  .websocket-toggle {
    border-radius: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .websocket-log-panel {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    margin-top: 10px;
    min-width: 500px;
    max-width: 600px;
  }
  
  .websocket-log-header {
    padding: 12px 16px;
    border-bottom: 1px solid #dee2e6;
    background: #f8f9fa;
    border-radius: 8px 8px 0 0;
  }
  
  .websocket-log-body {
    max-height: 400px;
    overflow-y: auto;
    padding: 8px;
  }
  
  .message-item {
    border: 1px solid #e9ecef;
    border-radius: 4px;
    margin-bottom: 8px;
    overflow: hidden;
  }
  
  .message-header {
    background: #f8f9fa;
    padding: 6px 10px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #e9ecef;
  }
  
  .message-time {
    color: #6c757d;
    font-family: monospace;
    min-width: 80px;
  }
  
  .message-type {
    font-weight: 500;
    font-family: monospace;
  }
  
  .message-source {
    color: #6c757d;
    font-size: 0.8rem;
  }
  
  .message-size {
    margin-left: auto;
    font-size: 0.75rem;
    font-family: monospace;
  }
  
  .message-data {
    padding: 8px 10px;
    background: #f8f9fa;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .message-data pre {
    margin: 0;
    font-size: 0.8rem;
    color: #495057;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .message-summary {
    padding: 6px 10px;
    font-size: 0.85rem;
    color: #495057;
  }
  
  .message-summary code {
    background: #e9ecef;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.8rem;
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .websocket-log-panel {
      background: #2d3748;
      border-color: #4a5568;
      color: #e2e8f0;
    }
    
    .websocket-log-header {
      background: #1a202c;
      border-color: #4a5568;
    }
    
    .message-item {
      border-color: #4a5568;
    }
    
    .message-header {
      background: #1a202c;
      border-color: #4a5568;
    }
    
    .message-data {
      background: #1a202c;
    }
    
    .message-data pre {
      color: #e2e8f0;
    }
    
    .message-summary code {
      background: #4a5568;
      color: #e2e8f0;
    }
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .websocket-log-container {
      position: relative;
      top: auto;
      right: auto;
      margin: 10px;
      max-width: none;
    }
    
    .websocket-log-panel {
      min-width: auto;
      max-width: none;
    }
    
    .message-header {
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .message-size {
      margin-left: 0;
    }
  }
</style>