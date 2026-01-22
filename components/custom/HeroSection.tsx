'use client'

import FilterBtnForHomepage from '@/components/custom/filter/FilterBtnForHomepage'
import SearchForHomepage from '@/components/custom/search/SearchForHomepage'


interface HeroSectionProps {
    title:string;
    description:string;
}

const HeroSection = ({ title, description }: HeroSectionProps) => {

    return (
        <>
            <section className="hero">
                {/* <div> */}
                    <h1>{title}</h1>
                {/* </div> */}
                <div className="hero-search-container">
                    <SearchForHomepage />
                    <FilterBtnForHomepage />
                </div>
                <div>
                    <p>{description}</p>
                </div>
            </section>


        </>
    )
}

export default HeroSection
