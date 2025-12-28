import { CheckCircle, ShoppingBag, TrendingUp } from "lucide-react"
import { DashboardStatsCard } from "./index"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAdd, faAnchorCircleCheck, faCartShopping, faFilePowerpoint, faStore, faTree } from "@fortawesome/free-solid-svg-icons"
import { faElementor, faProductHunt, faResearchgate } from "@fortawesome/free-brands-svg-icons"

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
        label="Total Sellers in system"
        value={stats.totalSellers}
        icon={<FontAwesomeIcon icon={faStore} size="lg"/>}
        trend={stats.trends?.sellers}
      />
      <DashboardStatsCard
        label="Eligible Sellers for Auto Scraping"
        value={stats.activeSellers}
        icon={<FontAwesomeIcon icon={faTree} size="lg"/>}
      />
      <DashboardStatsCard
        label="Total Products In Database"
        value={stats.totalProducts}
        icon={<FontAwesomeIcon icon={faCartShopping} size="lg"/>}
        trend={stats.trends?.products}
      />
      {/* Tính lại số lượng sản phẩm đang được hiển thị ở trang /seeds sẵn sàng cho tìm kiếm */}
      <DashboardStatsCard
        label="Number Of Products Displayed"
        value={`${stats.totalProducts}`}
        icon={<FontAwesomeIcon icon={faResearchgate} size="lg"/>}
        trend={undefined}
      />
    </div>
  )
}
