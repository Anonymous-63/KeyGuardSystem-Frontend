interface Props {
  disabled: boolean;
  activeLabel?: string;
  disabledLabel?: string;
}

export default function StatusBadge({ disabled, activeLabel = 'Active', disabledLabel = 'Disabled' }: Props) {
  return (
    <span className={`badge badge-sm ${disabled ? 'badge-error' : 'badge-success'}`}>
      {disabled ? disabledLabel : activeLabel}
    </span>
  );
}
