#!/usr/bin/env node
/**
 * Proxy Connection Diagnostic Script
 * Tests proxy connectivity to various sites including ESTA
 */

import { chromium } from 'playwright';

const PROXY_CONFIG = {
  server: 'http://brd.superproxy.io:33335',
  username: 'brd-customer-hl_17959a9a-zone-residential_proxy1_usa',
  password: 'l3mn15k0y57t',
};

const TEST_SITES = [
  { name: 'BrightData Test', url: 'https://geo.brdtest.com/welcome.txt?product=resi&method=native' },
  { name: 'IPify (Simple HTTP)', url: 'https://api.ipify.org?format=json' },
  { name: 'HTTPBin (Headers)', url: 'https://httpbin.org/headers' },
  { name: 'Google', url: 'https://www.google.com' },
  { name: 'ESTA Homepage', url: 'https://esta.cbp.dhs.gov/esta' },
  { name: 'ESTA Check Status', url: 'https://esta.cbp.dhs.gov/esta/application?execution=e1s1' },
];

async function testConnection(
  useName: string,
  url: string,
  useProxy: boolean,
): Promise<{ success: boolean; ip?: string; error?: string; duration: number }> {
  const start = Date.now();
  let browser;
  let context;
  let page;

  try {
    console.log(`\n🔍 Testing ${useName}: ${url}`);
    console.log(`   ${useProxy ? '🌐 Using proxy' : '🔗 Direct connection'}`);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const contextOptions: any = {
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    };

    if (useProxy) {
      contextOptions.proxy = PROXY_CONFIG;
    }

    context = await browser.newContext(contextOptions);
    page = await context.newPage();

    // Enable verbose logging
    page.on('console', (msg) => console.log(`   📄 Console: ${msg.text()}`));
    page.on('requestfailed', (req) => {
      console.log(`   ❌ Request failed: ${req.url()} - ${req.failure()?.errorText}`);
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const content = await page.content();
    const title = await page.title();
    const duration = Date.now() - start;

    console.log(`   ✅ Success! Title: "${title}"`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    // Try to extract IP if it's an IP checker site
    let ip: string | undefined;
    if (url.includes('ipify') || url.includes('httpbin')) {
      const bodyText = await page.textContent('body');
      const ipMatch = bodyText?.match(/\d+\.\d+\.\d+\.\d+/);
      if (ipMatch) {
        ip = ipMatch[0];
        console.log(`   🌍 Detected IP: ${ip}`);
      }
    }

    await page.close();
    await context.close();
    await browser.close();

    return { success: true, ip, duration };
  } catch (error: any) {
    const duration = Date.now() - start;
    console.log(`   ❌ Failed: ${error.message}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    return { success: false, error: error.message, duration };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 PROXY CONNECTION DIAGNOSTIC TEST');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📡 Proxy Server: ${PROXY_CONFIG.server}`);
  console.log(`👤 Username: ${PROXY_CONFIG.username}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: any[] = [];

  // Test each site with and without proxy
  for (const site of TEST_SITES) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Testing: ${site.name}`);
    console.log('═'.repeat(60));

    // Direct connection test
    const directResult = await testConnection(site.name, site.url, false);
    results.push({ site: site.name, proxy: false, ...directResult });

    // Wait a bit between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Proxy connection test
    const proxyResult = await testConnection(site.name, site.url, true);
    results.push({ site: site.name, proxy: true, ...proxyResult });

    // Wait between different sites
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Site                          | Type   | Status | Duration | IP/Error');
  console.log('-'.repeat(100));

  for (const result of results) {
    const siteName = result.site.padEnd(30);
    const type = (result.proxy ? 'Proxy' : 'Direct').padEnd(6);
    const status = (result.success ? '✅' : '❌').padEnd(6);
    const duration = `${result.duration}ms`.padEnd(8);
    const extra = result.ip || result.error?.substring(0, 40) || '';

    console.log(`${siteName} | ${type} | ${status} | ${duration} | ${extra}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Analysis
  const directSuccess = results.filter((r) => !r.proxy && r.success).length;
  const proxySuccess = results.filter((r) => r.proxy && r.success).length;
  const totalTests = TEST_SITES.length;

  console.log('🔍 ANALYSIS:');
  console.log(`   Direct connections: ${directSuccess}/${totalTests} successful`);
  console.log(`   Proxy connections:  ${proxySuccess}/${totalTests} successful`);

  const estaDirectResult = results.find((r) => r.site.includes('ESTA') && !r.proxy);
  const estaProxyResult = results.find((r) => r.site.includes('ESTA') && r.proxy);

  if (estaDirectResult?.success && !estaProxyResult?.success) {
    console.log('\n⚠️  ESTA site works directly but FAILS through proxy');
    console.log('   This indicates the ESTA site is blocking the proxy IP or detecting the proxy.');
    console.log('   Possible solutions:');
    console.log('   1. Use a residential proxy instead of datacenter proxy');
    console.log('   2. Use a proxy rotation service');
    console.log('   3. Implement additional anti-detection measures');
    console.log('   4. Try a different proxy provider');
  }

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
