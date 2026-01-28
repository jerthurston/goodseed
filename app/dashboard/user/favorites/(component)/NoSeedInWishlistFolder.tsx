'use client';
import { faSeedling } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import React from 'react'
const NoSeedInWishlistFolder = () => {
  return (
    <div className='relative -z-10'>
     <div id="noFavoritesMessage"
                    className={`visible flex flex-col justify-center items-center gap-6`
                }>
                    <FontAwesomeIcon
                        icon={faSeedling}
                        className='text-6xl text-gray-500'
                    />
                    <div>
                        <h3 style={{ fontFamily: "'Poppins', sans-serif" }}>This List is Empty</h3>
                        <p style={{ color: 'var(--text-primary-muted)', fontFamily: "'Poppins', sans-serif" }}>
                            Browse our collection to find your next favorite seed!
                        </p>
                    </div>
                    <Link href="/seeds" className="login-btn no-favorites__cta w-full md:w-3/12 lg:w2/12" style={{ fontWeight: 800 }}>
                        Browse Seed Collection
                    </Link>
                </div>
    </div>
  )
}

export default NoSeedInWishlistFolder