#!/bin/bash

echo "🚀 Testing CounterWeb Integration with Analytics System"
echo "======================================================"

# Check if analytics server is running
echo "🔍 Checking Analytics Server..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Analytics server is running at http://localhost:8000"
    
    # Test GraphQL endpoint
    echo "🔍 Testing GraphQL endpoint..."
    GRAPHQL_RESPONSE=$(curl -s -X POST http://localhost:8000/graphql \
        -H "Content-Type: application/json" \
        -d '{"query":"query { allLocations { id name liveCount } }"}')
    
    if echo "$GRAPHQL_RESPONSE" | grep -q "allLocations"; then
        echo "✅ GraphQL endpoint is working"
        echo "📊 Found locations in response:"
        echo "$GRAPHQL_RESPONSE" | jq '.data.allLocations[] | "\(.name): \(.liveCount)"' 2>/dev/null || echo "   (JSON parsing failed, but data exists)"
    else
        echo "❌ GraphQL endpoint returned unexpected response:"
        echo "$GRAPHQL_RESPONSE"
    fi
    
    # Test WebSocket endpoint (brief test)
    echo "🔍 Testing WebSocket endpoint..."
    if command -v wscat > /dev/null 2>&1; then
        echo "✅ WebSocket test tool (wscat) is available"
        echo "🔗 WebSocket should be available at ws://localhost:8000/ws/analytics"
    else
        echo "⚠️ wscat not found, but WebSocket endpoint should be available at ws://localhost:8000/ws/analytics"
    fi
    
    echo ""
    echo "🌐 Starting CounterWeb Development Server..."
    echo "📝 Instructions:"
    echo "   1. The web app will start on http://localhost:5000"
    echo "   2. Navigate to 'اختبار النظام الجديد' section to test new features"
    echo "   3. Check browser console for connection status"
    echo "   4. Use the test controls to simulate activities"
    echo ""
    echo "🔧 Development Mode Features:"
    echo "   ✓ Real-time WebSocket connection"
    echo "   ✓ GraphQL API integration"
    echo "   ✓ Activity simulation"
    echo "   ✓ Camera management"
    echo "   ✓ Location filtering"
    echo ""
    
    # Start the web server
    npm run dev
    
else
    echo "❌ Analytics server is not running!"
    echo "💡 Please start the analytics server first:"
    echo "   cd ../Analytics"
    echo "   python3 main.py"
    echo ""
    echo "Then run this script again."
    exit 1
fi