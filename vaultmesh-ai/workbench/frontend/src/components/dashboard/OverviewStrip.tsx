export type OverviewItem = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'ok' | 'alert';
};

type OverviewStripProps = {
  items: OverviewItem[];
};

export default function OverviewStrip({ items }: OverviewStripProps) {
  return (
    <div className="overview-grid">
      {items.map((item) => {
        const toneClass =
          item.tone === 'ok' ? 'overview-card overview-card--ok' : item.tone === 'alert' ? 'overview-card overview-card--alert' : 'overview-card';

        return (
          <article key={item.label} className={toneClass}>
            <span className="overview-card__label">{item.label}</span>
            <span className="overview-card__value">{item.value}</span>
            {item.hint ? <span className="overview-card__hint">{item.hint}</span> : null}
          </article>
        );
      })}
    </div>
  );
}
