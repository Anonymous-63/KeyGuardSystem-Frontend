interface Props {
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalElements, size, onPageChange }: Props) {
  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
      <span className="text-sm text-base-content/60">
        {totalElements > 0 ? `${from}–${to} of ${totalElements}` : 'No records'}
      </span>
      <div className="join">
        <button
          className="join-item btn btn-sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          «
        </button>
        <button className="join-item btn btn-sm btn-disabled">
          {page + 1} / {totalPages || 1}
        </button>
        <button
          className="join-item btn btn-sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          »
        </button>
      </div>
    </div>
  );
}
