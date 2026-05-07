import { useListLocationsQuery } from '../features/location/locationApi';
import { useListOperatorsQuery } from '../features/operator/operatorApi';
import { useListCabinetsQuery } from '../features/cabinet/cabinetApi';
import { useListAssetsQuery } from '../features/asset/assetApi';

function StatCard({ label, value, icon, color }: {
  label: string; value?: number; icon: string; color: string;
}) {
  return (
    <div className={`card bg-base-100 shadow border-l-4 ${color}`}>
      <div className="card-body py-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base-content/50 text-sm">{label}</p>
            <p className="text-3xl font-bold mt-1">
              {value === undefined ? <span className="loading loading-dots loading-sm" /> : value}
            </p>
          </div>
          <span className="text-3xl opacity-60">{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: locations } = useListLocationsQuery({});
  const { data: operators } = useListOperatorsQuery({});
  const { data: cabinets } = useListCabinetsQuery({});
  const { data: assets } = useListAssetsQuery({});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Locations" value={locations?.totalElements} icon="📍" color="border-primary" />
        <StatCard label="Operators" value={operators?.totalElements} icon="👤" color="border-secondary" />
        <StatCard label="Cabinets" value={cabinets?.totalElements} icon="🗄️" color="border-accent" />
        <StatCard label="Assets" value={assets?.totalElements} icon="🔑" color="border-success" />
      </div>

      <div className="mt-8 card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-base">Quick Navigation</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { to: '/locations', label: 'Manage Locations', icon: '📍' },
              { to: '/operators', label: 'Manage Operators', icon: '👤' },
              { to: '/cabinets',  label: 'Manage Cabinets',  icon: '🗄️' },
              { to: '/assets',    label: 'Manage Assets',    icon: '🔑' },
            ].map(({ to, label, icon }) => (
              <a key={to} href={to} className="btn btn-outline btn-sm gap-1">
                {icon} {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
