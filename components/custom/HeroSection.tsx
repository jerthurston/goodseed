'use client'

import FilterBtnForHomepage from '@/components/custom/filter/FilterBtnForHomepage'
import SearchForHomepage from '@/components/custom/search/SearchForHomepage'

const HeroSection = () => {

    return (
        <>
            <section className="hero">
                <h1>Find the best cannabis seeds at the best price</h1>
                <div className="hero-search-container">
                    <SearchForHomepage />
                    <FilterBtnForHomepage />
                </div>
                <p>Search top seed banks, compare strains, and find the best prices.</p>
            </section>


        </>
    )
}

export default HeroSection
