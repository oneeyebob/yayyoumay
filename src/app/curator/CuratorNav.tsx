'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, BookOpen, Users, Settings, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/actions'

const bottomItems = [
  { href: '/curator', label: 'Oversigt', icon: House },
  { href: '/curator/library', label: 'Bibliotek', icon: BookOpen },
  { href: '/curator/profiles', label: 'Profiler', icon: Users },
  { href: '/curator/account', label: 'Konto', icon: Settings },
]

const sidebarIndhold = [
  { href: '/curator', label: 'Oversigt' },
  { href: '/curator/library', label: 'Bibliotek' },
]

const sidebarIndstillinger = [
  { href: '/curator/profiles', label: 'Profiler' },
  { href: '/curator/account', label: 'Konto' },
]

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  color: '#999',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 600,
  marginBottom: 8,
}

export default function CuratorNav({ profileInitial }: { profileInitial: string | null }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/curator' ? pathname === '/curator' : pathname.startsWith(href)

  const navLinkStyle = (href: string): React.CSSProperties => ({
    fontSize: 14,
    color: isActive(href) ? '#1a1a1a' : '#444',
    padding: '8px 12px',
    borderRadius: 8,
    backgroundColor: isActive(href) ? '#eeeeee' : 'transparent',
    fontWeight: isActive(href) ? 500 : 400,
    textDecoration: 'none',
    display: 'block',
  })

  return (
    <>
      {/* ── Sidebar — desktop only ─────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0 sticky overflow-y-auto"
        style={{
          width: 220,
          backgroundColor: '#f9f9f9',
          borderRight: '1px solid #e5e5e5',
          top: 64,
          height: 'calc(100vh - 64px)',
        }}
      >
        <nav className="flex-1" style={{ paddingTop: 24, paddingLeft: 20, paddingRight: 20 }}>
          <p style={sectionLabel}>Indhold</p>
          <div className="flex flex-col" style={{ gap: 2 }}>
            {sidebarIndhold.map(({ href, label }) => (
              <Link key={href} href={href} style={navLinkStyle(href)}>
                {label}
              </Link>
            ))}
          </div>

          <p style={{ ...sectionLabel, marginTop: 24 }}>Indstillinger</p>
          <div className="flex flex-col" style={{ gap: 2 }}>
            {sidebarIndstillinger.map(({ href, label }) => (
              <Link key={href} href={href} style={navLinkStyle(href)}>
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div style={{ borderTop: '0.5px solid #e5e5e5', padding: '12px' }}>
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-gray-100" style={{ color: '#999' }}>
              <LogOut size={15} />
              Log ud
            </button>
          </form>
        </div>
      </aside>

      {/* ── Bottom nav — mobile only ───────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 z-50">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg">
            <Icon size={20} className={isActive(href) ? 'text-gray-900' : 'text-gray-400'} />
            <span className={`text-[10px] ${isActive(href) ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  )
}
