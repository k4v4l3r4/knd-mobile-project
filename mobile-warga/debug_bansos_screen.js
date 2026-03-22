/**
 * DEBUGGING SCRIPT - BANSOS BLANK SCREEN INVESTIGATION
 * 
 * Cara Pakai:
 * 1. Jalankan aplikasi di HP dengan debug mode
 * 2. Buka menu Bansos
 * 3. Lihat console log di laptop/terminal
 * 4. Screenshot error yang muncul
 * 
 * Script ini akan melacak:
 * - Apakah API endpoint bisa diakses
 * - Apakah token terkirim dengan benar
 * - Apakah ada network error
 * - Apakah data response valid
 */

import api from './src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// 1. CHECK API CONFIGURATION
// ========================================
console.log('=== BANSOS DEBUG START ===');
console.log('Timestamp:', new Date().toISOString());

// Check base URL
const baseUrl = 'https://api.afnet.my.id/api';
console.log('Expected Base URL:', baseUrl);

// ========================================
// 2. CHECK TOKEN
// ========================================
const checkToken = async () => {
  try {
    const token = await AsyncStorage.getItem('user_token');
    console.log('🔍 TOKEN CHECK:');
    console.log('  - Token exists:', !!token);
    console.log('  - Token length:', token ? token.length : 0);
    console.log('  - Token preview:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    
    if (!token) {
      console.error('❌ ERROR: No token found! User might not be logged in.');
    }
    
    return token;
  } catch (error) {
    console.error('❌ ERROR reading token:', error);
    return null;
  }
};

// ========================================
// 3. CHECK USER ROLE
// ========================================
const checkUserRole = async () => {
  try {
    console.log('\n📋 CHECKING USER ROLE...');
    const response = await api.get('/me');
    console.log('✅ /me endpoint response:', {
      success: response.data?.success,
      userId: response.data?.data?.id,
      userName: response.data?.data?.name,
      userRole: response.data?.data?.role,
      hasRole: !!response.data?.data?.role
    });
    return response.data?.data;
  } catch (error) {
    console.error('❌ ERROR checking role:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        fullUrl: `${error.config?.baseURL}${error.config?.url}`
      }
    });
    return null;
  }
};

// ========================================
// 4. TEST BANSOS API ENDPOINTS
// ========================================
const testBansosEndpoints = async () => {
  try {
    console.log('\n📊 TESTING BANSOS ENDPOINTS...');
    
    // Test 1: Bansos Recipients
    console.log('\n--- Testing /bansos-recipients ---');
    const recipientsResponse = await api.get('/bansos-recipients');
    console.log('✅ Recipients Response:', {
      status: recipientsResponse.status,
      hasData: !!recipientsResponse.data,
      hasSuccess: !!recipientsResponse.data?.success,
      dataLength: Array.isArray(recipientsResponse.data?.data) 
        ? recipientsResponse.data.data.length 
        : 'NOT AN ARRAY',
      firstItem: recipientsResponse.data?.data?.[0] 
        ? { 
            id: recipientsResponse.data.data[0].id,
            user_id: recipientsResponse.data.data[0].user_id,
            status: recipientsResponse.data.data[0].status
          } 
        : 'NO DATA'
    });
    
    // Test 2: Bansos Histories
    console.log('\n--- Testing /bansos-histories ---');
    const historiesResponse = await api.get('/bansos-histories');
    console.log('✅ Histories Response:', {
      status: historiesResponse.status,
      hasData: !!historiesResponse.data,
      hasSuccess: !!historiesResponse.data?.success,
      dataLength: Array.isArray(historiesResponse.data?.data) 
        ? historiesResponse.data.data.length 
        : 'NOT AN ARRAY',
      firstItem: historiesResponse.data?.data?.[0] 
        ? { 
            id: historiesResponse.data.data[0].id,
            program_name: historiesResponse.data.data[0].program_name,
            amount: historiesResponse.data.data[0].amount
          } 
        : 'NO DATA'
    });
    
    return {
      recipients: recipientsResponse.data,
      histories: historiesResponse.data
    };
  } catch (error) {
    console.error('❌ ERROR testing bansos endpoints:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        fullUrl: `${error.config?.baseURL}${error.config?.url}`,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    return null;
  }
};

// ========================================
// 5. SIMULATE BANOS SCREEN LOAD
// ========================================
const simulateBansosLoad = async () => {
  console.log('\n🎬 SIMULATING BANSOS SCREEN LOAD...\n');
  
  // Step 1: Check token
  const token = await checkToken();
  if (!token) {
    console.error('❌ ABORT: No token. User must login first.');
    return;
  }
  
  // Step 2: Check role
  const user = await checkUserRole();
  if (!user) {
    console.error('❌ ABORT: Could not determine user role.');
    return;
  }
  
  // Step 3: Test endpoints
  const result = await testBansosEndpoints();
  if (!result) {
    console.error('❌ ABORT: Failed to fetch bansos data.');
    return;
  }
  
  // Step 4: Summary
  console.log('\n✅ BANSOS DEBUG COMPLETE');
  console.log('Summary:');
  console.log('  - User:', user.name, `(${user.role})`);
  console.log('  - Recipients count:', Array.isArray(result.recipients?.data?.data) ? result.recipients.data.data.length : 0);
  console.log('  - Histories count:', Array.isArray(result.histories?.data?.data) ? result.histories.data.data.length : 0);
  console.log('\n=== BANSOS DEBUG END ===\n');
};

// ========================================
// RUN DEBUGGING
// ========================================
simulateBansosLoad().catch(error => {
  console.error('\n💥 UNHANDLED ERROR IN DEBUG SCRIPT:', error);
});

// ========================================
// ADDITIONAL MANUAL CHECKS
// ========================================
console.log('\n📝 MANUAL CHECKLIST:');
console.log('1. Is the app running on real device or emulator?');
console.log('2. Can you access https://api.afnet.my.id from the device browser?');
console.log('3. Is the device connected to internet?');
console.log('4. Try pinging the API: fetch("https://api.afnet.my.id/api").then(r => console.log("PING:", r.status))');
console.log('\nRun this in console: fetch("https://api.afnet.my.id/api").then(r => console.log("API Status:", r.status)).catch(e => console.error("Ping failed:", e))');
