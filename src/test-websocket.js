/**
 * Test WebSocket connection and send sample messages
 */

const WEBSOCKET_URL = 'ws://10.10.1.234:8080/ws/analytics';

function testWebSocketConnection() {
    console.log('🧪 Testing WebSocket connection...');

    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
        console.log('✅ WebSocket connected successfully!');

        // Send ping message
        setTimeout(() => {
            const pingMessage = { action: 'ping' };
            ws.send(JSON.stringify(pingMessage));
            console.log('📤 Sent ping:', pingMessage);
        }, 1000);

        // Send subscription message
        setTimeout(() => {
            const subscribeMessage = {
                action: 'subscribe',
                locationId: 'womens-section',
                timeframe: 'HOURLY'
            };
            ws.send(JSON.stringify(subscribeMessage));
            console.log('📤 Sent subscription:', subscribeMessage);
        }, 2000);

        // Send test live_count_update message
        setTimeout(() => {
            const testMessage = {
                type: 'live_count_update',
                location_id: 'womens-section',
                live_count: Math.floor(Math.random() * 100) + 1,
                timestamp: new Date().toISOString(),
                message: 'Test message from frontend'
            };
            ws.send(JSON.stringify(testMessage));
            console.log('📤 Sent test message:', testMessage);
        }, 3000);

        // Close connection after 10 seconds
        setTimeout(() => {
            ws.close();
        }, 10000);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Received message:', data);
        } catch (error) {
            console.error('❌ Failed to parse message:', error);
            console.log('Raw message:', event.data);
        }
    };

    ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
    };

    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };
}

// Test with curl command simulation
function sendCurlTest() {
    console.log('🧪 Testing with curl-like HTTP request...');

    // Test the analytics API endpoint
    fetch('http://10.10.1.205:8080/health')
        .then(response => response.json())
        .then(data => {
            console.log('✅ HTTP Health check:', data);
        })
        .catch(error => {
            console.error('❌ HTTP Health check failed:', error);
        });

    // Test GraphQL endpoint
    const graphqlQuery = {
        query: `
            query GetAllLocations {
                allLocations {
                    id
                    name
                    liveCount
                }
            }
        `
    };

    fetch('http://10.10.1.205:8080/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphqlQuery)
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ GraphQL query result:', data);
    })
    .catch(error => {
        console.error('❌ GraphQL query failed:', error);
    });
}

// Run tests
if (typeof window !== 'undefined') {
    // Browser environment
    window.testWebSocketConnection = testWebSocketConnection;
    window.sendCurlTest = sendCurlTest;

    console.log('🧪 WebSocket test functions available:');
    console.log('   - window.testWebSocketConnection()');
    console.log('   - window.sendCurlTest()');
} else {
    // Node.js environment
    testWebSocketConnection();
    sendCurlTest();
}