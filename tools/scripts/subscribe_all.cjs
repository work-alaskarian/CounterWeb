#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔗 Connecting to WebSocket...');
const ws = new WebSocket('ws://localhost:8080/ws/analytics');

// All active locations from the logs
const activeLocations = ['camera-24', 'camera-25', 'camera-16', 'camera-26', 'main-entrance'];

ws.on('open', () => {
    console.log('✅ Connected to WebSocket!');
    
    // Subscribe to all active locations
    activeLocations.forEach(locationId => {
        const message = {
            action: 'subscribe',
            locationId: locationId
        };
        ws.send(JSON.stringify(message));
        console.log(`📡 Subscribed to: ${locationId}`);
    });
    
    console.log('🎧 Listening for updates from ALL locations...');
    console.log('Press Ctrl+C to exit');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        if (message.type === 'live_count_update') {
            console.log(`🔔 ${message.location_id}: ${message.live_count} people (${message.timestamp})`);
        } else {
            console.log(`📨 ${message.event || message.type}:`, message);
        }
    } catch (error) {
        console.log('📨 Raw message:', data.toString());
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
});

// Keep alive
process.on('SIGINT', () => {
    console.log('\n👋 Closing connection...');
    ws.close();
    process.exit(0);
});