// ─── Generic wrappers ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  operatorId: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  operator: OperatorResponse;
}

export interface RefreshRequest {
  refreshToken: string;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationResponse {
  id: number;
  name: string;
  address?: string;
  disabled: boolean;
  mDate: string;
}

export interface LocationRequest {
  name: string;
  address?: string;
}

// ─── Operator ─────────────────────────────────────────────────────────────────

export const OPERATOR_TYPES: Record<number, string> = {
  1: 'Super Admin',
  2: 'All-Loc Admin',
  3: 'All-Loc Admin',
  4: 'Location Admin',
  5: 'Location Operator',
};

export interface OperatorResponse {
  id: string;
  name: string;
  email?: string;
  type: number;
  disabled: boolean;
  mDate: string;
}

export interface OperatorRequest {
  operatorId: string;
  password: string;
  name: string;
  email?: string;
  type: number;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

// ─── Cabinet ──────────────────────────────────────────────────────────────────

export interface CabinetResponse {
  id: number;
  locationId: number;
  name: string;
  mac: string;
  ip: string;
  subnetMask: string;
  gateway: string;
  serverIp?: string;
  serverURL?: string;
  disabled: boolean;
  registered: number;
  syncStatus: number;
  mDate: string;
}

export interface CabinetRequest {
  locationId: number;
  name: string;
  mac: string;
  ip: string;
  subnetMask: string;
  gateway: string;
  serverIp?: string;
  serverURL?: string;
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export const ASSET_TYPES: Record<number, string> = {
  1: 'Key',
  2: 'Key Bunch',
  3: 'Locker',
  4: 'TLD',
  5: 'DRD',
};

export interface AssetResponse {
  id: number;
  tagUid: number;
  number: number;
  name: string;
  shortKeyName?: string;
  details?: string;
  type: number;
  locationId?: number;
  withdrawPolicy?: number;
  returnWithin?: string;
  returnBefore?: string;
  fixedSlot?: number;
  disabled: boolean;
  mDate: string;
}

export interface AssetRequest {
  tagUid: number;
  number: number;
  name: string;
  shortKeyName?: string;
  details?: string;
  type: number;
  locationId: number;
  withdrawPolicy?: number;
  returnWithin?: string;
  returnBefore?: string;
  fixedSlot?: number;
}
