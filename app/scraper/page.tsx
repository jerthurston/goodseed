'use client';

import { useState } from 'react';

export default function ScraperPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [startPage, setStartPage] = useState(1);
    const [endPage, setEndPage] = useState(10);

    const runScraper = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/scraper/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scraper: 'leafly',
                    startPage,
                    endPage,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || 'Scraper failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Leafly Scraper</h1>

                <div className=" rounded-lg shadow p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Start Page:</label>
                        <input
                            type="number"
                            value={startPage}
                            onChange={(e) => setStartPage(Number(e.target.value))}
                            className="border rounded px-3 py-2 w-full"
                            min="1"
                            max="488"
                            disabled={loading}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">End Page:</label>
                        <input
                            type="number"
                            value={endPage}
                            onChange={(e) => setEndPage(Number(e.target.value))}
                            className="border rounded px-3 py-2 w-full"
                            min="1"
                            max="488"
                            disabled={loading}
                        />
                    </div>

                    <button
                        onClick={runScraper}
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
                    >
                        {loading ? 'Scraping...' : `Scrape Pages ${startPage}-${endPage}`}
                    </button>

                    {loading && (
                        <div className="mt-4 text-gray-600">
                            <p>⏳ Scraping pages {startPage}-{endPage} from Leafly...</p>
                            <p className="text-sm mt-2">Estimated time: {(endPage - startPage + 1) * 3}s</p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 font-semibold">Error:</p>
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-600 font-semibold">✓ Success!</p>
                            <p className="text-gray-700 mt-2">{result.message}</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h2 className="font-semibold text-blue-900 mb-2">📋 Batch Scraping Strategy:</h2>
                    <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
                        <li>Total pages: 488 (8,772 strains)</li>
                        <li>Recommended: 20-50 pages per batch</li>
                        <li>Example batches: 1-50, 51-100, 101-150...</li>
                        <li>Each batch takes ~2-3 minutes</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}