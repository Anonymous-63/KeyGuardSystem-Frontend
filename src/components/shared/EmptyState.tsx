interface Props {
  icon?: string;
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  colSpan?: number;
}

export default function EmptyState({
  icon = '📭',
  title = 'No results',
  message,
  action,
  colSpan,
}: Props) {
  const inner = (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <span className="text-4xl opacity-30">{icon}</span>
      <p className="font-medium text-base-content/60">{title}</p>
      {message && <p className="text-sm text-base-content/40">{message}</p>}
      {action && (
        <button className="btn btn-primary btn-sm mt-2" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );

  if (colSpan !== undefined) {
    return <tr><td colSpan={colSpan}>{inner}</td></tr>;
  }
  return inner;
}
