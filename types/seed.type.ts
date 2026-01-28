import { UseQueryResult } from '@tanstack/react-query';

// --> type for seed data for using in UI components
export interface PackUI {
    size: number
    totalPrice: number
    pricePerSeed: number
}

export interface SeedUI {
    id: string
    name: string
    seedType: string
    cannabisType: string
    price: number
    thc?: number | { min: number; max: number } // Support both single value and range, optional if no data.
    cbd?: number | { min: number; max: number } // Support both single value and range, optional if no data.
    popularity: number
    date: string
    vendorName: string
    vendorUrl: string
    smallestPackSize: number
    smallestPackPrice: number
    strainDescription: string
    packs: PackUI[]
    imageUrl: string
    stockStatus: string;
    seller:{
        ids:string;
        affiliateTags:string | null;
    }
}

export interface SeedPaginationUI {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}



//--> HOOK TYPE
export interface SeedFilter {
    // filter by seed type
    priceRange: {
        min: number;
        max: number
    }
    seedTypes: string[]
    cannabisTypes: string[]
    thcRange: {
        min: number;
        max: number
    }
    cbdRange: {
        min: number;
        max: number
    }
    inStock?: boolean;
};

export type SortBy = 'popularity' | 'priceLowToHigh' | 'priceHighToLow' | 'newest';


export interface UseSeedsInputOptions {
    // Search and filters params
    searchKeyword?: string;
    filters?: Partial<SeedFilter>

    // Sorting - chẩn dễ mở rộng
    sortBy?: SortBy | SortBy[];
    //Pagination
    page?: number;
    limit?: number;
    // TanStack Query options (pass-through)
    // Chỉ giữ những option thường dùng
    enabled?: boolean;  // Enable/disable query

}

export type UseSeedsOutputResult = {
    seeds: SeedUI[];
    pagination: SeedPaginationUI | null;
} & Pick<UseQueryResult,
    'isLoading' | 'isFetching' | 'isError' | 'error' | 'refetch'
>;


export interface SeedProductRaw {
    id: string;
    categoryId: string;
    name: string;
    url: string;
    slug: string;
    description: string | null;
    displayPrice: number | null; // Add displayPrice field
    stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
    seedType: 'REGULAR' | 'FEMINIZED' | 'AUTOFLOWER' | 'PHOTOPERIOD' | null;
    cannabisType: string | null;
    thcMin: number | null;
    thcMax: number | null;
    thcText: string | null;
    cbdMin: number | null;
    cbdMax: number | null;
    cbdText: string | null;
    createdAt: string;
    updatedAt: string;
    seller:{
        id:string;
        affiliateTag:string | null;
    };
    category: {
        id: string;
        sellerId: string;
        name: string;
        cannabisType: 'SATIVA' | 'INDICA' | 'HYBRID' | 'RUDERALIS' | null;
        seller: {
            id: string;
            name: string;
            url: string;
        };
    };
    pricings: Array<{
        id: string;
        totalPrice: number;
        packSize: number;
        pricePerSeed: number;
    }>;
    productImages: Array<{
        order: number;
        isPrimary: boolean;
        image: {
            url: string;
            alt: string | null;
        };
    }>;
}

export interface SeedApiResponseRaw {
    seeds: SeedProductRaw[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}