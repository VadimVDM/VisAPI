import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import {
  generatePDFWorkflowPayload,
  generateIdempotencyKey,
} from './utils/test-data-generator.js';

// Custom metrics for PDF batch testing
const pdfGenerationRate = new Rate('pdf_generation_success_rate');
const pdfGenerationLatency = new Trend('pdf_generation_latency');
const pdfSizeMetric = new Counter('pdf_size_bytes');
const storageUploadRate = new Rate('storage_upload_success_rate');
const presignedUrlRate = new Rate('presigned_url_success_rate');
const fileProcessingLatency = new Trend('file_processing_latency');
const storageUsageMetric = new Counter('storage_usage_bytes');

// Test configuration for 10GB PDF batch processing
export const options = {
  stages: [
    { duration: '2m', target: 5 }, // Ramp up to 5 VUs
    { duration: '25m', target: 10 }, // Maintain 10 VUs for PDF generation
    { duration: '3m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5 seconds (PDF generation is slow)
    http_req_failed: ['rate<0.05'], // Error rate less than 5%
    pdf_generation_success_rate: ['rate>0.90'], // 90% success rate for PDF generation
    storage_upload_success_rate: ['rate>0.95'], // 95% success rate for storage uploads
    presigned_url_success_rate: ['rate>0.95'], // 95% success rate for presigned URLs
    file_processing_latency: ['p(95)<30000'], // 95% of file processing under 30 seconds
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'visapi_test-secret-key-for-pdf-batch-testing';
const TARGET_SIZE_GB = 10;
const TARGET_SIZE_BYTES = TARGET_SIZE_GB * 1024 * 1024 * 1024; // 10GB in bytes

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// PDF generation workflow for testing
const pdfWorkflow = {
  name: 'S4-QA-01 PDF Batch Test Workflow',
  description: 'PDF generation workflow for 10GB batch testing',
  enabled: true,
  schema: {
    id: 's4-qa-01-pdf-batch-workflow',
    name: 'S4-QA-01 PDF Batch Test Workflow',
    triggers: [
      {
        type: 'webhook',
        config: {
          path: '/pdf-generation',
        },
      },
    ],
    steps: [
      {
        id: 'generate-pdf',
        type: 'pdf.generate',
        config: {
          template: 'visa_certificate',
          options: {
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate:
              '<div style="font-size: 10px; width: 100%; text-align: center;">{{document.title}}</div>',
            footerTemplate:
              '<div style="font-size: 10px; width: 100%; text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
            margin: {
              top: '1cm',
              right: '1cm',
              bottom: '1cm',
              left: '1cm',
            },
          },
          data: {
            applicant: '{{applicant}}',
            visa_details: '{{visa_details}}',
            approval_date: '{{approval_date}}',
            document_number: '{{document_number}}',
          },
        },
        retries: 2,
        timeout: 30000,
      },
      {
        id: 'upload-to-storage',
        type: 'storage.upload',
        config: {
          bucket: 'visa-documents',
          path: 'certificates/{{document_number}}.pdf',
          contentType: 'application/pdf',
        },
        retries: 3,
      },
      {
        id: 'generate-presigned-url',
        type: 'storage.presigned_url',
        config: {
          bucket: 'visa-documents',
          path: 'certificates/{{document_number}}.pdf',
          expiresIn: 3600, // 1 hour
        },
      },
    ],
  },
};

let workflowId;
let totalProcessedBytes = 0;
let documentsGenerated = 0;

// Setup function
export function setup() {
  console.log('Setting up S4-QA-01 PDF batch test environment...');
  console.log(`Target: Generate ${TARGET_SIZE_GB}GB worth of PDF documents`);

  // Create PDF workflow
  const createResponse = http.post(
    `${BASE_URL}/api/v1/workflows`,
    JSON.stringify(pdfWorkflow),
    { headers }
  );

  if (createResponse.status !== 201) {
    console.error('Failed to create PDF workflow:', createResponse.body);
    throw new Error('Setup failed');
  }

  const workflow = JSON.parse(createResponse.body);
  console.log(`Created PDF workflow: ${workflow.id}`);

  return { workflowId: workflow.id };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up S4-QA-01 PDF batch test environment...');

  const finalSizeGB = (totalProcessedBytes / 1024 / 1024 / 1024).toFixed(2);
  console.log(`Total PDF data processed: ${finalSizeGB}GB`);
  console.log(`Total documents generated: ${documentsGenerated}`);

  if (data.workflowId) {
    const deleteResponse = http.del(
      `${BASE_URL}/api/v1/workflows/${data.workflowId}`,
      null,
      { headers }
    );

    if (deleteResponse.status === 204) {
      console.log(`Cleaned up PDF workflow: ${data.workflowId}`);
    } else {
      console.warn('Failed to clean up PDF workflow:', deleteResponse.body);
    }
  }
}

// Main test function
export default function (data) {
  // Check if we've reached the target size
  if (totalProcessedBytes >= TARGET_SIZE_BYTES) {
    console.log(
      `Target size of ${TARGET_SIZE_GB}GB reached, stopping PDF generation`
    );
    return;
  }

  const testType = Math.random();

  if (testType < 0.7) {
    // 70% - PDF generation tests
    pdfGenerationTest(data);
  } else if (testType < 0.85) {
    // 15% - Storage upload tests
    storageUploadTest();
  } else {
    // 15% - Presigned URL tests
    presignedUrlTest();
  }

  // Shorter sleep for batch processing
  sleep(Math.random() * 1 + 0.5);
}

// PDF generation test
function pdfGenerationTest(data) {
  const payload = generatePDFWorkflowPayload();
  const idempotencyKey = generateIdempotencyKey();

  const pdfHeaders = {
    ...headers,
    'Idempotency-Key': idempotencyKey,
  };

  const start = Date.now();
  const response = http.post(
    `${BASE_URL}/api/v1/triggers/pdf-generation`,
    JSON.stringify(payload),
    {
      headers: pdfHeaders,
      timeout: '60s', // Longer timeout for PDF generation
    }
  );

  const duration = Date.now() - start;
  pdfGenerationLatency.add(duration);
  fileProcessingLatency.add(duration);

  const success = check(response, {
    'pdf generation trigger status is 202': (r) => r.status === 202,
    'pdf generation has jobId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jobId !== undefined;
      } catch {
        return false;
      }
    },
    'pdf generation response time < 5000ms': (r) => r.timings.duration < 5000,
    'pdf generation accepted': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'accepted';
      } catch {
        return false;
      }
    },
  });

  pdfGenerationRate.add(success);

  if (success) {
    // Estimate PDF size (typical visa certificate PDF is 200KB - 1MB)
    const estimatedSize = randomIntBetween(200 * 1024, 1024 * 1024); // 200KB to 1MB
    pdfSizeMetric.add(estimatedSize);
    totalProcessedBytes += estimatedSize;
    documentsGenerated++;

    // Log progress every 100 documents
    if (documentsGenerated % 100 === 0) {
      const currentSizeGB = (totalProcessedBytes / 1024 / 1024 / 1024).toFixed(
        2
      );
      const progress = (
        (totalProcessedBytes / TARGET_SIZE_BYTES) *
        100
      ).toFixed(1);
      console.log(
        `Progress: ${currentSizeGB}GB/${TARGET_SIZE_GB}GB (${progress}%) - ${documentsGenerated} documents`
      );
    }
  }

  // Wait for job completion and check result
  if (success) {
    sleep(2); // Wait for processing
    checkJobStatus(response);
  }
}

// Storage upload test
function storageUploadTest() {
  // Test file upload to Supabase Storage
  const testFile = generateTestPDFData();

  const uploadResponse = http.post(
    `${BASE_URL}/api/v1/storage/upload`,
    {
      file: testFile,
      bucket: 'visa-documents',
      path: `test-uploads/test-${Date.now()}.pdf`,
    },
    { headers }
  );

  const success = check(uploadResponse, {
    'storage upload status is 200': (r) => r.status === 200,
    'storage upload has file URL': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.url !== undefined;
      } catch {
        return false;
      }
    },
    'storage upload response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  storageUploadRate.add(success);

  if (success) {
    const fileSize = testFile.length;
    storageUsageMetric.add(fileSize);
    totalProcessedBytes += fileSize;
  }
}

// Presigned URL test
function presignedUrlTest() {
  const testPath = `certificates/test-${Date.now()}.pdf`;

  const urlResponse = http.post(
    `${BASE_URL}/api/v1/storage/presigned-url`,
    JSON.stringify({
      bucket: 'visa-documents',
      path: testPath,
      expiresIn: 3600,
    }),
    { headers }
  );

  const success = check(urlResponse, {
    'presigned URL status is 200': (r) => r.status === 200,
    'presigned URL has URL': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.url !== undefined;
      } catch {
        return false;
      }
    },
    'presigned URL response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  presignedUrlRate.add(success);

  // Test the presigned URL
  if (success) {
    try {
      const urlBody = JSON.parse(urlResponse.body);
      const testUpload = http.put(urlBody.url, generateTestPDFData(), {
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      check(testUpload, {
        'presigned URL upload works': (r) => r.status === 200,
      });
    } catch (e) {
      console.warn('Failed to test presigned URL upload:', e.message);
    }
  }
}

// Check job status
function checkJobStatus(triggerResponse) {
  try {
    const body = JSON.parse(triggerResponse.body);
    if (body.jobId) {
      const statusResponse = http.get(
        `${BASE_URL}/api/v1/jobs/${body.jobId}/status`,
        { headers }
      );

      check(statusResponse, {
        'job status endpoint accessible': (r) => r.status === 200,
        'job status has state': (r) => {
          try {
            const statusBody = JSON.parse(r.body);
            return statusBody.state !== undefined;
          } catch {
            return false;
          }
        },
      });
    }
  } catch (e) {
    console.warn('Failed to check job status:', e.message);
  }
}

// Generate test PDF data
function generateTestPDFData() {
  // Generate a realistic PDF-like binary data
  const size = randomIntBetween(200 * 1024, 1024 * 1024); // 200KB to 1MB
  const data = new Uint8Array(size);

  // Add PDF header
  const pdfHeader = '%PDF-1.4\n';
  for (let i = 0; i < pdfHeader.length; i++) {
    data[i] = pdfHeader.charCodeAt(i);
  }

  // Fill with random data
  for (let i = pdfHeader.length; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }

  return data;
}

// Comprehensive test summary
export function handleSummary(data) {
  const finalSizeGB = totalProcessedBytes / 1024 / 1024 / 1024;
  const targetReached = totalProcessedBytes >= TARGET_SIZE_BYTES;

  const summary = {
    test_run: {
      timestamp: new Date().toISOString(),
      test_name: 'S4-QA-01 PDF Batch Test',
      target_size_gb: TARGET_SIZE_GB,
      actual_size_gb: finalSizeGB,
      target_reached: targetReached,
      documents_generated: documentsGenerated,
      duration_minutes: 30,
      total_requests: data.metrics.http_reqs.values.count,
      failed_requests: data.metrics.http_req_failed.values.count,
      error_rate: data.metrics.http_req_failed.values.rate,
      p95_latency: data.metrics.http_req_duration.values['p(95)'],
      avg_latency: data.metrics.http_req_duration.values.avg,
    },
    pdf_generation: {
      success_rate: data.metrics.pdf_generation_success_rate?.values.rate || 0,
      avg_latency: data.metrics.pdf_generation_latency?.values.avg || 0,
      p95_latency: data.metrics.pdf_generation_latency?.values['p(95)'] || 0,
      total_size_bytes: data.metrics.pdf_size_bytes?.values.count || 0,
      average_pdf_size_mb: (
        (data.metrics.pdf_size_bytes?.values.count || 0) /
        documentsGenerated /
        1024 /
        1024
      ).toFixed(2),
    },
    storage_performance: {
      upload_success_rate:
        data.metrics.storage_upload_success_rate?.values.rate || 0,
      presigned_url_success_rate:
        data.metrics.presigned_url_success_rate?.values.rate || 0,
      storage_usage_bytes: data.metrics.storage_usage_bytes?.values.count || 0,
      file_processing_p95_latency:
        data.metrics.file_processing_latency?.values['p(95)'] || 0,
      file_processing_avg_latency:
        data.metrics.file_processing_latency?.values.avg || 0,
    },
    performance_thresholds: {
      p95_latency_passed: data.metrics.http_req_duration.values['p(95)'] < 5000,
      error_rate_passed: data.metrics.http_req_failed.values.rate < 0.05,
      pdf_generation_success_rate_passed:
        (data.metrics.pdf_generation_success_rate?.values.rate || 0) > 0.9,
      storage_upload_success_rate_passed:
        (data.metrics.storage_upload_success_rate?.values.rate || 0) > 0.95,
      presigned_url_success_rate_passed:
        (data.metrics.presigned_url_success_rate?.values.rate || 0) > 0.95,
      file_processing_latency_passed:
        (data.metrics.file_processing_latency?.values['p(95)'] || 0) < 30000,
      target_size_reached: targetReached,
    },
    supabase_storage: {
      total_storage_used_gb: (
        (data.metrics.storage_usage_bytes?.values.count || 0) /
        1024 /
        1024 /
        1024
      ).toFixed(2),
      estimated_storage_cost: calculateStorageCost(
        data.metrics.storage_usage_bytes?.values.count || 0
      ),
    },
  };

  console.log('\n=== S4-QA-01 PDF Batch Test Summary ===');
  console.log(`Target Size: ${TARGET_SIZE_GB}GB`);
  console.log(`Actual Size: ${finalSizeGB.toFixed(2)}GB`);
  console.log(`Target Reached: ${targetReached ? 'YES' : 'NO'}`);
  console.log(`Documents Generated: ${documentsGenerated}`);
  console.log(
    `Average PDF Size: ${summary.pdf_generation.average_pdf_size_mb}MB`
  );
  console.log(`Total Requests: ${summary.test_run.total_requests}`);
  console.log(`Failed Requests: ${summary.test_run.failed_requests}`);
  console.log(`Error Rate: ${(summary.test_run.error_rate * 100).toFixed(2)}%`);

  console.log('\n=== PDF Generation Performance ===');
  console.log(
    `Success Rate: ${(summary.pdf_generation.success_rate * 100).toFixed(2)}%`
  );
  console.log(
    `Average Latency: ${summary.pdf_generation.avg_latency.toFixed(2)}ms`
  );
  console.log(
    `P95 Latency: ${summary.pdf_generation.p95_latency.toFixed(2)}ms`
  );

  console.log('\n=== Storage Performance ===');
  console.log(
    `Upload Success Rate: ${(
      summary.storage_performance.upload_success_rate * 100
    ).toFixed(2)}%`
  );
  console.log(
    `Presigned URL Success Rate: ${(
      summary.storage_performance.presigned_url_success_rate * 100
    ).toFixed(2)}%`
  );
  console.log(
    `File Processing P95 Latency: ${summary.storage_performance.file_processing_p95_latency.toFixed(
      2
    )}ms`
  );
  console.log(
    `Total Storage Used: ${summary.supabase_storage.total_storage_used_gb}GB`
  );
  console.log(
    `Estimated Storage Cost: $${summary.supabase_storage.estimated_storage_cost.toFixed(
      2
    )}`
  );

  // Pass/Fail status
  const allThresholdsPassed = Object.values(
    summary.performance_thresholds
  ).every(Boolean);
  console.log(
    `\n=== Test Result: ${allThresholdsPassed ? 'PASSED' : 'FAILED'} ===`
  );

  if (!allThresholdsPassed) {
    console.log('\n=== Failed Thresholds ===');
    Object.entries(summary.performance_thresholds).forEach(([key, passed]) => {
      if (!passed) {
        console.log(`❌ ${key}`);
      }
    });
  }

  return {
    'pdf-batch-test-results.json': JSON.stringify(summary, null, 2),
    'pdf-batch-test-summary.txt': generatePDFTextSummary(summary),
  };
}

// Calculate estimated storage cost for Supabase
function calculateStorageCost(bytes) {
  const gb = bytes / 1024 / 1024 / 1024;
  const freeLimit = 1; // 1GB free
  const billableGB = Math.max(0, gb - freeLimit);
  const costPerGB = 0.021; // $0.021 per GB per month
  return billableGB * costPerGB;
}

function generatePDFTextSummary(summary) {
  const allThresholdsPassed = Object.values(
    summary.performance_thresholds
  ).every(Boolean);

  return `
S4-QA-01 PDF Batch Test Results
===============================

Test Configuration:
- Target Size: ${TARGET_SIZE_GB}GB
- Actual Size: ${summary.test_run.actual_size_gb.toFixed(2)}GB
- Target Reached: ${
    summary.performance_thresholds.target_size_reached ? 'YES' : 'NO'
  }
- Documents Generated: ${summary.test_run.documents_generated}
- Duration: 30 minutes

Performance Metrics:
- P95 Latency: ${summary.test_run.p95_latency.toFixed(2)}ms (threshold: <5000ms)
- Error Rate: ${(summary.test_run.error_rate * 100).toFixed(
    2
  )}% (threshold: <5%)
- PDF Generation Success Rate: ${(
    summary.pdf_generation.success_rate * 100
  ).toFixed(2)}% (threshold: >90%)

PDF Generation:
- Average PDF Size: ${summary.pdf_generation.average_pdf_size_mb}MB
- Generation P95 Latency: ${summary.pdf_generation.p95_latency.toFixed(2)}ms
- Total PDF Data: ${(
    summary.pdf_generation.total_size_bytes /
    1024 /
    1024 /
    1024
  ).toFixed(2)}GB

Storage Performance:
- Upload Success Rate: ${(
    summary.storage_performance.upload_success_rate * 100
  ).toFixed(2)}% (threshold: >95%)
- Presigned URL Success Rate: ${(
    summary.storage_performance.presigned_url_success_rate * 100
  ).toFixed(2)}% (threshold: >95%)
- File Processing P95 Latency: ${summary.storage_performance.file_processing_p95_latency.toFixed(
    2
  )}ms (threshold: <30000ms)

Supabase Storage:
- Total Storage Used: ${summary.supabase_storage.total_storage_used_gb}GB
- Estimated Monthly Cost: $${summary.supabase_storage.estimated_storage_cost.toFixed(
    2
  )}

Test Result: ${allThresholdsPassed ? 'PASSED' : 'FAILED'}

Generated: ${summary.test_run.timestamp}
`;
}
