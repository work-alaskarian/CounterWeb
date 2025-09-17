/**
 * WebSocket Test Script
 * Sends test messages to verify WebSocket functionality
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080/ws/analytics';

console.log('🧪 Starting WebSocket Test');
console.log('📡 Connecting to:', WS_URL);

const ws = new WebSocket(WS_URL);

ws.on('open', function() {
    console.log('✅ WebSocket Test Connection Established');
    
    // Send test messages every 3 seconds
    let counter = 1;
    
    const sendTestMessage = () => {
        const testMessages = [
            {
                type: 'live_count_update',
                location_id: 'main-entrance',
                live_count: Math.floor(Math.random() * 100) + 10,
                timestamp: new Date().toISOString(),
                test_message_id: counter
            },
            {
                event: 'liveUpdate',
                locationId: 'north-gate',
                liveCount: Math.floor(Math.random() * 50) + 5,
                timestamp: new Date().toISOString(),
                test_message_id: counter
            },
            {
                type: 'analytics_update',
                data: {
                    totalVisitors: Math.floor(Math.random() * 10000) + 100000,
                    newVisitors: Math.floor(Math.random() * 1000) + 10000,
                    timestamp: new Date().toISOString()
                },
                test_message_id: counter
            },
            {
                event: 'pong',
                timestamp: new Date().toISOString(),
                test_message_id: counter
            }
        ];
        
        const message = testMessages[counter % testMessages.length];
        console.log(`📤 Sending test message #${counter}:`, message.type || message.event);
        
        ws.send(JSON.stringify(message));
        counter++;
        
        if (counter <= 20) {
            setTimeout(sendTestMessage, 3000);
        } else {
            console.log('🏁 Test completed - sent 20 messages');
            ws.close();
        }
    };
    
    // Start sending messages after 2 seconds
    setTimeout(sendTestMessage, 2000);
});

ws.on('message', function(data) {
    try {
        const message = JSON.parse(data);
        console.log('📨 Received from server:', message);
    } catch (e) {
        console.log('📨 Received raw data:', data.toString());
    }
});

ws.on('close', function() {
    console.log('🔌 WebSocket Test Connection Closed');
});

ws.on('error', function(error) {
    console.error('❌ WebSocket Test Error:', error);
});