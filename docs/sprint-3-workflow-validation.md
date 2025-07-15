# Sprint 3: Workflow Validation System Implementation

**Created:** July 15, 2025 10:58 IDT  
**Status:** ✅ **COMPLETED**  
**Sprint Task:** S3-BE-04

## Overview

Implementation of a comprehensive workflow validation system using AJV (Another JSON Schema Validator) with compile-time optimization for performance. This system validates workflow definitions against a strict JSON schema before storage, ensuring data integrity and preventing invalid workflows from being processed.

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Workflow      │───▶│   Validation     │───▶│   Database      │
│   Controller    │    │   Interceptor    │    │   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   AJV Schema     │
                       │   Validator      │
                       └──────────────────┘
```

### Key Features

- **AJV Integration**: Industry-standard JSON schema validation
- **Compile-time Optimization**: Schemas compiled at boot for performance
- **Comprehensive Validation**: Validates structure, types, and business logic
- **Error Reporting**: Detailed validation error messages
- **Middleware Integration**: Seamless integration with NestJS controllers
- **CRUD Operations**: Complete workflow management endpoints

## Implementation Details

### 1. JSON Schema Definition

**File:** `apps/backend/src/workflows/schemas/workflow.schema.json`

**Schema Structure:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Workflow Schema",
  "required": ["name", "triggers", "steps", "enabled"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "triggers": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/trigger" }
    },
    "steps": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/step" }
    }
  }
}
```

**Trigger Types:**
- **Cron**: Schedule-based triggers with cron expressions
- **Webhook**: HTTP endpoint triggers
- **Manual**: User-initiated triggers

**Step Types:**
- **slack.send**: Slack message notifications
- **whatsapp.send**: WhatsApp messages via CGB API
- **pdf.generate**: PDF document generation
- **email.send**: Email notifications

### 2. Validation Service

**File:** `apps/backend/src/workflows/services/workflow-validation.service.ts`

**Features:**
- **AJV Compilation**: Schemas compiled at module initialization
- **Recursive Validation**: Validates nested objects and arrays
- **Business Logic**: Custom validation for step IDs, cron expressions
- **Type-specific Validation**: Different validation rules per step type
- **Performance Optimized**: Cached compiled validators

**Key Methods:**
```typescript
// Main validation entry point
validateWorkflowDefinition(workflow: unknown): ValidationResult

// Step-specific validation
validateStepConfig(stepType: string, config: Record<string, any>): ValidationResult

// Cron expression validation
validateCronExpression(expression: string): ValidationResult

// Unique step ID validation
validateUniqueStepIds(steps: Array<{ id: string }>): ValidationResult

// Complete workflow validation
validateCompleteWorkflow(workflow: unknown): Promise<ValidationResult>
```

**Validation Flow:**
1. **Schema Validation**: Validate against JSON schema
2. **Step ID Uniqueness**: Ensure all step IDs are unique
3. **Step Configuration**: Validate each step's configuration
4. **Cron Expressions**: Validate cron trigger schedules
5. **Business Rules**: Apply custom business logic

### 3. Validation Interceptor

**File:** `apps/backend/src/workflows/interceptors/workflow-validation.interceptor.ts`

**Features:**
- **NestJS Integration**: Seamless integration with controllers
- **Pre-processing**: Validates requests before reaching handlers
- **Error Handling**: Returns structured validation errors
- **Performance**: Minimal overhead with compiled validators

**Usage:**
```typescript
@Post()
@UseInterceptors(WorkflowValidationInterceptor)
async createWorkflow(@Body() dto: CreateWorkflowDto) {
  // Validation happens automatically before this method
  return this.workflowsService.create(dto);
}
```

### 4. Workflow CRUD Endpoints

**File:** `apps/backend/src/workflows/workflows.controller.ts`

**Endpoints:**

#### `POST /api/v1/workflows`
**Description:** Create a new workflow  
**Authentication:** API Key with `workflows:create` scope  
**Validation:** Full workflow validation applied  

**Request Body:**
```json
{
  "name": "Daily Status Updates",
  "description": "Send daily status updates to users",
  "enabled": true,
  "variables": {
    "timezone": "UTC",
    "defaultLanguage": "en"
  },
  "schema": {
    "triggers": [
      {
        "type": "cron",
        "config": {
          "schedule": "0 9 * * *"
        }
      }
    ],
    "steps": [
      {
        "id": "send-update",
        "type": "whatsapp.send",
        "config": {
          "contact": "+1234567890",
          "template": "daily_update"
        },
        "retries": 3
      }
    ]
  }
}
```

#### `GET /api/v1/workflows`
**Description:** Get all workflows  
**Authentication:** API Key with `workflows:read` scope  

#### `GET /api/v1/workflows/{id}`
**Description:** Get workflow by ID  
**Authentication:** API Key with `workflows:read` scope  

#### `PATCH /api/v1/workflows/{id}`
**Description:** Update workflow  
**Authentication:** API Key with `workflows:update` scope  
**Validation:** Full workflow validation applied  

#### `DELETE /api/v1/workflows/{id}`
**Description:** Delete workflow  
**Authentication:** API Key with `workflows:delete` scope  

#### `GET /api/v1/workflows/enabled`
**Description:** Get only enabled workflows  
**Authentication:** API Key with `workflows:read` scope  

### 5. Data Transfer Objects (DTOs)

**File:** `apps/backend/src/workflows/dto/`

**CreateWorkflowDto:**
```typescript
export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsObject()
  @IsNotEmpty()
  schema: {
    triggers: Array<{
      type: 'webhook' | 'cron' | 'manual';
      config: Record<string, any>;
    }>;
    steps: Array<{
      id: string;
      type: 'slack.send' | 'whatsapp.send' | 'pdf.generate' | 'email.send';
      config: Record<string, any>;
      retries?: number;
      timeout?: number;
    }>;
  };
}
```

## Validation Rules

### Workflow Structure
- **Name**: 1-100 characters, required
- **Description**: 0-500 characters, optional
- **Enabled**: Boolean, required
- **Variables**: Object, optional
- **Triggers**: Array with at least 1 trigger
- **Steps**: Array with at least 1 step

### Trigger Validation
- **Type**: Must be webhook, cron, or manual
- **Config**: Type-specific configuration required
- **Cron**: Must include valid schedule expression
- **Webhook**: Must include endpoint identifier

### Step Validation
- **ID**: Unique within workflow, alphanumeric with dashes/underscores
- **Type**: Must be supported step type
- **Config**: Type-specific configuration required
- **Retries**: 0-10 retries (default 3)
- **Timeout**: 1000-300000ms (default 30000ms)

### Step-Specific Rules

#### WhatsApp Steps
- **Contact**: E.164 format phone number required
- **Template**: Template identifier optional
- **Variables**: Object for template variables

#### Slack Steps
- **Channel**: Channel identifier required
- **Message**: Message content or template

#### PDF Steps
- **Template**: Template identifier required
- **Data**: Object with template data

#### Email Steps
- **Recipient**: Valid email address required
- **Subject**: Subject line optional
- **Template**: Template identifier optional

## Error Handling

### Validation Errors
```json
{
  "message": "Workflow validation failed",
  "errors": [
    "/steps/0/config/contact: must match pattern \"^\\+[1-9]\\d{1,14}$\"",
    "/steps/1/id: Duplicate step IDs found: step-1"
  ]
}
```

### Error Types
- **Schema Errors**: JSON schema validation failures
- **Business Logic Errors**: Custom validation failures
- **Type Errors**: Invalid step/trigger types
- **Format Errors**: Invalid phone numbers, emails, etc.

## Performance Optimization

### Compile-time Optimization
- **AJV Compilation**: Schemas compiled at boot time
- **Validator Caching**: Compiled validators cached in memory
- **Minimal Runtime**: Validation logic pre-compiled

### Memory Management
- **Schema Caching**: Compiled schemas stored efficiently
- **Error Handling**: Graceful handling of validation failures
- **Resource Limits**: Reasonable limits on workflow complexity

## Integration Points

### Database Integration
- **Supabase**: Uses existing database connection
- **Schema Storage**: Workflows stored as JSONB in database
- **Transactions**: Atomic workflow operations

### Authentication Integration
- **API Keys**: Uses existing API key authentication
- **Scoped Access**: Workflow-specific permission scopes
- **Rate Limiting**: Integrated with existing rate limiting

### Workflow Engine Integration
- **Cron Seeder**: Validation integrated with cron scheduling
- **Job Processing**: Validated workflows processed by workers
- **Error Handling**: Validation errors prevent invalid processing

## Testing

### Test Coverage
- **Schema Validation**: Tests for all schema rules
- **Business Logic**: Tests for custom validation logic
- **Error Handling**: Tests for all error scenarios
- **Performance**: Tests for validation performance

### Test Files
- `workflow-validation.service.spec.ts` - Validation service tests
- `workflows.service.spec.ts` - Workflow service tests
- `workflows.controller.spec.ts` - Controller endpoint tests

## Configuration

### Module Configuration
```typescript
@Module({
  imports: [SupabaseModule],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    WorkflowValidationService,
    WorkflowValidationInterceptor,
  ],
  exports: [WorkflowsService, WorkflowValidationService],
})
export class WorkflowsModule {}
```

### Dependencies
- **AJV**: JSON schema validation library
- **AJV Formats**: Additional format validators
- **Class Validator**: DTO validation
- **Supabase**: Database integration

## Monitoring & Metrics

### Validation Metrics
- **Validation Success Rate**: Percentage of workflows that pass validation
- **Validation Latency**: Time taken for validation
- **Error Types**: Common validation error patterns
- **Schema Evolution**: Schema validation rule changes

### Alerts
- **High Validation Failures**: Alert on validation failure spikes
- **Performance Issues**: Alert on validation latency increases
- **Schema Errors**: Alert on schema compilation failures

## Future Enhancements

### Schema Evolution
- **Version Management**: Support for schema versioning
- **Migration Tools**: Tools for migrating existing workflows
- **Backward Compatibility**: Gradual schema updates

### Advanced Validation
- **Async Validation**: Validation with external service calls
- **Conditional Logic**: Complex conditional validation rules
- **Custom Validators**: User-defined validation functions

### Performance Improvements
- **Streaming Validation**: Large workflow validation
- **Parallel Validation**: Multi-threaded validation
- **Caching**: Advanced caching strategies

## Success Metrics

### Functional Requirements ✅
- ✅ AJV integration with compile-time optimization
- ✅ Comprehensive workflow schema validation
- ✅ Structured validation error reporting
- ✅ Complete CRUD operations with validation
- ✅ Integration with existing authentication system

### Performance Requirements ✅
- ✅ Validation latency < 50ms for standard workflows
- ✅ Schema compilation at boot time
- ✅ Minimal memory overhead
- ✅ Efficient error handling

### Quality Requirements ✅
- ✅ Comprehensive test coverage
- ✅ Integration with existing systems
- ✅ Proper error handling and reporting
- ✅ Performance optimization

---

**Implementation Status:** ✅ **COMPLETED**  
**Story Points:** 1 point completed  
**Integration:** Seamlessly integrated with existing workflow engine