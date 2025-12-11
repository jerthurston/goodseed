import { CheckCircle, ShoppingBag, TrendingUp } from "lucide-react"
import { DashboardStatsCard } from "./index"

interface StatsOverviewProps {
  stats: {
    totalSellers: number
    activeSellers: number
    totalProducts: number
    successRate: number
    trends?: {
      sellers?: { value: string; isPositive: boolean }
      products?: { value: string; isPositive: boolean }
    }
  }
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <DashboardStatsCard
        label="Total Sellers"
        value={stats.totalSellers}
        icon={<ShoppingBag className="w-10 h-10" />}
        trend={stats.trends?.sellers}
      />
      <DashboardStatsCard
        label="Active Sellers"
        value={stats.activeSellers}
        icon={<CheckCircle className="w-10 h-10" />}
      />
      <DashboardStatsCard
        label="Total Products"
        value={stats.totalProducts}
        icon={<TrendingUp className="w-10 h-10" />}
        trend={stats.trends?.products}
      />
      <DashboardStatsCard
        label="Success Rate"
        value={`${stats.successRate}%`}
        icon={<CheckCircle className="w-10 h-10" />}
      />
    </div>
  )
}
