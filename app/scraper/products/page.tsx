'use client';

import { useEffect, useState } from 'react';

interface Dispensary {
    id: string;
    name: string;
    slug: string;
}

export default function ProductScraperPage() {
    const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
    const [selectedDispensary, setSelectedDispensary] = useState('');
    const [startPage, setStartPage] = useState(1);
    const [endPage, setEndPage] = useState(5);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch dispensaries
    useEffect(() => {
        async function loadDispensaries() {
            try {
                const res = await fetch('/api/dispensaries');
                const data = await res.json();
                setDispensaries(data.dispensaries || []);
                if (data.dispensaries?.length > 0) {
                    setSelectedDispensary(data.dispensaries[0].id);
                }
            } catch (error) {
                console.error('Failed to load dispensaries:', error);
            }
        }
        loadDispensaries();
    }, []);

    const handleScrape = async () => {
        if (!selectedDispensary) {
            setMessage('\u26a0\ufe0f  Please select a dispensary');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/scraper/products/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dispensaryId: selectedDispensary,
                    startPage,
                    endPage,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage(`\u2705 ${data.message}`);
            } else {
                setMessage(`\u274c Error: ${data.error} - ${data.details || ''}`);
            }
        } catch (error) {
            setMessage(`\u274c Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const estimatedTime = ((endPage - startPage + 1) * 4) / 60;
    const totalPages = 623; // Leafly has 623 pages

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-900">
                    \ud83d\udccd Product Scraper - Leafly Shop
                </h1>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Dispensary
                        </label>
                        <select
                            value={selectedDispensary}
                            onChange={(e) => setSelectedDispensary(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            {dispensaries.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-sm text-gray-500">
                            Products will be associated with this dispensary
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Page
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={totalPages}
                                value={startPage}
                                onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Page
                            </label>
                            <input
                                type="number"
                                min={startPage}
                                max={totalPages}
                                value={endPage}
                                onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800">
                            <strong>Pages:</strong> {endPage - startPage + 1} pages
                            <br />
                            <strong>Products:</strong> ~{(endPage - startPage + 1) * 15} products
                            <br />
                            <strong>Estimated time:</strong> ~{estimatedTime.toFixed(1)} minutes
                        </p>
                    </div>

                    <button
                        onClick={handleScrape}
                        disabled={loading || !selectedDispensary}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                    >
                        {loading ? '\u231b Scraping...' : '\ud83d\ude80 Start Scraping'}
                    </button>

                    {message && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{message}</p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                        \ud83d\udcca Product Scraping Info
                    </h2>
                    <div className="space-y-3 text-sm text-gray-700">
                        <p>
                            <strong>Source:</strong> Leafly Shop (https://www.leafly.com/shop)
                        </p>
                        <p>
                            <strong>Total Pages:</strong> {totalPages} pages (~9,336 products)
                        </p>
                        <p>
                            <strong>Location:</strong> Edmonton, AB, Canada
                        </p>
                        <p>
                            <strong>Data Extracted:</strong>
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Product name and brand</li>
                            <li>THC% and CBD%</li>
                            <li>Price and weight</li>
                            <li>Product type (Flower, Pre-roll, Edible, etc.)</li>
                            <li>Availability status</li>
                            <li>Product images</li>
                            <li>Link to strain (auto-matched)</li>
                        </ul>
                        <p className="mt-4 text-yellow-700 bg-yellow-50 p-3 rounded">
                            <strong>\u26a0\ufe0f  Note:</strong> Scraping large page ranges may take time.
                            Start with 1-5 pages to test, then scale up.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
