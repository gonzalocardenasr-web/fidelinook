"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const qs = new URLSearchParams({ from: p.from, to: p.to });
  if (p.channel) qs.set("channel", p.channel);
  const query = qs.toString();
  const inGlobal = pathname.startsWith("/gestion/analytics/global");
  const inCustomers = pathname.startsWith("/gestion/analytics/clientes");
  const inSales = pathname.startsWith("/gestion/analytics/comercial/ventas");
  const primary = [
    { label: "Resumen", href: "/gestion/analytics" },
    { label: "Ventas", href: "/gestion/analytics/comercial/ventas" },
    { label: "Productos", href: "/gestion/analytics/comercial/productos" },
    { label: "Sabores", href: "/gestion/analytics/comercial/sabores" },
    { label: "Clientes", href: "/gestion/analytics/clientes" },
    { label: "Global", href: "/gestion/analytics/global" },
  ];
  const subpages = inCustomers ? [
    { label: "Base", href: "/gestion/analytics/clientes" },
    { label: "Ranking", href: "/gestion/analytics/clientes/ranking" },
    { label: "Segmentación", href: "/gestion/analytics/clientes/segmentacion" },
  ] : inSales ? [
    { label: "Evolución", href: "/gestion/analytics/comercial/ventas" },
    { label: "Temporalidad", href: "/gestion/analytics/comercial/ventas/temporalidad" },
    { label: "Canales", href: "/gestion/analytics/comercial/ventas/canales" },
  ] : inGlobal ? [
    { label: "Evolución", href: "/gestion/analytics/global" },
    { label: "Canales", href: "/gestion/analytics/global/canales" },
  ] : [];
  const items = primary.map(item => ({ ...item, active: pathname === item.href ||
    (item.label === "Ventas" && inSales) || (item.label === "Clientes" && inCustomers) || (item.label === "Global" && inGlobal) }));
  return <>
  <div className={s.toolbar}>
    <div className={s.identity}><span className={s.section}>{p.section}</span>
      <nav aria-label="Navegación Analytics" className={s.nav}>
        {items.map((item, i) => <span key={item.label} className={s.navGroup}>
          {item.href
            ? <Link href={`${item.href}?${query}`} aria-current={item.active && subpages.length === 0 ? "page" : undefined} className={item.active ? s.active : s.link}>{item.label}</Link>
            : <span className={s.disabled} title="Próximamente">{item.label}</span>}
          {item.active && subpages.length > 0 && <span className={s.childGroup} aria-label={`Vistas de ${item.label}`}>
            {subpages.map(child => <Link key={child.href} href={`${child.href}?${query}`}
              aria-current={pathname === child.href ? "page" : undefined}
              className={pathname === child.href ? s.subActive : s.subLink}>{child.label}</Link>)}
          </span>}
        </span>)}
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
  </div>
  </>;
}
