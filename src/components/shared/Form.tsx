import {
  useId,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

// ─── Internal wrapper shared by all field types ──────────────────────────────

interface FieldWrapProps {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  children: ReactNode;
}

function FieldWrap({ label, id, required, error, hint, wrapperClassName, children }: FieldWrapProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName ?? ''}`}>
      <label htmlFor={id} className="text-sm font-medium text-base-content/75 leading-none select-none">
        {label}
        {required && <span aria-hidden="true" className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs text-error leading-tight">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-base-content/45 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── FormField ───────────────────────────────────────────────────────────────

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
  wrapperClassName?: string;
}

export function FormField({
  label, id: propId, error, hint, mono, required, wrapperClassName, ...inputProps
}: FormFieldProps) {
  const uid = useId();
  const id = propId ?? uid;
  return (
    <FieldWrap label={label} id={id} required={required} error={error} hint={hint} wrapperClassName={wrapperClassName}>
      <input
        id={id}
        className={[
          'input input-bordered w-full',
          mono ? 'font-mono' : '',
          error ? 'input-error' : '',
        ].filter(Boolean).join(' ')}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...inputProps}
      />
    </FieldWrap>
  );
}

// ─── FormSelect ──────────────────────────────────────────────────────────────

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  children: ReactNode;
}

export function FormSelect({
  label, id: propId, error, hint, required, wrapperClassName, children, ...selectProps
}: FormSelectProps) {
  const uid = useId();
  const id = propId ?? uid;
  return (
    <FieldWrap label={label} id={id} required={required} error={error} hint={hint} wrapperClassName={wrapperClassName}>
      <select
        id={id}
        className={[
          'select select-bordered w-full',
          error ? 'select-error' : '',
        ].filter(Boolean).join(' ')}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...selectProps}
      >
        {children}
      </select>
    </FieldWrap>
  );
}

// ─── FormTextarea ────────────────────────────────────────────────────────────

interface FormTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function FormTextarea({
  label, id: propId, error, hint, required, wrapperClassName, ...textareaProps
}: FormTextareaProps) {
  const uid = useId();
  const id = propId ?? uid;
  return (
    <FieldWrap label={label} id={id} required={required} error={error} hint={hint} wrapperClassName={wrapperClassName}>
      <textarea
        id={id}
        className={[
          'textarea textarea-bordered w-full',
          error ? 'textarea-error' : '',
        ].filter(Boolean).join(' ')}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...textareaProps}
      />
    </FieldWrap>
  );
}

// ─── FormGrid ────────────────────────────────────────────────────────────────

export function FormGrid({
  cols = 2, children,
}: {
  cols?: 1 | 2 | 3;
  children: ReactNode;
}) {
  const colCls = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[cols];
  return <div className={`grid grid-cols-1 ${colCls} gap-4`}>{children}</div>;
}

// ─── FormSection ─────────────────────────────────────────────────────────────

export function FormSection({
  title, children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-base-content/35 whitespace-nowrap">
            {title}
          </span>
          <div className="flex-1 h-px bg-base-200" />
        </div>
      )}
      {children}
    </div>
  );
}

// ─── FormActions ─────────────────────────────────────────────────────────────

interface FormActionsProps {
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  danger?: boolean;
}

export function FormActions({
  onCancel,
  loading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  disabled = false,
  danger = false,
}: FormActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-base-200">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onCancel}
        disabled={loading}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className={`btn ${danger ? 'btn-error' : 'btn-primary'} min-w-24`}
        disabled={loading || disabled}
      >
        {loading && <span className="loading loading-spinner loading-xs" />}
        {submitLabel}
      </button>
    </div>
  );
}
