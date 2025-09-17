#!/bin/bash

echo "🔗 Automated WebSocket Test"
echo "=========================="

# Test 1: Connection Test
echo "📡 Test 1: Connection Test"
echo "Connecting to ws://localhost:8080/ws/analytics..."
timeout 5s npx wscat -c ws://localhost:8080/ws/analytics -x '{"action":"ping"}' -w 2
if [ $? -eq 0 ]; then
    echo "✅ Connection successful"
else
    echo "❌ Connection failed"
fi

echo ""

# Test 2: Subscribe Test
echo "📡 Test 2: Subscription Test"
echo "Subscribing to main-entrance updates..."
timeout 8s npx wscat -c ws://localhost:8080/ws/analytics \
    -x '{"action":"subscribe","locationId":"main-entrance"}' \
    -w 5
    
echo ""

# Test 3: Full Real-time Test
echo "📡 Test 3: Real-time Update Test"
echo "This test will:"
echo "1. Connect to WebSocket"
echo "2. Subscribe to updates"
echo "3. Trigger a count update via GraphQL"
echo "4. Listen for the WebSocket notification"

echo ""
echo "Starting full test..."

# Run the existing Node.js test script
if [ -f "test_websocket.cjs" ]; then
    echo "📱 Running comprehensive Node.js test..."
    timeout 15s node test_websocket.cjs
else
    echo "❌ test_websocket.cjs not found"
fi