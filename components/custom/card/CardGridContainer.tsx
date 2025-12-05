'use client'

import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import { faChevronLeft, faChevronRight, faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Image from 'next/image'
import { useState } from 'react'

interface Pack {
    size: number
    totalPrice: number
    pricePerSeed: number
}

interface Seed {
    id: string
    name: string
    type: string
    category: string
    price: number
    thc: number
    cbd: number
    popularity: number
    date: string
    vendorName: string
    vendorUrl: string
    smallestPackSize: number
    smallestPackPrice: number
    strainDescription: string
    packs: Pack[]
    imageUrl: string
}

const CardGridContainer = () => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)

    // Mock data - replace with actual API call
    const seeds: Seed[] = [
        {
            id: 'P001',
            name: 'Blue Dream',
            type: 'Feminized',
            category: 'Sativa',
            price: 4.99,
            thc: 18,
            cbd: 1,
            popularity: 5,
            date: '2023-01-15',
            vendorName: 'GoodSeed Co.',
            vendorUrl: '#vendor-link-goodseed',
            smallestPackSize: 3,
            smallestPackPrice: 14.97,
            strainDescription: 'A legendary sativa-dominant hybrid from California, Blue Dream balances full-body relaxation with gentle cerebral invigoration. Sweet berry aromas abound.',
            packs: [
                { size: 3, totalPrice: 14.97, pricePerSeed: 4.99 },
                { size: 5, totalPrice: 22.45, pricePerSeed: 4.49 },
                { size: 10, totalPrice: 39.90, pricePerSeed: 3.99 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/F8C8DC/3b4a3f?text=Blue%20Dream'
        },
        {
            id: 'P002',
            name: 'Northern Lights',
            type: 'Autoflower',
            category: 'Indica',
            price: 5.99,
            thc: 20,
            cbd: 2,
            popularity: 4,
            date: '2023-02-20',
            vendorName: 'Seedsman',
            vendorUrl: '#vendor-link-seedsman',
            smallestPackSize: 3,
            smallestPackPrice: 17.97,
            strainDescription: 'An iconic indica cherished for its resinous buds, fast flowering, and resilience. Delivers a pungently sweet and spicy aroma.',
            packs: [
                { size: 3, totalPrice: 17.97, pricePerSeed: 5.99 },
                { size: 5, totalPrice: 27.45, pricePerSeed: 5.49 },
                { size: 10, totalPrice: 49.90, pricePerSeed: 4.99 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/AFEEEE/3b4a3f?text=Northern%20Lights'
        },
        {
            id: 'P003',
            name: 'Sour Diesel',
            type: 'Regular',
            category: 'Sativa',
            price: 3.99,
            thc: 22,
            cbd: 0.5,
            popularity: 3,
            date: '2022-11-15',
            vendorName: 'ILGM',
            vendorUrl: '#vendor-link-ilgm',
            smallestPackSize: 3,
            smallestPackPrice: 12.99,
            strainDescription: 'An invigorating sativa-dominant strain, Sour Diesel is famous for its pungent, diesel-like aroma and dreamy cerebral effects.',
            packs: [
                { size: 3, totalPrice: 12.99, pricePerSeed: 4.33 },
                { size: 5, totalPrice: 19.95, pricePerSeed: 3.99 },
                { size: 10, totalPrice: 35.90, pricePerSeed: 3.59 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/C4FFB5/3b4a3f?text=Sour%20Diesel'
        },
        {
            id: 'P004',
            name: 'Girl Scout Cookies',
            type: 'Feminized',
            category: 'Hybrid',
            price: 6.99,
            thc: 25,
            cbd: 1,
            popularity: 5,
            date: '2023-03-01',
            vendorName: 'Royal Queen Seeds',
            vendorUrl: '#vendor-link-rqs',
            smallestPackSize: 1,
            smallestPackPrice: 6.99,
            strainDescription: 'A potent hybrid with a sweet and earthy aroma, GSC launches you to euphoria\'s top floor where full-body relaxation meets a time-bending cerebral space.',
            packs: [
                { size: 1, totalPrice: 6.99, pricePerSeed: 6.99 },
                { size: 3, totalPrice: 20.97, pricePerSeed: 6.99 },
                { size: 5, totalPrice: 32.50, pricePerSeed: 6.50 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/F8C8DC/3b4a3f?text=Girl%20Scout%20Cookies'
        },
        {
            id: 'P005',
            name: 'White Widow',
            type: 'Autoflower',
            category: 'Hybrid',
            price: 5.49,
            thc: 15,
            cbd: 5,
            popularity: 4,
            date: '2023-01-05',
            vendorName: 'MSNL',
            vendorUrl: '#vendor-link-msnl',
            smallestPackSize: 5,
            smallestPackPrice: 27.45,
            strainDescription: 'A balanced hybrid, White Widow is a global coffee shop classic known for its resin production and powerful, energetic, and social buzz.',
            packs: [
                { size: 5, totalPrice: 27.45, pricePerSeed: 5.49 },
                { size: 10, totalPrice: 49.90, pricePerSeed: 4.99 },
                { size: 20, totalPrice: 89.80, pricePerSeed: 4.49 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/AFEEEE/3b4a3f?text=White%20Widow'
        },
        {
            id: 'P006',
            name: 'AK-47',
            type: 'Regular',
            category: 'Hybrid',
            price: 4.49,
            thc: 19,
            cbd: 1,
            popularity: 3,
            date: '2022-11-15',
            vendorName: 'Herbies Seeds',
            vendorUrl: '#vendor-link-herbies',
            smallestPackSize: 3,
            smallestPackPrice: 13.47,
            strainDescription: 'AK-47 is a sativa-dominant hybrid that delivers a steady and long-lasting cerebral buzz. Known for its complex aromas and stress-relieving qualities.',
            packs: [
                { size: 3, totalPrice: 13.47, pricePerSeed: 4.49 },
                { size: 5, totalPrice: 20.00, pricePerSeed: 4.00 },
                { size: 10, totalPrice: 37.50, pricePerSeed: 3.75 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/C4FFB5/3b4a3f?text=AK-47'
        },
        {
            id: 'P007',
            name: 'Gorilla Glue #4',
            type: 'Feminized',
            category: 'Hybrid',
            price: 7.99,
            thc: 28,
            cbd: 0.8,
            popularity: 5,
            date: '2023-03-10',
            vendorName: 'Blimburn Seeds',
            vendorUrl: '#vendor-link-blimburn',
            smallestPackSize: 3,
            smallestPackPrice: 23.97,
            strainDescription: 'Famous for its extreme potency and resin production, Gorilla Glue #4 (GG4) offers a heavy-handed euphoria and relaxation, leaving you feeling "glued" to the couch.',
            packs: [
                { size: 3, totalPrice: 23.97, pricePerSeed: 7.99 },
                { size: 6, totalPrice: 45.00, pricePerSeed: 7.50 },
                { size: 9, totalPrice: 63.00, pricePerSeed: 7.00 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/F8C8DC/3b4a3f?text=Gorilla%20Glue'
        },
        {
            id: 'P008',
            name: 'Amnesia Haze',
            type: 'Autoflower',
            category: 'Sativa',
            price: 6.49,
            thc: 21,
            cbd: 1.5,
            popularity: 4,
            date: '2023-02-01',
            vendorName: 'Seedsman',
            vendorUrl: '#vendor-link-seedsman2',
            smallestPackSize: 1,
            smallestPackPrice: 6.49,
            strainDescription: 'A classic sativa that offers a long-lasting energetic buzz and a unique, unforgettable flavor. Amnesia Haze is perfect for boosting mood and creativity.',
            packs: [
                { size: 1, totalPrice: 6.49, pricePerSeed: 6.49 },
                { size: 3, totalPrice: 19.47, pricePerSeed: 6.49 },
                { size: 5, totalPrice: 30.00, pricePerSeed: 6.00 }
            ],
            imageUrl: 'https://via.placeholder.com/300x200/AFEEEE/3b4a3f?text=Amnesia%20Haze'
        }
    ]

    const toggleFavorite = (seedId: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev)
            if (newFavorites.has(seedId)) {
                newFavorites.delete(seedId)
            } else {
                newFavorites.add(seedId)
            }
            return newFavorites
        })
    }

    return (
        <main className="results-page-main">
            <div className="page-header">
                <h2>Our Seed Collection</h2>
                <p>Browse our premium selection of high-quality seeds from trusted vendors</p>
            </div>

            <div className="results-grid" id="plantCardGrid">
                {seeds.map((seed) => (
                    <div
                        key={seed.id}
                        className="plant-card"
                        data-id={seed.id}
                        data-type={seed.type}
                        data-category={seed.category}
                        data-price={seed.price}
                        data-thc={seed.thc}
                        data-cbd={seed.cbd}
                        data-name={seed.name}
                        data-popularity={seed.popularity}
                        data-date={seed.date}
                        data-vendor-name={seed.vendorName}
                        data-vendor-url={seed.vendorUrl}
                        data-smallest-pack-size={seed.smallestPackSize}
                        data-smallest-pack-price={seed.smallestPackPrice}
                        data-strain-description={seed.strainDescription}
                        data-packs={JSON.stringify(seed.packs)}
                    >
                        <div className="card-img-container">
                            <a
                                href={seed.vendorUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View ${seed.name} details on vendor site`}
                            >
                                <div className="card-img-aspect">
                                    {' '}
                                    <Image
                                        src={seed.imageUrl}
                                        alt={seed.name}
                                        className="card-img"
                                        width={300}
                                        height={200}
                                        unoptimized
                                    />
                                    {' '}
                                </div>
                            </a>
                            <span className="seed-type-pill-on-image"></span>
                            <button
                                className={`list-icon-btn js-add-to-list-btn ${favorites.has(seed.id) ? 'is-animating' : ''}`}
                                aria-label="Add to list"
                                type="button"
                            >
                                <svg
                                    className="list-icon-svg"
                                    viewBox="0 0 100 150"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        className="svg-border"
                                        d="M5,5 L50,30 L95,5 L95,145 L5,145 Z"
                                    />
                                    <path
                                        className="svg-fill"
                                        d="M5,5 L50,30 L95,5 L95,145 L5,145 Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </button>
                            <button
                                className={`favorite-btn-new ${favorites.has(seed.id) ? 'active' : ''}`}
                                data-strain-name={seed.name}
                                onClick={() => toggleFavorite(seed.id)}
                                aria-label="Toggle Favorite"
                                type="button"
                            >
                                <FontAwesomeIcon
                                    icon={favorites.has(seed.id) ? faHeartSolid : faHeartRegular}
                                />
                            </button>
                        </div>
                        <div className="plant-card-info-wrapper">
                            <h3 className="strain-name">{seed.name}</h3>
                            <div className="price-pack-row">
                                <div className="price-info-group">
                                    <p className="price-starting-at-label">Starting at</p>
                                    <p className="price-per-seed">${seed.price.toFixed(2)}/seed</p>
                                    <p className="smallest-pack-vendor-context"></p>
                                </div>
                                <button type="button" className="pack-deals-btn">
                                    View Packs
                                </button>
                            </div>
                            <div className="card-secondary-specs">
                                <span className="spec-item strain-category-text"></span>
                                <span className="spec-item thc-value-text"></span>
                                <span className="spec-item cbd-value-text"></span>
                            </div>
                        </div>
                        <div className="plant-card-overlay"></div>
                    </div>
                ))}
            </div>

            <div className="pagination-container">
                <nav className="pagination-nav">
                    <button
                        title="Previous Page"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        type="button"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <button
                        className={currentPage === 1 ? 'active' : ''}
                        onClick={() => setCurrentPage(1)}
                        type="button"
                    >
                        1
                    </button>
                    <button
                        className={currentPage === 2 ? 'active' : ''}
                        onClick={() => setCurrentPage(2)}
                        type="button"
                    >
                        2
                    </button>
                    <button
                        className={currentPage === 3 ? 'active' : ''}
                        onClick={() => setCurrentPage(3)}
                        type="button"
                    >
                        3
                    </button>
                    <button
                        className={currentPage === 4 ? 'active' : ''}
                        onClick={() => setCurrentPage(4)}
                        type="button"
                    >
                        4
                    </button>
                    <button
                        title="Next Page"
                        disabled={currentPage === 4}
                        onClick={() => setCurrentPage(prev => Math.min(4, prev + 1))}
                        type="button"
                    >
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </nav>
            </div>
        </main>
    )
}

export default CardGridContainer
