# Coding Standards

This document outlines the coding standards and best practices for the VisAPI project. Adherence to these standards ensures code quality, consistency, and maintainability.

## General Rules

- **TypeScript:** Strict mode is enabled across all projects (`"strict": true` in `tsconfig.json`).
- **Code Style:** An ESLint and Prettier configuration is enforced across the monorepo. Use `pnpm lint` and `pnpm format` to check and fix style issues.
- **Testing:** We aim for >80% test coverage on the backend and >70% on the frontend.
- **Comments:** Write minimal comments. Prefer clear, descriptive names for variables, functions, and classes.
- **Security:** Never commit secrets, API keys, or any other sensitive data to the repository. Use environment variables for all secrets.

## NestJS Backend Standards

### Dependency Injection

Always use NestJS's built-in dependency injection system. This promotes loose coupling and makes components easier to test.

```typescript
// Good: Use constructor injection
@Injectable()
export class MyService {
  constructor(private readonly logger: PinoLogger) {}
}
```

### Data Transfer Objects (DTOs)

Use DTOs with `class-validator` decorators for all incoming request bodies. This provides automatic validation and type safety at the boundaries of your application.

```typescript
// Good: Use DTOs for validation
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### Authentication and Authorization

Use Guards for protecting endpoints and a custom `@Scopes()` decorator for fine-grained role-based access control.

```typescript
// Good: Protect routes with Guards and Scopes
@UseGuards(ApiKeyGuard)
@Scopes('workflows:create')
@Post('workflows')
async createWorkflow(@Body() dto: CreateWorkflowDto) {
  // ...
}
```

## Next.js Frontend Standards

### App Router Conventions

Follow the file-based routing conventions of the Next.js App Router for pages, layouts, and loading states.

- `app/page.tsx`
- `app/layout.tsx`
- `app/loading.tsx`
- `app/dashboard/page.tsx`

### Server and Client Components

Be deliberate about using Server and Client Components. Use `'use client'` only when necessary for components that require state, effects, or browser-only APIs.

### TypeScript Interfaces

Define clear TypeScript interfaces for your data structures, especially for API responses and component props. Prefer shared types from `@visapi/shared-types` whenever possible.

```typescript
// Good: Define clear interfaces
interface User {
  id: string;
  email: string;
  role: 'viewer' | 'operator' | 'admin';
}
```

### Data Fetching

Use a robust data fetching and caching library like React Query (`@tanstack/react-query`) to manage server state.

```typescript
// Good: Use React Query for data fetching
const { data, error, isLoading } = useQuery({
  queryKey: ['workflows'],
  queryFn: fetchWorkflows,
});
```
