"use client";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import s from "./analytics-toolbar.module.css";

export type AnalyticsNavItem = { label: string; href?: string; active?: boolean; disabled?: boolean };
type Props = {
  section: string;
  items: AnalyticsNavItem[];
  from: string; to: string; channel: string;
  onFrom: (v: string) => void; onTo: (v: string) => void; onChannel: (v: string) => void;
  onApply: (event: FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  action?: ReactNode;
  children?: ReactNode;
};
export default function AnalyticsToolbar(p: Props) {
  // Navegación única: Clientes debe aparecer en todas las vistas de Analytics.
  // Evita duplicarlo en las vistas que ya lo declaran explícitamente.
  const items = p.items.some(item => item.href === "/gestion/analytics/clientes")
    ? p.items
    : [...p.items, { label: "Clientes", href: "/gestion/analytics/clientes" }];
  return <div className={s.toolbar}>
    <div className={s.identity}><span className={s.section}>{p.section}</span>
      <nav aria-label="Navegación Analytics" className={s.nav}>
        {items.map((item, i) => item.href && !item.disabled
          ? <Link key={i} href={item.href} aria-current={item.active ? "page" : undefined} className={item.active ? s.active : s.link}>{item.label}</Link>
          : <span key={i} className={s.disabled} title="Próximamente">{item.label}</span>)}
      </nav>
    </div>
    <form className={s.filters} onSubmit={p.onApply}>
      <label><span>Desde</span><input aria-label="Desde" type="date" required value={p.from} onChange={e=>p.onFrom(e.target.value)}/></label>
      <label><span>Hasta</span><input aria-label="Hasta" type="date" required value={p.to} onChange={e=>p.onTo(e.target.value)}/></label>
      <label><span>Canal</span><select aria-label="Canal" value={p.channel} onChange={e=>p.onChannel(e.target.value)}>
        <option value="">Todos</option><option value="local">Local</option><option value="shopify">Shopify</option>
        <option value="uber_eats">Uber Eats</option><option value="rappi">Rappi</option>
      </select></label>
      <button disabled={p.loading} type="submit">Aplicar</button>
    </form>
    {p.action && <div className={s.action}>{p.action}</div>}
    {p.children}
  </div>;
}
