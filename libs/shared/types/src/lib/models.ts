import { Tables, TablesInsert } from './database.types';
import { PaginatedResponse } from './api.types';

export type User = Tables<'users'>;
export type InsertUser = TablesInsert<'users'>;

export type ApiKeyRecord = Tables<'api_keys'>;

export type RoleRecord = Tables<'roles'>;
export type UserRoleRecord = Tables<'user_roles'>;
export type InsertUserRole = TablesInsert<'user_roles'>;

export type Workflow = Tables<'workflows'>;

export type LogRecord = Tables<'logs'>;
export type PaginatedLogs = PaginatedResponse<LogRecord>;
