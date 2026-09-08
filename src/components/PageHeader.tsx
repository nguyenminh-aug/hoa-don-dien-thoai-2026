import type { ReactNode } from 'react'

interface PageHeaderProps { title: string; subtitle?: string; action?: ReactNode }
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return <header className="page-header"><div className="page-brand"><img src={`${import.meta.env.BASE_URL}app-logo-192.png`} alt="Logo ứng dụng" /><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>{action}</header>
}
