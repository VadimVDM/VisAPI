#!/usr/bin/env node

/**
 * Test CBB flows and alternative WhatsApp sending methods
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const CBB_API_URL = process.env.CBB_API_URL || 'https://api.chatgptbuilder.io/api';
const CBB_API_KEY = process.env.CBB_API_KEY;
const CONTACT_ID = '972507758758';

if (!CBB_API_KEY) {
  console.error('❌ Error: CBB_API_KEY not found');
  process.exit(1);
}

const api = axios.create({
  baseURL: CBB_API_URL,
  headers: {
    'X-ACCESS-TOKEN': CBB_API_KEY,
    'Content-Type': 'application/json'
  }
});

// 1. Get available flows
async function getFlows() {
  console.log('\n📋 Fetching available flows...');
  try {
    const response = await api.get('/flows');
    const flows = response.data;
    
    if (flows && flows.length > 0) {
      console.log(`✅ Found ${flows.length} flows:`);
      flows.forEach(flow => {
        console.log(`  - Flow ${flow.id}: ${flow.name || 'Unnamed'}`);
        if (flow.description) console.log(`    Description: ${flow.description}`);
        if (flow.trigger_type) console.log(`    Trigger: ${flow.trigger_type}`);
      });
      return flows;
    } else {
      console.log('⚠️  No flows found');
      return [];
    }
  } catch (error) {
    console.error('❌ Failed to get flows:', error.response?.data || error.message);
    return [];
  }
}

// 2. Send message via flow
async function sendViaFlow(flowId) {
  console.log(`\n📤 Sending flow ${flowId} to contact ${CONTACT_ID}...`);
  try {
    const response = await api.post(`/contacts/${CONTACT_ID}/send_flow/${flowId}`);
    console.log('✅ Flow sent successfully!');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send flow:', error.response?.data || error.message);
    return false;
  }
}

// 3. Try WhatsApp template message format
async function sendWhatsAppTemplate() {
  console.log('\n📱 Trying WhatsApp template format...');
  
  const payload = {
    messages: [
      {
        messaging_product: "WhatsApp",
        recipient_type: "individual",
        to: null,
        type: "template",
        template: {
          name: "hello_world", // Common default template
          language: {
            code: "en_US"
          }
        }
      }
    ]
  };

  try {
    const response = await api.post(`/contacts/${CONTACT_ID}/send_content`, payload);
    console.log('✅ Template sent successfully!');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Template failed:', error.response?.data || error.message);
    return false;
  }
}

// 4. Try sending as simple text (different format)
async function sendSimpleText() {
  console.log('\n💬 Trying simple text format...');
  
  const payload = {
    messages: [
      {
        message: {
          text: "Test message from VisAPI system. Time: " + new Date().toISOString()
        }
      }
    ]
  };

  try {
    const response = await api.post(`/contacts/${CONTACT_ID}/send_content`, payload);
    console.log('✅ Simple text sent!');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Simple text failed:', error.response?.data || error.message);
    return false;
  }
}

// 5. Check contact's WhatsApp status
async function checkContactWhatsApp() {
  console.log('\n🔍 Checking contact WhatsApp status...');
  try {
    const response = await api.get(`/contacts/${CONTACT_ID}`);
    const contact = response.data;
    
    console.log('Contact details:');
    console.log('  Phone:', contact.phone || 'Not set');
    console.log('  Name:', contact.first_name || 'Not set');
    console.log('  Has WhatsApp:', contact.has_whatsapp !== false ? 'Yes' : 'No');
    console.log('  Channel 5 (WhatsApp):', contact.channel_5 ? 'Active' : 'Inactive');
    
    // Check custom fields
    if (contact.custom_fields) {
      console.log('  Custom fields:', Object.keys(contact.custom_fields).length);
    }
    
    return contact;
  } catch (error) {
    console.error('❌ Failed to check contact:', error.response?.data || error.message);
    return null;
  }
}

// 6. Try sending via channel 5 directly
async function sendViaChannel5() {
  console.log('\n📡 Trying to send via channel 5 (WhatsApp) directly...');
  
  const payload = {
    text: "Test from VisAPI - " + new Date().toLocaleString('he-IL'),
    channel: 5  // WhatsApp channel
  };

  try {
    const response = await api.post(`/contacts/${CONTACT_ID}/send_text`, payload);
    console.log('✅ Sent via channel 5!');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Channel 5 failed:', error.response?.data || error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('====================================');
  console.log('CBB WhatsApp Troubleshooting');
  console.log('====================================');
  console.log('API:', CBB_API_URL);
  console.log('Contact:', CONTACT_ID);
  console.log('====================================');

  // 1. Check contact
  const contact = await checkContactWhatsApp();
  
  // 2. Get flows
  const flows = await getFlows();
  
  // 3. Try sending via flow if available
  if (flows.length > 0) {
    // Try the first flow
    await sendViaFlow(flows[0].id);
  }
  
  // 4. Try different message formats
  console.log('\n🧪 Testing different message formats...');
  
  const results = {
    simpleText: await sendSimpleText(),
    whatsappTemplate: await sendWhatsAppTemplate(),
    channel5: await sendViaChannel5()
  };
  
  // Summary
  console.log('\n====================================');
  console.log('Test Results:');
  console.log('====================================');
  console.log('Simple Text:', results.simpleText ? '✅ Success' : '❌ Failed');
  console.log('WhatsApp Template:', results.whatsappTemplate ? '✅ Success' : '❌ Failed');
  console.log('Channel 5 Direct:', results.channel5 ? '✅ Success' : '❌ Failed');
  
  if (Object.values(results).some(r => r)) {
    console.log('\n✅ At least one method worked!');
    console.log('Check WhatsApp on', CONTACT_ID);
  } else {
    console.log('\n❌ All methods failed.');
    console.log('\nPossible issues:');
    console.log('1. WhatsApp channel not configured in CBB');
    console.log('2. Contact doesn\'t have WhatsApp');
    console.log('3. Need to use pre-approved message templates');
    console.log('4. Contact needs to initiate conversation first (24-hour window)');
  }
}

main().catch(console.error);