<!--
  WebSocket Status Component - Simplified
  Shows basic connection status for debugging
-->
<script>
  import { onMount } from 'svelte';
  import globalWebSocketService from '../lib/services/global-websocket.js';

  let connectionStatus = 'disconnected';
  let lastMessage = 'No connection yet';
  let messageCount = 0;

  onMount(() => {
    // Subscribe to connection changes
    globalWebSocketService.onConnectionChange((status) => {
      connectionStatus = status.type;
      messageCount++;
      lastMessage = `Connection: ${status.type} at ${new Date().toLocaleTimeString()}`;
    });
  });
</script>

<div class="websocket-log">
  <div class="log-header">
    <h4>🔌 WebSocket Status</h4>
    <div class="status-indicator {connectionStatus}"></div>
  </div>

  <div class="log-content">
    <div class="status-info">
      <span>Status: <strong>{connectionStatus}</strong></span>
      <span>Messages: <strong>{messageCount}</strong></span>
    </div>
    <div class="last-message">{lastMessage}</div>
  </div>
</div>

<style>
  .websocket-log {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  }

  .log-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .log-header h4 {
    margin: 0;
    color: #495057;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #6c757d;
  }

  .status-indicator.connected {
    background: #28a745;
  }

  .status-indicator.connecting {
    background: #ffc107;
  }

  .status-indicator.error {
    background: #dc3545;
  }

  .log-content {
    font-size: 14px;
    color: #6c757d;
  }

  .status-info {
    display: flex;
    gap: 16px;
    margin-bottom: 8px;
  }

  .last-message {
    font-style: italic;
    color: #868e96;
  }
</style>