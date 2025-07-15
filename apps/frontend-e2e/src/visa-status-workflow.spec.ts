import { test, expect } from '@playwright/test';
import { setTimeout } from 'timers/promises';

/**
 * E2E Test: Visa Status Update Workflow
 * 
 * This test covers the complete visa status update workflow:
 * 1. Create a workflow with cron trigger
 * 2. Create a WhatsApp step for status notification
 * 3. Verify the workflow executes successfully
 * 4. Check that the WhatsApp message is sent
 * 5. Verify audit trail in logs
 */

const TEST_WORKFLOW = {
  name: 'E2E Test: Visa Status Update',
  description: 'Test workflow for visa status notifications',
  enabled: true,
  schema: {
    id: 'visa-status-update-e2e',
    name: 'Visa Status Update E2E Test',
    triggers: [
      {
        type: 'cron',
        config: {
          schedule: '0 */2 * * *' // Every 2 hours for testing
        }
      }
    ],
    steps: [
      {
        id: 'whatsapp-notification',
        type: 'whatsapp.send',
        config: {
          contact: '+1234567890',
          template: 'visa_approved',
          variables: {
            applicant_name: 'John Doe',
            visa_type: 'Tourist',
            approval_date: '2025-07-15'
          }
        },
        retries: 3
      }
    ]
  }
};

test.describe('Visa Status Update Workflow E2E', () => {
  let workflowId: string;

  test.beforeAll(async ({ request }) => {
    // Ensure we have a clean test environment
    console.log('Setting up E2E test environment...');
  });

  test.afterAll(async ({ request }) => {
    // Clean up test workflow if it exists
    if (workflowId) {
      try {
        await request.delete(`http://localhost:3000/api/v1/workflows/${workflowId}`, {
          headers: {
            'X-API-Key': 'test-api-key-prefix_test-secret' // Using test API key
          }
        });
        console.log(`Cleaned up test workflow: ${workflowId}`);
      } catch (error) {
        console.warn('Failed to clean up test workflow:', error);
      }
    }
  });

  test('should create and execute visa status update workflow', async ({ page, request }) => {
    // Step 1: Navigate to the admin dashboard
    await page.goto('/');
    
    // Step 2: Login (assuming magic link or test auth)
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Step 3: Navigate to workflows page
    await page.click('[data-testid="workflows-nav"]');
    await page.waitForSelector('[data-testid="workflows-page"]');
    
    // Step 4: Create new workflow
    await page.click('[data-testid="create-workflow-btn"]');
    
    // Fill in workflow details
    await page.fill('[data-testid="workflow-name"]', TEST_WORKFLOW.name);
    await page.fill('[data-testid="workflow-description"]', TEST_WORKFLOW.description);
    
    // Set workflow schema (assuming JSON editor)
    await page.fill('[data-testid="workflow-schema"]', JSON.stringify(TEST_WORKFLOW.schema, null, 2));
    
    // Save workflow
    await page.click('[data-testid="save-workflow-btn"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="workflow-saved"]', { timeout: 5000 });
    
    // Step 5: Verify workflow was created via API
    const workflowsResponse = await request.get('http://localhost:3000/api/v1/workflows', {
      headers: {
        'X-API-Key': 'test-api-key-prefix_test-secret'
      }
    });
    
    expect(workflowsResponse.status()).toBe(200);
    const workflows = await workflowsResponse.json();
    const testWorkflow = workflows.find((w: any) => w.name === TEST_WORKFLOW.name);
    
    expect(testWorkflow).toBeDefined();
    expect(testWorkflow.enabled).toBe(true);
    workflowId = testWorkflow.id;
    
    // Step 6: Trigger workflow manually (for testing)
    const triggerResponse = await request.post(`http://localhost:3000/api/v1/workflows/${workflowId}/trigger`, {
      headers: {
        'X-API-Key': 'test-api-key-prefix_test-secret'
      },
      data: {
        context: {
          applicant_name: 'John Doe',
          visa_type: 'Tourist',
          approval_date: '2025-07-15'
        }
      }
    });
    
    expect(triggerResponse.status()).toBe(200);
    const triggerResult = await triggerResponse.json();
    expect(triggerResult.jobId).toBeDefined();
    
    // Step 7: Wait for workflow execution
    await setTimeout(5000); // Wait 5 seconds for job processing
    
    // Step 8: Verify job completion in queue
    await page.goto('/queue');
    await page.waitForSelector('[data-testid="queue-page"]');
    
    // Check for completed jobs
    const completedJobs = await page.locator('[data-testid="completed-jobs"]');
    await expect(completedJobs).toBeVisible();
    
    // Step 9: Verify WhatsApp message was sent (check logs)
    await page.goto('/logs');
    await page.waitForSelector('[data-testid="logs-page"]');
    
    // Filter logs for our workflow
    await page.fill('[data-testid="workflow-filter"]', workflowId);
    await page.click('[data-testid="apply-filters-btn"]');
    
    // Wait for filtered logs
    await page.waitForSelector('[data-testid="log-entries"]', { timeout: 10000 });
    
    // Verify WhatsApp message log entry
    const logEntries = await page.locator('[data-testid="log-entry"]');
    const logCount = await logEntries.count();
    
    expect(logCount).toBeGreaterThan(0);
    
    // Check for WhatsApp connector log
    const whatsappLog = await page.locator('[data-testid="log-entry"]').filter({
      hasText: 'whatsapp.send'
    });
    
    await expect(whatsappLog).toBeVisible();
    
    // Step 10: Verify workflow completion status
    const logsResponse = await request.get(`http://localhost:3000/api/v1/logs?workflow_id=${workflowId}`, {
      headers: {
        'X-API-Key': 'test-api-key-prefix_test-secret'
      }
    });
    
    expect(logsResponse.status()).toBe(200);
    const logs = await logsResponse.json();
    
    // Should have logs for workflow execution
    expect(logs.data.length).toBeGreaterThan(0);
    
    // Should have successful WhatsApp message send
    const successLog = logs.data.find((log: any) => 
      log.message.includes('WhatsApp message sent successfully')
    );
    
    expect(successLog).toBeDefined();
    expect(successLog.level).toBe('info');
    
    // Step 11: Verify cron job was scheduled
    const cronJobsResponse = await request.get('http://localhost:3000/api/v1/queue/repeatables', {
      headers: {
        'X-API-Key': 'test-api-key-prefix_test-secret'
      }
    });
    
    expect(cronJobsResponse.status()).toBe(200);
    const cronJobs = await cronJobsResponse.json();
    
    // Should have our test workflow cron job
    const testCronJob = cronJobs.find((job: any) => 
      job.name === 'WORKFLOW_CRON' && job.opts.repeat.cron === '0 */2 * * *'
    );
    
    expect(testCronJob).toBeDefined();
    
    console.log('✅ E2E Test completed successfully');
    console.log(`✅ Workflow created: ${workflowId}`);
    console.log(`✅ WhatsApp message sent and logged`);
    console.log(`✅ Cron job scheduled: ${testCronJob?.key}`);
  });

  test('should handle workflow execution errors gracefully', async ({ page, request }) => {
    // Test error handling in workflow execution
    const errorWorkflow = {
      ...TEST_WORKFLOW,
      name: 'E2E Test: Error Handling',
      schema: {
        ...TEST_WORKFLOW.schema,
        steps: [
          {
            id: 'invalid-step',
            type: 'invalid.connector',
            config: {
              invalid: 'config'
            }
          }
        ]
      }
    };

    // Create workflow with invalid step
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    await page.click('[data-testid="workflows-nav"]');
    await page.waitForSelector('[data-testid="workflows-page"]');
    
    await page.click('[data-testid="create-workflow-btn"]');
    await page.fill('[data-testid="workflow-name"]', errorWorkflow.name);
    await page.fill('[data-testid="workflow-schema"]', JSON.stringify(errorWorkflow.schema, null, 2));
    
    await page.click('[data-testid="save-workflow-btn"]');
    
    // Should show validation error
    await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
    
    const errorMessage = await page.locator('[data-testid="validation-error"]').textContent();
    expect(errorMessage).toContain('invalid connector type');
    
    console.log('✅ Error handling test completed successfully');
  });
});