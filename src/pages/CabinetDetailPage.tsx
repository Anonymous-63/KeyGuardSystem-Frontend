import { useParams, useNavigate } from 'react-router-dom';
import { useGetCabinetQuery, useGetCabinetMatrixQuery } from '../features/cabinet/cabinetApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import { useListCabinetTransactionsQuery } from '../features/transaction/transactionApi';
import type { CabinetMatrixResponse } from '../types/api';
import LoadingRow from '../components/shared/LoadingRow';
import StatusBadge from '../components/shared/StatusBadge';

const REGISTERED_LABEL = (registered: boolean) =>
  registered
    ? { label: 'Registered',   cls: 'badge-success' }
    : { label: 'Unregistered', cls: 'badge-warning' };

const SYNC_STATUS_LABELS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Pending',    cls: 'badge-neutral' },
  1: { label: 'Synced',     cls: 'badge-success' },
  2: { label: 'Out of Sync', cls: 'badge-warning' },
  3: { label: 'Sync Error', cls: 'badge-error' },
};

const SLOT_STATUS_COLORS: Record<number, string> = {
  0: 'bg-base-200 border-base-300 text-base-content/40',      // empty
  1: 'bg-success/10 border-success/30 text-success-content',  // asset present
  2: 'bg-warning/10 border-warning/40 text-warning-content',  // asset out
};

const SLOT_STATUS_LABELS: Record<number, string> = {
  0: 'Empty',
  1: 'In Cabinet',
  2: 'Checked Out',
};

function SlotCard({ slot }: { slot: CabinetMatrixResponse }) {
  const colorClass = SLOT_STATUS_COLORS[slot.status] ?? SLOT_STATUS_COLORS[0];
  return (
    <div className={`border rounded-lg p-2 text-center transition-all hover:shadow-sm ${colorClass}`}>
      <div className="text-xs font-mono text-base-content/40 mb-0.5">#{slot.slot}</div>
      {slot.assetName ? (
        <>
          <div className="text-xs font-semibold leading-tight truncate">{slot.assetName}</div>
          {slot.assetNumber && (
            <div className="text-xs text-base-content/50">#{slot.assetNumber}</div>
          )}
          <div className={`text-xs mt-1 font-medium ${slot.status === 2 ? 'text-warning' : 'text-success'}`}>
            {SLOT_STATUS_LABELS[slot.status]}
          </div>
        </>
      ) : (
        <div className="text-xs text-base-content/30 italic">—</div>
      )}
    </div>
  );
}

function MatrixLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {Object.entries(SLOT_STATUS_LABELS).map(([status, label]) => (
        <div key={status} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded border ${
            status === '0' ? 'bg-base-200 border-base-300' :
            status === '1' ? 'bg-success/20 border-success/40' :
            'bg-warning/20 border-warning/40'
          }`} />
          <span className="text-base-content/60">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function CabinetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cabinetId = Number(id);
  const navigate = useNavigate();

  const { data: cabinet, isLoading: loadingCabinet } = useGetCabinetQuery(cabinetId, { skip: !cabinetId });
  const { data: matrix, isLoading: loadingMatrix } = useGetCabinetMatrixQuery(cabinetId, { skip: !cabinetId });
  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data: recentTx, isLoading: loadingTx } = useListCabinetTransactionsQuery(
    { cabinetId, size: 10 },
    { skip: !cabinetId }
  );

  const locationName = (locId: number) =>
    locations?.content.find((l) => l.id === locId)?.name ?? `#${locId}`;

  if (loadingCabinet) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!cabinet) {
    return (
      <div className="text-center py-24">
        <p className="text-base-content/40">Cabinet not found.</p>
        <button className="btn btn-ghost mt-4" onClick={() => navigate('/cabinets')}>← Back</button>
      </div>
    );
  }

  // Compute matrix stats
  const totalSlots = matrix?.length ?? 0;
  const occupiedSlots = matrix?.filter((s) => s.status === 1).length ?? 0;
  const checkedOutSlots = matrix?.filter((s) => s.status === 2).length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="text-sm breadcrumbs">
        <ul>
          <li><button className="link link-hover" onClick={() => navigate('/cabinets')}>Cabinets</button></li>
          <li>{cabinet.name}</li>
        </ul>
      </div>

      {/* Header card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{cabinet.name}</h1>
                <StatusBadge disabled={cabinet.disabled} />
              </div>
              <p className="text-base-content/50 text-sm mt-0.5">
                {locationName(cabinet.locationId)}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cabinets')}>
                ← Back
              </button>
            </div>
          </div>

          <div className="divider my-2" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">IP Address</p>
              <p className="font-mono font-medium">{cabinet.ip}</p>
            </div>
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">MAC Address</p>
              <p className="font-mono">{cabinet.mac}</p>
            </div>
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Subnet Mask</p>
              <p className="font-mono">{cabinet.subnetMask}</p>
            </div>
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Gateway</p>
              <p className="font-mono">{cabinet.gateway}</p>
            </div>
            {cabinet.serverIp && (
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Server IP</p>
                <p className="font-mono">{cabinet.serverIp}</p>
              </div>
            )}
            {cabinet.serverUrl && (
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Server URL</p>
                <p className="text-xs truncate">{cabinet.serverUrl}</p>
              </div>
            )}
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Registration</p>
              <span className={`badge badge-sm ${REGISTERED_LABEL(cabinet.registered).cls}`}>
                {REGISTERED_LABEL(cabinet.registered).label}
              </span>
            </div>
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Sync Status</p>
              <span className={`badge badge-sm ${(SYNC_STATUS_LABELS[cabinet.syncStatus] ?? SYNC_STATUS_LABELS[0]).cls}`}>
                {(SYNC_STATUS_LABELS[cabinet.syncStatus] ?? SYNC_STATUS_LABELS[0]).label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix section */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="card-title text-base">Slot Matrix</h2>
              {matrix && (
                <div className="flex gap-4 text-sm mt-1">
                  <span className="text-success">{occupiedSlots} in cabinet</span>
                  <span className="text-warning">{checkedOutSlots} checked out</span>
                  <span className="text-base-content/40">{totalSlots - occupiedSlots - checkedOutSlots} slots available</span>
                </div>
              )}
            </div>
            <MatrixLegend />
          </div>

          {loadingMatrix ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : !matrix || matrix.length === 0 ? (
            <div className="text-center py-12 text-base-content/40">
              <p className="text-3xl mb-2">🗄️</p>
              <p>No matrix data available. Cabinet may not be registered.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
              {matrix
                .slice()
                .sort((a, b) => a.slot - b.slot)
                .map((slot) => (
                  <SlotCard key={slot.slot} slot={slot} />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-base">Recent Activity</h2>
          {loadingTx ? (
            <table className="table"><tbody><LoadingRow colSpan={4} /></tbody></table>
          ) : !recentTx?.content.length ? (
            <p className="text-sm text-base-content/40 py-4">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>User</th>
                    <th>Datetime</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.content.map((tx) => (
                    <tr key={tx.autoNo}>
                      <td className="font-mono text-xs text-base-content/50">{tx.autoNo}</td>
                      <td className="text-sm">{tx.transactionType}</td>
                      <td className="text-sm">{tx.userName ?? tx.userId ?? '—'}</td>
                      <td className="text-xs text-base-content/60">
                        {new Date(tx.datetime).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {recentTx && recentTx.totalElements > 10 && (
            <div className="mt-2">
              <button className="btn btn-ghost btn-sm text-primary"
                onClick={() => navigate('/transactions')}>
                View all transactions →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
