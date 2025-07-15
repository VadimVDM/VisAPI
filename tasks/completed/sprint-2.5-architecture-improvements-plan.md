# Sprint 2.5: Architecture Improvements Implementation Plan

**Completed:** July 15, 2025

## Objective

Enhance VisAPI's architectural integrity, security, and maintainability by addressing critical technical debt identified in the codebase review. Focus on monorepo organization, security vulnerabilities, and component architecture improvements.

## Tasks

### 🏛️ Phase 1: Monorepo Organization & Shared Libraries

- [x] **P1-01**: Create shared libraries structure in `/libs/` directory ✅ **COMPLETED**
- [x] **P1-02**: Extract shared types library (`@visapi/shared-types`) ✅ **COMPLETED**
- [x] **P1-03**: Extract core configuration library (`@visapi/core-config`) ✅ **COMPLETED**
- [x] **P1-04**: Extract Supabase integration library (`@visapi/core-supabase`) ✅ **COMPLETED**
- [x] **P1-05**: Update applications to use shared libraries ✅ **COMPLETED**
- [x] **P1-06**: Configure NX dependency boundaries and tagging ✅ **COMPLETED**

### 🔐 Phase 2: Security Enhancements

- [x] **P2-01**: Fix broken API key validation with proper bcrypt compare ✅ **COMPLETED**
- [x] **P2-02**: Implement Redis-based idempotency service ✅ **COMPLETED**
- [x] **P2-03**: Remove hardcoded API keys from frontend ✅ **COMPLETED**
- [x] **P2-04**: Add JWT authentication for dashboard-to-backend communication ✅ **COMPLETED**
- [ ] **P2-05**: Implement API key caching with Redis for performance
- [ ] **P2-06**: Add comprehensive authentication unit tests

### 🔄 Phase 3: Webhook & Workflow Architecture

- [ ] **P3-01**: Refactor WebhooksController to remove hardcoded business logic
- [ ] **P3-02**: Implement generic workflow processing in WorkerService
- [ ] **P3-03**: Create workflow registry pattern to replace switch statements
- [ ] **P3-04**: Update webhook tests to reflect new generic architecture
- [ ] **P3-05**: Add workflow schema validation and error handling

### 💻 Phase 4: Frontend Architecture Improvements

- [ ] **P4-01**: Componentize ApiKeysPage into reusable components
- [ ] **P4-02**: Replace hardcoded mock data with API integration
- [ ] **P4-03**: Create reusable StatCard component for dashboard
- [ ] **P4-04**: Implement proper data fetching with React Query/SWR
- [ ] **P4-05**: Add loading states and error boundaries

### 🏥 Phase 5: Health Check Consolidation

- [ ] **P5-01**: Remove duplicate health endpoints from AppController
- [ ] **P5-02**: Standardize health checks in HealthController
- [ ] **P5-03**: Update health check routes to follow `/api/v1/*` pattern
- [ ] **P5-04**: Add version endpoint with build information

### ✅ Phase 6: Testing & Documentation

- [ ] **P6-01**: Update all unit tests to reflect architectural changes
- [ ] **P6-02**: Add integration tests for new authentication flow
- [ ] **P6-03**: Run comprehensive test suite and fix any failures
- [ ] **P6-04**: Update NX project graph and documentation
- [ ] **P6-05**: Create Sprint 2.5 implementation report

## Technical Details

### Phase 1: Shared Libraries Architecture

#### Target Structure

```
libs/
├── shared/
│   ├── types/              # @visapi/shared-types
│   ├── ui-components/      # @visapi/shared-ui (future)
│   └── utils/              # @visapi/shared-utils
├── backend/
│   ├── core-config/        # @visapi/core-config
│   ├── core-supabase/      # @visapi/core-supabase
│   ├── feature-auth/       # @visapi/backend-auth
│   └── util-redis/         # @visapi/util-redis
└── frontend/
    ├── ui-forms/           # @visapi/frontend-forms
    └── data-access/        # @visapi/frontend-data
```

#### Library Generation Commands

```bash
# Shared libraries
nx g @nx/js:lib shared/types --directory=libs/shared
nx g @nx/js:lib shared/utils --directory=libs/shared

# Backend libraries
nx g @nx/node:lib backend/core-config --directory=libs/backend
nx g @nx/node:lib backend/core-supabase --directory=libs/backend
nx g @nx/node:lib backend/util-redis --directory=libs/backend

# Frontend libraries
nx g @nx/react:lib frontend/ui-forms --directory=libs/frontend
nx g @nx/react:lib frontend/data-access --directory=libs/frontend
```

#### NX Boundary Configuration

```json
// nx.json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?",
      "!{projectRoot}/tsconfig.spec.json"
    ]
  },
  "targetDefaults": {
    "@nx/eslint:lint": {
      "inputs": [
        "default",
        "{workspaceRoot}/.eslintrc.json",
        "{workspaceRoot}/.eslintignore"
      ]
    }
  },
  "plugins": [
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    }
  ],
  "generators": {
    "@nx/react": {
      "application": {
        "style": "tailwind",
        "linter": "eslint"
      }
    }
  }
}
```

### Phase 2: Security Implementation Details

#### Enhanced API Key Authentication

```typescript
// libs/backend/feature-auth/src/lib/auth.service.ts
export class AuthService {
  async createApiKey(
    name: string,
    scopes: string[]
  ): Promise<{ key: string; apiKeyData: ApiKey }> {
    const prefix = 'vapi_';
    const secret = crypto.randomBytes(32).toString('hex');
    const fullKey = `${prefix}${secret}`;

    const hashedSecret = await bcrypt.hash(secret, 12);

    const apiKeyData = await this.supabase
      .from('api_keys')
      .insert({
        name,
        prefix,
        hashed_secret: hashedSecret,
        scopes,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      })
      .select()
      .single();

    return { key: fullKey, apiKeyData };
  }

  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    const [prefix, secret] = this.splitApiKey(apiKey);
    if (!prefix || !secret) return null;

    // Check Redis cache first
    const cached = await this.redis.get(`api_key:${prefix}`);
    if (cached) {
      const keyData = JSON.parse(cached);
      const isValid = await bcrypt.compare(secret, keyData.hashed_secret);
      return isValid ? keyData : null;
    }

    // Fetch from database
    const { data } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('prefix', prefix)
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!data) return null;

    const isValid = await bcrypt.compare(secret, data.hashed_secret);
    if (isValid) {
      // Cache for 5 minutes
      await this.redis.setex(`api_key:${prefix}`, 300, JSON.stringify(data));
      return data;
    }

    return null;
  }
}
```

#### Redis Idempotency Service

```typescript
// libs/backend/util-redis/src/lib/idempotency.service.ts
@Injectable()
export class IdempotencyService {
  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis,
    private logger: PinoLogger
  ) {}

  async checkAndExecute<T>(
    key: string,
    executor: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const lockKey = `idempotent:${key}:lock`;
    const resultKey = `idempotent:${key}:result`;

    // Check if result already exists
    const existingResult = await this.redis.get(resultKey);
    if (existingResult) {
      this.logger.info(
        { idempotencyKey: key },
        'Returning cached idempotent result'
      );
      return JSON.parse(existingResult);
    }

    // Try to acquire lock
    const lockId = crypto.randomUUID();
    const lockAcquired = await this.redis.set(
      lockKey,
      lockId,
      'PX',
      300000,
      'NX'
    );

    if (lockAcquired !== 'OK') {
      // Another request is processing, wait and check for result
      await this.waitForResult(resultKey, 30000); // Wait up to 30 seconds
      const result = await this.redis.get(resultKey);
      if (result) return JSON.parse(result);
      throw new Error('Idempotent operation failed - no result available');
    }

    try {
      // Execute the operation
      const result = await executor();

      // Store result
      await this.redis.setex(resultKey, ttl, JSON.stringify(result));

      return result;
    } finally {
      // Release lock
      await this.releaseLock(lockKey, lockId);
    }
  }
}
```

### Phase 3: Workflow Architecture

#### Generic Webhook Controller

```typescript
// apps/backend/src/webhooks/webhooks.controller.ts
@Controller('api/v1/triggers')
export class WebhooksController {
  constructor(
    private queueService: QueueService,
    private idempotencyService: IdempotencyService,
    private logger: PinoLogger
  ) {}

  @Post(':key')
  async handleWebhook(
    @Param('key') webhookKey: string,
    @Body() payload: any,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    const operation = async () => {
      // Add generic workflow processing job
      const job = await this.queueService.addJob(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PROCESS_WORKFLOW,
        {
          webhookKey,
          payload,
          timestamp: new Date().toISOString(),
        },
        { priority: 'default' }
      );

      return {
        success: true,
        jobId: job.id,
        message: 'Workflow processing queued',
      };
    };

    if (idempotencyKey) {
      return this.idempotencyService.checkAndExecute(
        `webhook:${webhookKey}:${idempotencyKey}`,
        operation,
        86400 // 24 hours
      );
    }

    return operation();
  }
}
```

#### Enhanced Worker Service

```typescript
// worker/src/app/worker.service.ts (after refactoring)
@Injectable()
export class WorkerService {
  private processors = new Map<string, JobProcessor>();

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService
  ) {
    this.registerProcessors();
  }

  private registerProcessors() {
    this.processors.set('slack.send', new SlackProcessor());
    this.processors.set('whatsapp.send', new WhatsAppProcessor());
    this.processors.set('pdf.generate', new PdfProcessor());
    this.processors.set(
      'workflow.process',
      new WorkflowProcessor(this.supabase)
    );
  }

  async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.name);
    if (!processor) {
      throw new Error(`No processor found for job type: ${job.name}`);
    }

    return processor.process(job);
  }
}

class WorkflowProcessor implements JobProcessor {
  constructor(private supabase: SupabaseService) {}

  async process(job: Job<{ webhookKey: string; payload: any }>): Promise<void> {
    const { webhookKey, payload } = job.data;

    // Fetch workflow definition
    const { data: workflow } = await this.supabase.serviceClient
      .from('workflows')
      .select('*')
      .eq('webhook_key', webhookKey)
      .eq('enabled', true)
      .single();

    if (!workflow) {
      throw new Error(
        `No active workflow found for webhook key: ${webhookKey}`
      );
    }

    // Process workflow steps
    for (const step of workflow.schema.steps) {
      await this.executeStep(step, payload, workflow.id);
    }
  }
}
```

### Phase 4: Frontend Component Architecture

#### Componentized API Keys Page

```tsx
// apps/frontend/src/app/dashboard/api-keys/page.tsx
import { Suspense } from 'react';
import { ApiKeyList } from './components/api-key-list';
import { CreateApiKeyButton } from './components/create-api-key-button';
import { ApiKeyFilters } from './components/api-key-filters';

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <CreateApiKeyButton />
      </div>

      <ApiKeyFilters />

      <Suspense fallback={<ApiKeyListSkeleton />}>
        <ApiKeyList />
      </Suspense>
    </div>
  );
}
```

#### Data Integration with React Query

```tsx
// libs/frontend/data-access/src/lib/api-keys.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await fetch('/api/v1/api-keys', {
        headers: { Authorization: `Bearer ${await getSupabaseToken()}` },
      });
      if (!response.ok) throw new Error('Failed to fetch API keys');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateApiKeyDto) => {
      const response = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getSupabaseToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create API key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
```

## Dependencies

### External Dependencies

- **Existing NX Workspace**: Current monorepo structure
- **Supabase Database**: API keys table schema update required
- **Redis Instance**: Available for idempotency and caching
- **BullMQ Configuration**: Queue system integration

### Internal Dependencies

- **Auth Module**: Needs refactoring for security fixes
- **Webhook Module**: Requires architectural changes
- **Frontend Components**: Need componentization
- **Worker Process**: Needs workflow registry implementation

### Database Schema Changes

```sql
-- Update api_keys table structure
ALTER TABLE api_keys
ADD COLUMN prefix TEXT,
ADD COLUMN hashed_secret TEXT,
DROP COLUMN hashed_key;

-- Add indexes for performance
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- Add workflows webhook_key column
ALTER TABLE workflows
ADD COLUMN webhook_key TEXT UNIQUE;
```

## Success Criteria

### Security Improvements

- [ ] API key validation uses proper bcrypt.compare() logic
- [ ] All hardcoded API keys removed from frontend code
- [ ] Idempotency implemented with Redis persistence
- [ ] JWT authentication working for dashboard communication
- [ ] No authentication-related security vulnerabilities

### Architecture Quality

- [ ] Zero direct app-to-app imports in monorepo
- [ ] Shared libraries properly configured with NX boundaries
- [ ] Webhook controller contains no hardcoded business logic
- [ ] Worker service uses registry pattern for job processors
- [ ] All health check endpoints consolidated

### Frontend Architecture

- [ ] API keys page broken into reusable components
- [ ] All mock data replaced with real API integration
- [ ] Proper loading states and error handling implemented
- [ ] React Query/SWR integrated for data fetching
- [ ] No monolithic components over 150 lines

### Testing Coverage

- [ ] All new authentication logic has unit tests
- [ ] Idempotency service has comprehensive test coverage
- [ ] Refactored components have proper test coverage
- [ ] Integration tests pass for new authentication flow
- [ ] E2E tests updated for UI changes

### Performance Improvements

- [ ] API key validation cached in Redis (< 50ms response time)
- [ ] Idempotency checks complete in < 100ms
- [ ] Frontend components render without blocking
- [ ] NX build cache optimization (> 30% build time improvement)

### Documentation

- [ ] Shared library usage documented
- [ ] New authentication flow documented
- [ ] Component architecture patterns documented
- [ ] Sprint 2.5 implementation report completed
- [ ] Updated roadmap with Sprint 2.5 completion

## Risk Mitigation

### Breaking Changes

- **Database Schema**: Use migrations with rollback procedures
- **API Changes**: Maintain backward compatibility during transition
- **Frontend Refactoring**: Implement behind feature flags where possible

### Testing Strategy

- **Unit Tests**: Comprehensive coverage for all refactored logic
- **Integration Tests**: Full authentication flow testing
- **E2E Tests**: Critical user journey validation
- **Performance Tests**: API response time validation

### Rollback Plan

- **Database**: Migration rollback scripts prepared
- **Code Changes**: Feature branches with easy reversion
- **Configuration**: Environment variable rollback procedures
- **Cache**: Redis key invalidation scripts ready

---

**Estimated Timeline**: 2-3 weeks
**Priority**: High (Security vulnerabilities and architectural debt)
**Impact**: High (Foundation for Sprint 3+ features)
