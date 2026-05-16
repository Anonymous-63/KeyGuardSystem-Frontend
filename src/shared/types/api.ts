// ─── Generic wrappers ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  errorCode?: string;
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
  username: string;
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

export const LOCATION_ASSET_TYPES = {
  KEYS:    'Keys',
  TLDS:    'TLDs',
  LOCKERS: 'Lockers',
} as const;

export type LocationAssetType = keyof typeof LOCATION_ASSET_TYPES;

export const LOCATION_CABINET_TYPES = {
  SINGLE:     'Single',
  MULTI_SAME: 'Multi Same',
  MULTI_DIFF: 'Multi Different',
} as const;

export type LocationCabinetType = keyof typeof LOCATION_CABINET_TYPES;

export interface LocationResponse {
  id: number;
  name: string;
  assetType: number;
  assetTypeName?: LocationAssetType;
  cabinetType: number;
  cabinetTypeName?: LocationCabinetType;
  features?: string;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
}

export interface LocationRequest {
  name: string;
  assetType: LocationAssetType;
  cabinetType: LocationCabinetType;
  features?: string;
}

// ─── Location-Operator Mapping ────────────────────────────────────────────────

export interface LocationOperatorRequest {
  operatorId: number;
}

export interface LocationOperatorResponse {
  locationId: number;
  locationName?: string;
  operatorId: number;
  operatorName?: string;
  deleted: boolean;
  mdate?: string;
}

// ─── Role ─────────────────────────────────────────────────────────────────────

/** Must match RoleConstants.MAX_PERMISSION_LEVEL / MAX_ROLES in the backend. */
export const MAX_ROLES = 20;

/** Sentinel permission level for Super Admin — below the regular 1–MAX_ROLES range. */
export const SUPER_ADMIN_LEVEL = 0;

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissionLevel: number;
  systemRole: boolean;
  deleted: boolean;
}

export interface RoleRequest {
  name: string;
  description?: string;
  permissionLevel: number;
}

// ─── Operator ─────────────────────────────────────────────────────────────────

export const OPERATOR_TYPES: Record<number, string> = {
  1: 'Super Admin',
  2: 'DB Admin',
  3: 'All-Loc Admin',
  4: 'Location Admin',
  5: 'Location Operator',
};

export interface AssignedLocation {
  id: number;
  name: string;
}

export interface OperatorResponse {
  id: number;
  username: string;
  name: string;
  emailId?: string;
  mobileNo?: string;
  role?: Role;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  passChangedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  photoPath?: string;
  assignedLocations: AssignedLocation[];
}

export interface OperatorRequest {
  username?: string;
  password?: string;
  name: string;
  emailId?: string;
  mobileNo?: string;
  roleId?: number;
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
  subnetMask?: string;
  gateway?: string;
  serverIp?: string;
  serverUrl?: string;
  disabled: boolean;
  registered: boolean;
  syncStatus: number;
}

export interface CabinetRequest {
  locationId: number;
  name: string;
  mac: string;
  ip: string;
  subnetMask: string;
  gateway: string;
  serverIp?: string;
  serverUrl?: string;
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

// Backend enum: DAILY(1), WEEKLY(2), MONTHLY(3), INTERVAL(4)
export const TIME_CONSTRAINT_TYPES: Record<number, string> = {
  1: 'Daily',
  2: 'Weekly',
  3: 'Monthly',
  4: 'Interval',
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface TimeConstraintDetailRequest {
  day: number;
  name: string;
  startTime: string;
  endTime: string;
}

export interface TimeConstraintDetailResponse {
  day: number;
  name: string;
  startTime: string;
  endTime: string;
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

// User access type within a location assignment (stored in location_cabinet_users.type)
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
  emailId?: string;
  mobileCountryCode?: string;
  mobileNo?: string;
  landlineNo?: string;
  division?: string;
  designation?: string;
  address?: string;
  fp1?: number;
  fp2?: number;
  fingerModuleId?: number;
  disabled: boolean;
  passChangedAt?: string;
  mDate: string;
}

export interface CabinetUserRequest {
  id: string;
  name: string;
  shortId?: string;
  shortName?: string;
  cardUid?: number;
  pin?: string;
  emailId?: string;
  mobileCountryCode?: string;
  mobileNo?: string;
  landlineNo?: string;
  division?: string;
  designation?: string;
  address?: string;
}

// Location assignment for a cabinet user (from location_cabinet_users table)
export interface LocationAssignmentResponse {
  locationId: number;
  locationName?: string;
  userId: string;
  validFrom: string;
  validUpto?: string;
  individualAccess?: number;
  type?: number;
  shift?: number;
  disabled: boolean;
}

// Request to assign a user to a location
export interface AssignLocationRequest {
  locationId: number;
  validFrom: string;
  validUpto?: string;
  type?: number;
  individualAccess?: number;
  shift?: number;
}

// Cabinet assignment for a cabinet user (from user_cabinets table — MULTI_DIFF locations only)
export interface CabinetAssignmentResponse {
  cabinetId: number;
  cabinetName?: string;
  userId: string;
  validFrom: string;
  validUpto?: string;
  disabled: boolean;
}

export interface AssignCabinetRequest {
  cabinetId: number;
  validFrom: string;
  validUpto?: string;
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface RecentActivityItem {
  autoNo: number;
  assetName?: string;
  assetNumber?: number;
  issuedToName?: string;
  issuedAt: string;
  returnedAt?: string;
  expectedBefore?: string;
  status: 'OUT' | 'RETURNED' | 'OVERDUE';
}

export interface DashboardResponse {
  totalLocations: number;
  totalOperators: number;
  totalCabinets: number;
  totalAssets: number;
  totalCabinetUsers: number;
  totalAssetGroups: number;
  assetsOut: number;
  overdueCount: number;
  recentActivity: RecentActivityItem[];
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export interface OperatorAuditResponse {
  id: number;
  operatorId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
}

// ─── App Config ───────────────────────────────────────────────────────────────

export interface CaptchaConfig {
  enabled: boolean;
  captchaLength: number;
  captchaValiditySeconds: number;
}

export interface DbBackupConfigRes {
  enabled: boolean;
  backupTime: string;
  retentionDays: number;
}

export interface OrgConfigRes {
  orgName: string;
  orgLogoUrl?: string;
}

export interface SmtpConfigRes {
  smtpHost?: string;
  smtpPort?: number;
  smtpSocketFactoryClass?: string;
  smtpSocketFactoryPort?: number;
  smtpUsername?: string;
}

export interface SmsConfigRes {
  smppHost?: string;
  smppPort?: number;
  smppUserId?: string;
  smppTon?: number;
  smppNpi?: number;
}

export interface LdapConfigRes {
  enabled: boolean;
  secured: boolean;
  url?: string;
  userDnPath?: string;
  authType?: string;
  keystorePath?: string;
}

export interface OtherConfigRes {
  captchaConfig?: CaptchaConfig;
  twoStepAuth: boolean;
}

export interface AppConfigRes {
  organization?: OrgConfigRes;
  smtp?: SmtpConfigRes;
  sms?: SmsConfigRes;
  ldap?: LdapConfigRes;
  other?: OtherConfigRes;
  dbBackup?: DbBackupConfigRes;
}

export interface PublicOrgConfigRes {
  orgName: string;
  orgLogoUrl?: string;
  captchaEnabled: boolean;
  twoStepAuth: boolean;
}

// Update request types
export interface OrgConfigUpdateReq {
  orgName: string;
  orgLogo?: File;
}

export interface SmtpConfigUpdateReq {
  smtpHost?: string;
  smtpPort?: number;
  smtpSocketFactoryClass?: string;
  smtpSocketFactoryPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
}

export interface SmsConfigUpdateReq {
  smppHost?: string;
  smppPort?: number;
  smppUserId?: string;
  smppUserPass?: string;
  smppTon?: number;
  smppNpi?: number;
}

export interface LdapConfigUpdateReq {
  enabled?: boolean;
  secured?: boolean;
  url?: string;
  userDnPath?: string;
  authType?: string;
  keystorePath?: string;
  keystorePass?: string;
}

export interface OtherConfigUpdateReq {
  captchaConfig?: CaptchaConfig;
  twoStepAuth?: boolean;
}

export interface DbBackupConfigUpdateReq {
  enabled?: boolean;
  backupTime?: string;
  retentionDays?: number;
}

export interface OperatorPhotoUploadResponse {
  photoPath: string;
}

// Legacy alias kept for any remaining references — remove after full frontend migration
export type AppConfigResponse = AppConfigRes;
export type AppConfigUpdateRequest = SmtpConfigUpdateReq;

// ─── ABAC Policy ──────────────────────────────────────────────────────────────

export type PolicyEffect = 'PERMIT' | 'DENY';

export interface PolicyResponse {
  id: string;
  name: string;
  description?: string;
  resourceType?: string;   // null = any
  action?: string;         // null = any
  effect: PolicyEffect;
  priority: number;
  version: number;
  active: boolean;
  conditionExpr: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRequest {
  name: string;
  description?: string;
  resourceType?: string;
  action?: string;
  effect: PolicyEffect;
  priority: number;
  conditionExpr: string;
  changeReason?: string;
}

export interface PolicyVersionResponse {
  id: string;
  policyId: string;
  version: number;
  conditionExpr: string;
  effect: PolicyEffect;
  active: boolean;
  changedBy?: string;
  changeReason?: string;
  createdAt: string;
}

export interface EvaluateRequest {
  resourceType: string;
  resourceId?: string;
  action: string;
  subjectPermissionLevel?: number;
  subjectLocationIds?: number[];
  subjectAccountStatus?: string;
  resourceLocationId?: number;
}

export interface EvaluateResult {
  decision: 'PERMIT' | 'DENY' | 'INDETERMINATE';
  matchedPolicy?: string;
  reason?: string;
  resourceType: string;
  action: string;
  effectivePermissionLevel?: number;
  isDeny: boolean;
}

export interface PolicyListParams {
  resourceType?: string;
  action?: string;
  effect?: string;
  active?: boolean;
  page?: number;
  size?: number;
}

export interface ResourcePermission {
  resource: string;
  actions: string[];
}

export interface MePermissionsResponse {
  isSuperAdmin: boolean;
  permissions: ResourcePermission[];
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export type AuditOutcome  = 'SUCCESS' | 'FAILURE' | 'ERROR';
export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditCategory = 'AUTH' | 'DATA' | 'SECURITY' | 'CONFIG' | 'SYSTEM';
export type AccessDecision = 'PERMIT' | 'DENY' | 'INDETERMINATE';

export interface AuditActivityRecord {
  id: number;
  operatorId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  detail?: string;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  category: AuditCategory;
  ipAddress?: string;
  createdAt: string;
}

export interface AccessAuditRecord {
  id: string;
  operatorId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  decision: AccessDecision;
  policyId?: string;
  policyName?: string;
  denyReason?: string;
  locationId?: number;
  clientIp?: string;
  sessionId?: string;
  riskScore?: number;
  createdAt: string;
}

export interface AuditStats {
  totalActivity: number;
  totalAccess: number;
  todayActivity: number;
  todayAccess: number;
  failureCount: number;
  errorCount: number;
  criticalCount: number;
  deniedCount: number;
  uniqueActors: number;
}

export interface AuditActivityParams {
  operatorId?: string;
  action?: string;
  resourceType?: string;
  outcome?: string;
  severity?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface AccessAuditParams {
  operatorId?: string;
  decision?: string;
  resourceType?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

