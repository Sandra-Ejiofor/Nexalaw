import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar/sidebar'
import { Providers } from '@/components/providers'
import '@/components/sidebar/style.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth')
  }

  return (
    <Providers>
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          {children}
        </main>
      </div>
      <style key="dashboard-layout-style">{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background-color: var(--color-surface);
        }

        .dashboard-main {
          flex: 1;
          margin-left: 260px;
          padding: 32px 48px;
          min-height: 100vh;
        }

        @media (max-width: 767px) {
          .dashboard-main {
            margin-left: 0;
            padding: 24px 16px 80px;
          }
        }
      `}</style>
    </Providers>
  )
}
