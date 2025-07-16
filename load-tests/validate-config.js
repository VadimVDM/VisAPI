#!/usr/bin/env node

// Validation script for k6 load test configuration
// This validates the structure without running k6

console.log('🔍 Validating k6 load test configuration...');

const fs = require('fs');
const path = require('path');

// Check if required files exist
const requiredFiles = [
  'config.js',
  's4-qa-01-load-test.js',
  's4-qa-01-pdf-batch-test.js',
  'performance-suite.js',
  'utils/test-data-generator.js',
  'README.md',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
}

// Check if package.json has load test scripts
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};

  const requiredScripts = [
    'load:s4-qa-01',
    'load:s4-qa-01-pdf',
    'load:performance-suite',
  ];

  let allScriptsExist = true;
  for (const script of requiredScripts) {
    if (scripts[script]) {
      console.log(`✅ Script "${script}" configured`);
    } else {
      console.log(`❌ Script "${script}" missing`);
      allScriptsExist = false;
    }
  }

  if (allFilesExist && allScriptsExist) {
    console.log(
      '\n🎉 All load test files and scripts are properly configured!'
    );
    console.log('\nTo run the tests:');
    console.log('1. Install k6: brew install k6');
    console.log('2. Run smoke test: pnpm load:smoke');
    console.log('3. Run S4-QA-01 load test: pnpm load:s4-qa-01');
    console.log('4. Run PDF batch test: pnpm load:s4-qa-01-pdf');
    console.log('5. Run performance suite: pnpm load:performance-suite');
  } else {
    console.log(
      '\n❌ Some files or scripts are missing. Please check the configuration.'
    );
    process.exit(1);
  }
} else {
  console.log('❌ package.json not found');
  process.exit(1);
}
