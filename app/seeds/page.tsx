import SeedsPageClient from "@/app/seeds/(components)/SeedsPageClient"
import { LoadingSpinner } from "@/components/custom/loading"
import { Suspense } from "react"

//ISR Cache Configuration
export const revalidate = 1800 // Revalidate every 30 minutes
const SeedsPage = () => {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <SeedsPageClient />
        </Suspense>
    )
}
export default SeedsPage
