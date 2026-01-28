'use client'

import { getVisiblePages } from '@/lib/helpers/client/get-visible-page';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    maxVisiblePages?: number;
}

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    maxVisiblePages = 5
}: PaginationProps) => {
    // Don't render if only one page
    if (totalPages <= 1) return null;

    // 📱 Responsive maxVisiblePages: 3 on mobile, 5 on desktop
    const [responsiveMaxPages, setResponsiveMaxPages] = useState(maxVisiblePages);

    useEffect(() => {
        const handleResize = () => {
            // Mobile: <= 640px → 3 pages
            // Tablet: <= 768px → 4 pages  
            // Desktop: > 768px → 5 pages (default)
            if (window.innerWidth <= 640) {
                setResponsiveMaxPages(3);
            } else if (window.innerWidth <= 768) {
                setResponsiveMaxPages(4);
            } else {
                setResponsiveMaxPages(maxVisiblePages);
            }
        };

        // Initial check
        handleResize();

        // Listen to window resize
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [maxVisiblePages]);

    // Calculate visible page numbers
    const visiblePages = getVisiblePages(
        currentPage,
        totalPages,
        responsiveMaxPages
    );

    return (
        <div className="pagination-container">
            <nav className="pagination-nav">
                {/* Previous Button */}
                <button
                    title="Previous Page"
                    disabled={currentPage === 1}
                    onClick={() => {
                        if (currentPage > 1) {
                            onPageChange(currentPage - 1);
                        }
                    }}
                    type="button"
                    aria-label="Go to previous page"
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                {/* First Page + Ellipsis */}
                {visiblePages[0] > 1 && (
                    <>
                        <button
                            onClick={() => onPageChange(1)}
                            type="button"
                            aria-label="Go to page 1"
                        >
                            1
                        </button>
                        {visiblePages[0] > 2 && (
                            <span className="pagination-ellipsis" aria-hidden="true">
                                ...
                            </span>
                        )}
                    </>
                )}

                {/* Dynamic Page Buttons */}
                {visiblePages.map((pageNum) => (
                    <button
                        key={pageNum}
                        className={currentPage === pageNum ? 'active' : ''}
                        onClick={() => onPageChange(pageNum)}
                        type="button"
                        aria-label={`Go to page ${pageNum}`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                    >
                        {pageNum}
                    </button>
                ))}

                {/* Ellipsis + Last Page */}
                {visiblePages[visiblePages.length - 1] < totalPages && (
                    <>
                        {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                            <span className="pagination-ellipsis" aria-hidden="true">
                                ...
                            </span>
                        )}
                        <button
                            onClick={() => onPageChange(totalPages)}
                            type="button"
                            aria-label={`Go to page ${totalPages}`}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                {/* Next Button */}
                <button
                    title="Next Page"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                        if (currentPage < totalPages) {
                            onPageChange(currentPage + 1);
                        }
                    }}
                    type="button"
                    aria-label="Go to next page"
                >
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </nav>
        </div>
    );
};

export default Pagination;
