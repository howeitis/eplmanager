export function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="plm-text-center plm-bg-warm-50 plm-rounded-lg plm-py-2.5 plm-px-2">
      <div className="plm-text-[10px] plm-text-warm-400 plm-uppercase plm-tracking-wide">{label}</div>
      <div className="plm-text-lg plm-font-bold plm-text-charcoal plm-tabular-nums">{value}</div>
    </div>
  );
}
