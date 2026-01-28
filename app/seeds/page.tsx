import SeedsPageClient from "@/app/seeds/(components)/SeedsPageClient"
import { BeatLoaderSpinner, ClimbingBoxLoaderSpinner } from "@/components/custom/loading"
import { Suspense } from "react"

//ISR Cache Configuration
export const revalidate = 1800 // Revalidate every 30 minutes
const SeedsPage = () => {
    return (
        <Suspense fallback={<BeatLoaderSpinner />}>
            <SeedsPageClient />
        </Suspense>
    )
}
export default SeedsPage
