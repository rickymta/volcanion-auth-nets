export interface Account {
  id: number;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: Date;
  gender?: 'male' | 'female' | 'other';
  avatar_url?: string;
  is_verified: boolean;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  created_at: Date;
}

export interface GrantPermission {
  id: number;
  account_id: number;
  role_permission_id: number;
  granted_by?: number;
  granted_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

export interface RefreshToken {
  id: number;
  account_id: number;
  token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
  device_info?: string;
  ip_address?: string;
  created_at: Date;
}

export interface PasswordReset {
  id: number;
  account_id: number;
  token_hash: string;
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

export interface EmailVerification {
  id: number;
  account_id: number;
  token_hash: string;
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

// DTOs
export interface RegisterDto {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateAccountDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  new_password: string;
}

export interface TokenPayload {
  accountId: number;
  email: string;
  permissions?: string[];
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface AccountWithPermissions extends Omit<Account, 'password'> {
  permissions: string[];
  roles: string[];
}

export interface UserPermissionCheck {
  accountId: number;
  resource: string;
  action: string;
}
