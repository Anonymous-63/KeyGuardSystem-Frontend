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

// ─── Location-Operator Mapping ────────────────────────────────────────────────

export interface LocationOperatorRequest {
  operatorId: string;
}

export interface LocationOperatorResponse {
  operatorId: string;
  operatorName: string;
  locationId: number;
  mDate: string;
}

// ─── Operator ─────────────────────────────────────────────────────────────────

export const OPERATOR_TYPES: Record<number, string> = {
  1: 'Super Admin',
  2: 'DB Admin',
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

export interface CabinetMatrixResponse {
  slot: number;
  assetId?: number;
  assetName?: string;
  assetNumber?: number;
  status: number;
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

// ─── Asset Group ──────────────────────────────────────────────────────────────

export interface AssetGroupResponse {
  id: number;
  name: string;
  locationId: number;
  assetIds: number[];
  disabled: boolean;
  mDate: string;
}

export interface AssetGroupRequest {
  name: string;
  locationId: number;
}

// ─── Time Constraint ──────────────────────────────────────────────────────────

export const TIME_CONSTRAINT_TYPES: Record<number, string> = {
  0: 'Fixed Range',
  1: 'Weekly Schedule',
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface TimeConstraintDetailRequest {
  day: number;
  name: string;
  fromTime: string;
  toTime: string;
}

export interface TimeConstraintDetailResponse {
  id?: number;
  day: number;
  name: string;
  fromTime: string;
  toTime: string;
}

export interface TimeConstraintRequest {
  name: string;
  locationId: number;
  type: number;
  fromDate?: string;
  toDate?: string;
  details: TimeConstraintDetailRequest[];
}

export interface TimeConstraintResponse {
  id: number;
  name: string;
  locationId: number;
  type: number;
  fromDate?: string;
  toDate?: string;
  details: TimeConstraintDetailResponse[];
  disabled: boolean;
  mDate: string;
}

// ─── Cabinet User ─────────────────────────────────────────────────────────────

export const CABINET_USER_TYPES: Record<number, string> = {
  0: 'User',
  1: 'Admin',
  2: 'Authorizer',
  3: 'All-Key User',
};

export interface CabinetUserResponse {
  id: string;
  name: string;
  shortId?: string;
  shortName?: string;
  cardUid?: number;
  type: number;
  email?: string;
  mobileNo?: string;
  division?: string;
  designation?: string;
  validFrom?: string;
  validUpto?: string;
  disabled: boolean;
  mDate: string;
}

export interface CabinetUserRequest {
  userId: string;
  name: string;
  shortId?: string;
  shortName?: string;
  cardUid?: number;
  pin?: string;
  type: number;
  email?: string;
  mobileNo?: string;
  division?: string;
  designation?: string;
  address?: string;
  validFrom?: string;
  validUpto?: string;
}

export interface AssignLocationRequest {
  locationId: number;
}

// ─── User Assignments ─────────────────────────────────────────────────────────

export interface UserAssetRequest {
  userId: string;
  assetId: number;
  locationId: number;
}

export interface UserAssetResponse {
  userId: string;
  assetId: number;
  locationId: number;
  assetName?: string;
  assetNumber?: number;
}

export interface UserTimeConstraintRequest {
  userId: string;
  timeConstraintId: number;
}

export interface UserTimeConstraintResponse {
  userId: string;
  timeConstraintId: number;
  constraintName?: string;
}

export interface UserAssetGroupRequest {
  userId: string;
  groupId: number;
  locationId: number;
}

export interface UserAssetGroupResponse {
  userId: string;
  groupId: number;
  locationId: number;
  groupName?: string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface AssetTransactionResponse {
  autoNo: number;
  assetId: number;
  assetNumber?: number;
  assetName?: string;
  issuedAt: string;
  issuedFrom: number;
  issuedFromName?: string;
  issuedTo: string;
  issuedToName?: string;
  expectedBefore?: string;
  returnedAt?: string;
  returnedTo?: number;
  returnedToName?: string;
  returnedPosition?: number;
  returnedBy?: string;
  returnedByName?: string;
  extra?: string;
  overdueMinutes?: number;
}

export interface AssetTransactionWriteRequest {
  assetId: number;
  assetNumber: number;
  assetName?: string;
  issuedAt?: string;
  issuedFrom: number;
  issuedTo: string;
  expectedBefore?: string;
  extra?: string;
}

export interface AssetReturnRequest {
  returnedAt?: string;
  returnedTo?: number;
  returnedToName?: string;
  returnedPosition?: number;
  returnedBy?: string;
  returnedByName?: string;
}

export interface CabinetTransactionResponse {
  autoNo: number;
  cabinetId: number;
  cabinetName?: string;
  transactionType: number;
  userId?: string;
  userName?: string;
  assetId?: number;
  assetName?: string;
  slot?: number;
  datetime: string;
  extra?: string;
}
