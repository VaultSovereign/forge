import type { ReactNode } from 'react';

type QuickLink = {
  label: string;
  description: string;
  href: string;
  trailing?: ReactNode;
};

type QuickLinksProps = {
  title?: string;
  items: QuickLink[];
};

export default function QuickLinks({ title = 'Quick Links', items }: QuickLinksProps) {
  return (
    <div className="stack">
      <span className="section-anchor">Resources</span>
      <h3>{title}</h3>
      <div className="quick-links">
        {items.map((item) => (
          <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
            <div>
              <strong>{item.label}</strong>
              <p style={{ margin: '6px 0 0', color: '#475569' }}>{item.description}</p>
            </div>
            {item.trailing}
          </a>
        ))}
      </div>
    </div>
  );
}
