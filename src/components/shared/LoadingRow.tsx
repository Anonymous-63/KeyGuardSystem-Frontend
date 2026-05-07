export default function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-16">
        <span className="loading loading-spinner loading-md text-primary" />
      </td>
    </tr>
  );
}
