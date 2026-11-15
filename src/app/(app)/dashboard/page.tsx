import type { Metadata } from 'next'
import { createServerClient } from '@lib/supabase/server'
import { redirect } from 'next/navigation'
import { dashboardService } from '@modules/dashboard/services/DashboardService'
import { StatsGrid }      from '@modules/dashboard/components/StatsGrid'
import { WeeklyChart }    from '@modules/dashboard/components/WeeklyChart'
import { RecentActivity } from '@modules/dashboard/components/RecentActivity'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await dashboardService.getStats(user.id)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tu progreso de hoy</p>
      </div>

      <StatsGrid english={data.english} spanish={data.spanish} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyChart data={data.weeklyChart} />
        </div>
        <div>
          <RecentActivity items={data.recentActivity} />
        </div>
      </div>
    </div>
  )
}
