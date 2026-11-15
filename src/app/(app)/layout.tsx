import { redirect } from 'next/navigation'
import { createServerClient } from '@lib/supabase/server'
import { Sidebar } from '@shared/components/Sidebar'
import { Topbar } from '@shared/components/Topbar'

/**
 * Layout protegido. El middleware redirige antes de llegar aquí,
 * pero hacemos una segunda verificación server-side por seguridad.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
