#!/usr/bin/env node

/**
 * CounterWeb Integration Test Script
 * Tests the CounterWeb Svelte application with the real analytics backend
 */

const API_URL = 'http://localhost:8080';
const GRAPHQL_ENDPOINT = `${API_URL}/graphql`;

async function testGraphQLQuery(query, variables = {}) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', result.errors);
      return { success: false, errors: result.errors };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting CounterWeb Integration Tests...');
  console.log('=' * 60);

  // Test 1: Health Check
  console.log('\n📋 Test 1: Health Check');
  try {
    const response = await fetch(`${API_URL}/health`);
    const healthData = await response.json();
    if (healthData.status === 'healthy') {
      console.log('✅ API is healthy');
    } else {
      console.log('❌ API health check failed:', healthData);
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: All Locations Query
  console.log('\n📋 Test 2: All Locations Query');
  const locationsResult = await testGraphQLQuery(`
    query GetAllLocations {
      allLocations {
        id
        name
        liveCount
      }
    }
  `);

  if (locationsResult.success) {
    const locations = locationsResult.data.allLocations || [];
    console.log(`✅ Found ${locations.length} locations`);
    if (locations.length > 0) {
      console.log('📍 Sample locations:');
      locations.slice(0, 3).forEach(loc => {
        console.log(`   - ${loc.name}: ${loc.liveCount} live count`);
      });
    }
  } else {
    console.log('❌ Locations query failed');
  }

  // Test 3: Analytics Summary
  console.log('\n📋 Test 3: Analytics Summary');
  const summaryResult = await testGraphQLQuery(`
    query GetAnalyticsSummary {
      analyticsSummary(timeframe: DAILY) {
        totalVisitors
        newVisitors
        avgVisitDurationHours
        peakVisitorsToday
      }
    }
  `);

  if (summaryResult.success) {
    const summary = summaryResult.data.analyticsSummary;
    console.log('✅ Analytics summary loaded:');
    console.log(`   - Total Visitors: ${summary.totalVisitors}`);
    console.log(`   - New Visitors: ${summary.newVisitors}`);
    console.log(`   - Peak Today: ${summary.peakVisitorsToday}`);
  } else {
    console.log('❌ Analytics summary query failed');
  }

  // Test 4: Visitor Trends Chart
  console.log('\n📋 Test 4: Visitor Trends Chart');
  const trendsResult = await testGraphQLQuery(`
    query GetVisitorTrends {
      analyticsChart(chartType: "visitors_over_time", timeframe: DAILY) {
        labels
        datasets {
          label
          data
        }
      }
    }
  `);

  if (trendsResult.success) {
    const chart = trendsResult.data.analyticsChart;
    if (chart && chart.labels) {
      console.log(`✅ Chart data loaded with ${chart.labels.length} data points`);
      console.log(`   - Labels: ${chart.labels.slice(0, 3).join(', ')}...`);
      console.log(`   - Datasets: ${chart.datasets?.length || 0}`);
    } else {
      console.log('⚠️ Chart data structure unexpected');
    }
  } else {
    console.log('❌ Visitor trends chart query failed');
  }

  // Test 5: All Cameras
  console.log('\n📋 Test 5: All Cameras Query');
  const camerasResult = await testGraphQLQuery(`
    query GetAllCameras {
      allCameras {
        id
        cameraId
        cameraName
        status
        currentLocationId
      }
    }
  `);

  if (camerasResult.success) {
    const cameras = camerasResult.data.allCameras || [];
    console.log(`✅ Found ${cameras.length} cameras`);
    if (cameras.length > 0) {
      console.log('📹 Sample cameras:');
      cameras.slice(0, 3).forEach(cam => {
        console.log(`   - ${cam.cameraName || cam.cameraId}: ${cam.status}`);
      });
    }
  } else {
    console.log('❌ Cameras query failed');
  }

  // Test 6: Realtime Count
  console.log('\n📋 Test 6: Realtime Count Query');
  const realtimeResult = await testGraphQLQuery(`
    query GetRealtimeCount {
      realtimeCount
    }
  `);

  if (realtimeResult.success) {
    try {
      const realtimeData = JSON.parse(realtimeResult.data.realtimeCount);
      console.log('✅ Realtime count data loaded:');
      console.log(`   - Total locations: ${realtimeData.total_locations || 0}`);
      console.log(`   - Locations data: ${realtimeData.locations?.length || 0} entries`);
    } catch (error) {
      console.log('⚠️ Realtime count data parse error:', error.message);
    }
  } else {
    console.log('❌ Realtime count query failed');
  }

  console.log('\n' + '=' * 60);
  console.log('🎯 CounterWeb Integration Test Summary:');
  console.log('✅ If you see mostly green checkmarks above, CounterWeb should work!');
  console.log('⚠️ Any red X marks indicate issues that need to be resolved');
  console.log('\n🌐 To test the CounterWeb frontend:');
  console.log('1. Make sure the analytics backend is running (port 8080)');
  console.log('2. Start CounterWeb development server');
  console.log('3. Open browser console to see detailed API logs with emoji prefixes');
  console.log('4. Check that data loads in all components');
  console.log('\n🚀 Ready to test CounterWeb with real backend data!');
}

// Run tests
runIntegrationTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});