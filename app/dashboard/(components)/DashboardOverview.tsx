import React from 'react'
import { DashboardCard } from './DashboardCard'
import { SellerUI } from '@/types/seller.type'
import { SellerCard } from './SellerCard'
import { StatsOverview } from './StatsOverview'
import AutoScraperSystemOverview from '@/components/custom/auto-scraper/AutoScraperSystemOverview'
import AutoScraperRecentActivity from '@/components/custom/auto-scraper/AutoScraperRecentActivity'
import AutoScraperPerformanceMetrics from '@/components/custom/auto-scraper/ScraperPerformanceMetrics'
import UserRecentActivity from '@/components/custom/user/UserRecentActivity'
import ScraperPerformanceMetrics from '@/components/custom/auto-scraper/ScraperPerformanceMetrics'


interface DashboardOverviewProps {
    sellers: SellerUI[]
}
const DashboardOverview: React.FC<DashboardOverviewProps> = ({ sellers }) => {
    // Calculate stats
      const activeSellers = sellers.filter((s) => s.isActive).length
      const totalProducts = sellers.reduce(
        (sum, s) => sum + (s.stats?.productsScraped || 0),
        0
      )
      //giải thích totalProducts : reduce là phương thức được sử dụng để tính tổng số sản phẩm đã được thu thập từ tất cả các seller. Nó lặp qua từng seller và cộng dồn số lượng sản phẩm đã thu thập được (productsScraped) vào biến sum. Nếu một seller không có thông tin về số sản phẩm đã thu thập, nó sẽ coi như là 0.
      const avgSuccessRate = Math.round(
        sellers.reduce((sum, s) => sum + (s.stats?.successRate || 0), 0) /
        sellers.length
      )
    return (
        <>
        <StatsOverview
              stats={{
                totalSellers: sellers.length,
                activeSellers,
                totalProducts,
                successRate: avgSuccessRate,
                trends: {
                  sellers: { value: "+2", isPositive: true },
                  products: { value: "+156", isPositive: true },
                },
              }}
            />
            
            {/* Auto Scraper System Overview */}
            <AutoScraperSystemOverview sellersCount={sellers.length} />
            
            {/* Scraper Performance Metrics */}
            <ScraperPerformanceMetrics />
            
            {/* Split layout for Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Auto Scraper Recent Activity */}
              <AutoScraperRecentActivity />
              
              {/* Recent User Activity */}
              <UserRecentActivity />
            </div>
        </>
    )
}

export default DashboardOverview;