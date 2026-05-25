type Props = { hit: boolean };

export function HitMissBadge({ hit }: Props) {
  const classes = hit ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white';
  const label = hit ? 'HIT' : 'FALTA';

  return (
    <span className={`inline-flex items-center rounded px-3 py-1 text-sm font-bold ${classes}`}>
      {label}
    </span>
  );
}
