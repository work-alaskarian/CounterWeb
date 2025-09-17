#!/bin/bash

echo "🔗 Testing WebSocket connection with wscat..."
echo "================================================"
echo "WebSocket URL: ws://localhost:8080/ws/analytics"
echo ""
echo "📝 Commands to try after connecting:"
echo "1. Subscribe to main entrance:"
echo '   {"action": "subscribe", "locationId": "main-entrance"}'
echo ""
echo "2. Send ping:"
echo '   {"action": "ping"}'
echo ""
echo "3. Exit with Ctrl+C"
echo ""
echo "Starting wscat connection..."

npx wscat -c ws://localhost:8080/ws/analytics