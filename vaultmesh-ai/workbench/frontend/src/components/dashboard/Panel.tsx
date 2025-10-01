import type { ReactNode } from 'react';

export type PanelProps = {
  id?: string;
  title: string;
  description?: string;
  label?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Panel({ id, title, description, label, actions, children }: PanelProps) {
  return (
    <section id={id} className="panel">
      <div className="panel__header">
        <div>
          <span className="section-anchor">{label ?? 'Section'}</span>
          <h2 className="panel__title">{title}</h2>
          {description ? <p className="panel__description">{description}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </div>
      <div className="panel__body">{children}</div>
    </section>
  );
}
