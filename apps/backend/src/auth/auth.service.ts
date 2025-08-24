import { Injectable } from '@nestjs/common';
import { ApiKeyService } from './services/api-key.service';
import { UserAuthService } from './services/user-auth.service';
import { TokenService } from './services/token.service';
import { PermissionService } from './services/permission.service';
import {
  ApiKeyRecord,
  User,
  RoleRecord,
  UserRoleRecord,
} from '@visapi/shared-types';
import { AuthUser, Session } from '@supabase/supabase-js';

/**
 * Main AuthService that orchestrates authentication and authorization
 * Delegates to specialized services for specific functionality
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly userAuthService: UserAuthService,
    private readonly tokenService: TokenService,
    private readonly permissionService: PermissionService,
  ) {}

  // API Key Methods - Delegate to ApiKeyService

  async createApiKey(
    name: string,
    scopes: string[],
    createdBy: string,
    customPrefix?: string,
  ): Promise<{ key: string; apiKey: ApiKeyRecord }> {
    return this.apiKeyService.createApiKey(
      name,
      scopes,
      createdBy,
      customPrefix,
    );
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyRecord | null> {
    return this.apiKeyService.validateApiKey(apiKey);
  }

  async listApiKeys(userId?: string): Promise<ApiKeyRecord[]> {
    return this.apiKeyService.listApiKeys(userId);
  }

  async revokeApiKey(keyId: string): Promise<void> {
    return this.apiKeyService.revokeApiKey(keyId);
  }

  checkScopes(apiKey: ApiKeyRecord, requiredScopes: string[]): boolean {
    return this.apiKeyService.checkScopes(apiKey, requiredScopes);
  }

  // User Auth Methods - Delegate to UserAuthService

  async signUpWithEmail(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser | null; error: Error | null }> {
    return this.userAuthService.signUpWithEmail(email, password);
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<{
    user: AuthUser | null;
    session: Session | null;
    error: Error | null;
  }> {
    return this.userAuthService.signInWithEmail(email, password);
  }

  async signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    return this.userAuthService.signInWithMagicLink(email);
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    return this.userAuthService.resetPassword(email);
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    return this.userAuthService.updatePassword(newPassword);
  }

  async signOut(): Promise<{ error: Error | null }> {
    return this.userAuthService.signOut();
  }

  async createUserRecord(authUser: AuthUser): Promise<User> {
    return this.userAuthService.createUserRecord(authUser);
  }

  async getUserByAuthId(authUserId: string): Promise<User | null> {
    return this.userAuthService.getUserByAuthId(authUserId);
  }

  // Token Methods - Delegate to TokenService

  async verifyJWT(
    token: string,
  ): Promise<{ user: AuthUser | null; error: Error | null }> {
    return this.tokenService.verifyJWT(token);
  }

  async getSession() {
    return this.tokenService.getSession();
  }

  async refreshSession() {
    return this.tokenService.refreshSession();
  }

  async setSession(accessToken: string, refreshToken: string) {
    return this.tokenService.setSession(accessToken, refreshToken);
  }

  async getCurrentUser(): Promise<{
    user: AuthUser | null;
    error: Error | null;
  }> {
    return this.tokenService.getCurrentUser();
  }

  async verifyOtp(
    email: string,
    token: string,
    type: 'magiclink' | 'recovery',
  ) {
    return this.tokenService.verifyOtp(email, token, type);
  }

  // Permission Methods - Delegate to PermissionService

  async getUserWithRoles(
    userId: string,
  ): Promise<(User & { roles: RoleRecord[] }) | null> {
    return this.permissionService.getUserWithRoles(userId);
  }

  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
  ): Promise<UserRoleRecord> {
    return this.permissionService.assignRole(userId, roleId, assignedBy);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    return this.permissionService.removeRole(userId, roleId);
  }

  async checkPermission(userId: string, permission: string): Promise<boolean> {
    return this.permissionService.checkPermission(userId, permission);
  }

  async getUserPermissions(userId: string): Promise<Record<string, boolean>> {
    return this.permissionService.getUserPermissions(userId);
  }

  async getAllRoles(): Promise<RoleRecord[]> {
    return this.permissionService.getAllRoles();
  }

  async getRoleById(roleId: string): Promise<RoleRecord | null> {
    return this.permissionService.getRoleById(roleId);
  }

  async getRoleByName(name: string): Promise<RoleRecord | null> {
    return this.permissionService.getRoleByName(name);
  }

  async getUsersByRole(roleId: string): Promise<User[]> {
    return this.permissionService.getUsersByRole(roleId);
  }

  async userHasRole(userId: string, roleId: string): Promise<boolean> {
    return this.permissionService.userHasRole(userId, roleId);
  }

  async userHasAnyRole(userId: string, roleIds: string[]): Promise<boolean> {
    return this.permissionService.userHasAnyRole(userId, roleIds);
  }
}
