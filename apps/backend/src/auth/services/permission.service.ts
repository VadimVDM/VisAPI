import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import {
  User,
  RoleRecord,
  UserRoleRecord,
  InsertUserRole,
} from '@visapi/shared-types';

interface UserRoleWithUser {
  users: User;
}

/**
 * Service for handling authorization and permission management
 * Manages roles, permissions, and access control
 */
@Injectable()
export class PermissionService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Gets a user with all their associated roles
   */
  async getUserWithRoles(
    userId: string,
  ): Promise<(User & { roles: RoleRecord[] }) | null> {
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .select(
        `
        *,
        user_roles!inner(
          roles(*)
        )
      `,
      )
      .eq('id', userId)
      .single<{ user_roles: { roles: RoleRecord }[] } & User>();

    if (error) {
      return null;
    }

    // Transform the nested structure
    const roles = data.user_roles.map((ur) => ur.roles);
    const userWithRoles = { ...data, roles };

    return userWithRoles;
  }

  /**
   * Assigns a role to a user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
  ): Promise<UserRoleRecord> {
    const userRoleData: InsertUserRole = {
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy,
    };

    const { data, error } = await this.supabase.serviceClient
      .from('user_roles')
      .insert(userRoleData)
      .select()
      .single<UserRoleRecord>();

    if (error) {
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    return data;
  }

  /**
   * Removes a role from a user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const { error } = await this.supabase.serviceClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) {
      throw new Error(`Failed to remove role: ${error.message}`);
    }
  }

  /**
   * Checks if a user has a specific permission
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const userWithRoles = await this.getUserWithRoles(userId);
    if (!userWithRoles) {
      return false;
    }

    return userWithRoles.roles.some(
      (role) => role.permissions[permission] === true,
    );
  }

  /**
   * Gets all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Record<string, boolean>> {
    const userWithRoles = await this.getUserWithRoles(userId);
    if (!userWithRoles) {
      return {};
    }

    // Merge all permissions from all roles
    const permissions: Record<string, boolean> = {};
    userWithRoles.roles.forEach((role) => {
      Object.entries(role.permissions).forEach(([key, value]) => {
        // If any role grants the permission, it's granted
        if (value === true) {
          permissions[key] = true;
        }
      });
    });

    return permissions;
  }

  /**
   * Gets all available roles
   */
  async getAllRoles(): Promise<RoleRecord[]> {
    const { data, error } = await this.supabase.serviceClient
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    return (data as RoleRecord[]) || [];
  }

  /**
   * Gets a specific role by ID
   */
  async getRoleById(roleId: string): Promise<RoleRecord | null> {
    const { data, error } = await this.supabase.serviceClient
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single<RoleRecord>();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Gets a role by name
   */
  async getRoleByName(name: string): Promise<RoleRecord | null> {
    const { data, error } = await this.supabase.serviceClient
      .from('roles')
      .select('*')
      .eq('name', name)
      .single<RoleRecord>();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Gets all users with a specific role
   */
  async getUsersByRole(roleId: string): Promise<User[]> {
    const { data, error } = await this.supabase.serviceClient
      .from('user_roles')
      .select(
        `
        users!user_roles_user_id_fkey(*)
      `,
      )
      .eq('role_id', roleId);

    if (error) {
      throw new Error(`Failed to fetch users by role: ${error.message}`);
    }

    // Type the response properly
    type UserRoleWithUserData = { users: User | null };
    const typedData = data as UserRoleWithUserData[] | null;
    
    return typedData?.map((ur) => ur.users).filter(Boolean) as User[] || [];
  }

  /**
   * Checks if a user has a specific role
   */
  async userHasRole(userId: string, roleId: string): Promise<boolean> {
    const { data, error } = await this.supabase.serviceClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .single();

    return !error && !!data;
  }

  /**
   * Checks if a user has any of the specified roles
   */
  async userHasAnyRole(userId: string, roleIds: string[]): Promise<boolean> {
    const { data, error } = await this.supabase.serviceClient
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .in('role_id', roleIds);

    return !error && data && data.length > 0;
  }
}