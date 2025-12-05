'use client';
import { useRouter } from 'next/navigation';
import React from 'react';

const SearchForHomepage = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = React.useState('');
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/seeds?search=${encodeURIComponent(searchQuery)}`)
        }
    }
    return (
        <>
            <form
                className="hero-search"
                onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Search for seeds..."
                    id="searchInput"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">Search</button>
            </form>
        </>
    )
}

export default SearchForHomepage
