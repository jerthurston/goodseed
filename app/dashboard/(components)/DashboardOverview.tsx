import React from 'react'
import { DashboardCard } from './DashboardCard'
import { SellerUI } from '@/types/seller.type'
import { SellerCard } from './SellerCard'
import { StatsOverview } from './StatsOverview'


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
            <DashboardCard className="mt-6">
                <h2 className="font-['Archivo_Black'] text-3xl uppercase text-(--brand-primary) tracking-tight mb-4">
                    Recent Activity
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sellers
                        .filter((s) => s.isActive)
                        .slice(0, 4)
                        .map((seller) => (
                            <SellerCard key={seller.id} seller={seller} />
                        ))}
                </div>
            </DashboardCard>
        </>
    )
}

export default DashboardOverview;