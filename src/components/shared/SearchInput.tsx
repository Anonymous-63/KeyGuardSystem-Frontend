import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export default function SearchInput({
  value, onChange, placeholder = 'Search…', debounceMs = 300, className = '',
}: Props) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), debounceMs);
  };

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none">
        <Search size={14} strokeWidth={1.5} />
      </span>
      <input
        className="input input-bordered input-sm pl-9 w-full"
        placeholder={placeholder}
        value={local}
        onChange={(e) => handleChange(e.target.value)}
      />
      {local && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
          onClick={() => handleChange('')}
          type="button"
        >✕</button>
      )}
    </div>
  );
}
