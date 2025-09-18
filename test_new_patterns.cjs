#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🧪 Testing New Pattern-Based WebSocket API');
console.log('==========================================');

// Connect to the WebSocket
const ws = new WebSocket('ws://localhost:8080/ws/analytics');

let testStep = 0;
const tests = [
  '1. Basic ping test',
  '2. Subscribe to live_count pattern',
  '3. Subscribe to chart_data pattern', 
  '4. Subscribe to ping_pong pattern',
  '5. Wait for auto-updates'
];

function runNextTest() {
  if (testStep >= tests.length) {
    console.log('✅ All tests scheduled. Waiting for responses...');
    return;
  }
  
  console.log(`\n📋 ${tests[testStep]}`);
  
  switch (testStep) {
    case 0:
      console.log('📤 Sending: {"action": "ping"}');
      ws.send(JSON.stringify({
        action: 'ping',
        timestamp: new Date().toISOString()
      }));
      break;
      
    case 1:
      console.log('📤 Sending: subscribe_pattern live_count');
      ws.send(JSON.stringify({
        action: 'subscribe_pattern',
        pattern: 'live_count',
        locationId: 'women_region',
        interval: 3,
        timeframe: 'HOURLY'
      }));
      break;
      
    case 2:
      console.log('📤 Sending: subscribe_pattern chart_data');
      ws.send(JSON.stringify({
        action: 'subscribe_pattern',
        pattern: 'chart_data',
        locationId: 'women_region',
        interval: 10,
        timeframe: 'HOURLY',
        limit: 15
      }));
      break;
      
    case 3:
      console.log('📤 Sending: subscribe_pattern ping_pong');
      ws.send(JSON.stringify({
        action: 'subscribe_pattern',
        pattern: 'ping_pong',
        interval: 30
      }));
      break;
      
    case 4:
      console.log('⏰ Waiting for auto-updates for 20 seconds...');
      setTimeout(() => {
        console.log('\n🏁 Test completed. Disconnecting...');
        ws.close();
      }, 20000);
      break;
  }
  
  testStep++;
  
  if (testStep < 4) {
    setTimeout(runNextTest, 1000); // Wait 1 second between tests
  } else {
    runNextTest(); // Start waiting phase immediately
  }
}

ws.on('open', () => {
  console.log('🔗 Connected to WebSocket server');
  console.log('🎯 Starting pattern-based tests...\n');
  runNextTest();
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log(`📨 Received [${message.type}]:`, message);
  } catch (error) {
    console.log('📨 Received (raw):', data.toString());
  }
});

ws.on('close', () => {
  console.log('\n🔌 WebSocket connection closed');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
  process.exit(1);
});

// Timeout fallback
setTimeout(() => {
  console.log('\n⏰ Test timeout reached. Closing connection...');
  ws.close();
}, 30000);