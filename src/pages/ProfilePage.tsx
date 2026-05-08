import { useState } from 'react';
import { useAppSelector } from '../app/hooks';
import { useChangePasswordMutation, useListLocationsForOperatorQuery } from '../features/operator/operatorApi';
import { OPERATOR_TYPES } from '../types/api';
import { clearanceFromType } from '../features/auth/permissions';
import { FormField } from '../components/shared/Form';

function ChangePasswordForm({ operatorId }: { operatorId: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changePassword, { isLoading, isSuccess, isError, error }] = useChangePasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) return;
    await changePassword({ id: operatorId, body: { currentPassword, newPassword } });
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <FormField type="password" label="Current Password" value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)} required />
      <FormField type="password" label="New Password" value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
      <FormField type="password" label="Confirm New Password" value={confirm}
        onChange={(e) => setConfirm(e.target.value)} required
        error={confirm && confirm !== newPassword ? 'Passwords do not match' : undefined} />
      {isSuccess && (
        <div className="alert alert-success text-sm py-2">
          <span>Password changed successfully.</span>
        </div>
      )}
      {isError && (
        <div className="alert alert-error text-sm py-2">
          <span>{(error as { data?: { message?: string } })?.data?.message ?? 'Failed to change password.'}</span>
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading || newPassword !== confirm}>
        {isLoading && <span className="loading loading-spinner loading-xs" />}
        Change Password
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const operator = useAppSelector((s) => s.auth.operator);
  const { data: locations } = useListLocationsForOperatorQuery(operator?.id ?? '', { skip: !operator });

  if (!operator) return null;

  const clearance = clearanceFromType(operator.type);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Identity card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-16">
                <span className="text-2xl font-bold">
                  {operator.name?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{operator.name}</h2>
              <p className="text-base-content/60 font-mono text-sm">{operator.id}</p>
              {operator.email && <p className="text-sm mt-1">{operator.email}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="badge badge-primary">
                  {OPERATOR_TYPES[operator.type] ?? `Type ${operator.type}`}
                </span>
                <span className="badge badge-neutral">
                  Clearance Level {clearance}
                </span>
              </div>
            </div>
          </div>

          <div className="divider my-2" />

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-base-content/60">Operator ID</span>
              <span className="font-mono font-medium">{operator.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Role</span>
              <span className="font-medium">{OPERATOR_TYPES[operator.type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Email</span>
              <span>{operator.email ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Clearance</span>
              <span className="font-medium">{clearance} / 5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Status</span>
              <span className={operator.disabled ? 'text-error' : 'text-success'}>
                {operator.disabled ? 'Disabled' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned locations */}
      {locations && locations.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-base">Assigned Locations</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {locations.map((loc) => (
                <span key={loc.locationId} className="badge badge-outline gap-1">
                  📍 {loc.locationName ?? `Location #${loc.locationId}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Change password */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">Change Password</h3>
          <ChangePasswordForm operatorId={operator.id} />
        </div>
      </div>
    </div>
  );
}
