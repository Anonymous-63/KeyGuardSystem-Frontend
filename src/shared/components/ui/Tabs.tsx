interface TabDef {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="tabs tabs-bordered w-full border-b border-base-200 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab gap-1.5 ${active === tab.id ? 'tab-active font-semibold' : 'text-base-content/60'}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="badge badge-sm badge-primary ml-0.5">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
