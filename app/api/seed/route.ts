import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { CannabisType, Prisma, SeedType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders } from "@/lib/cache-headers";

export async function GET(req: NextRequest) {
    try {
        //--> 1. Lấy search params từ req.url - Test pass
        const { searchParams } = new URL(req.url);
        //--> 2. Parse các search params thành các biến tương ứng
        //---> 2.1 Basic search param
        const search = searchParams.get('search');
        //---> 2.2 Filter params- cần test lại sau
        const cannabisTypes = searchParams.get('cannabisTypes')
            ?.split(',')
            .filter(Boolean)
            .map(t => t.toUpperCase()) || [];
        const seedTypes = searchParams.get('seedTypes')
            ?.split(',')
            .filter(Boolean)
            .map(t => t.toUpperCase()) || [];
        // Pass testing
        const minPrice = parseFloat(searchParams.get('minPrice') || '0');
        const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');

        const minTHC = parseFloat(searchParams.get('minTHC') || '0');
        const maxTHC = parseFloat(searchParams.get('maxTHC') || '100');
        const minCBD = parseFloat(searchParams.get('minCBD') || '0');
        const maxCBD = parseFloat(searchParams.get('maxCBD') || '100');
        //-->2.3 Pagination Params
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        //2.4--> sortBy
        const sortBy = searchParams.get('sortBy');

        apiLogger.debug(
            '[SeedService.fetchSeeds] Received request with params:',
            {
                search,
                cannabisTypes,
                seedTypes,
                minPrice,
                maxPrice,
                minTHC,
                maxTHC,
                minCBD,
                maxCBD,
                page,
                limit,
                sortBy,
                filterActiveSellers: true, // Log that we're filtering active sellers only
            }
        );
        //3. Tính skip cho pagination
        const skip = (page - 1) * limit;
        //4. Xây dựng điều kiện lọc (where) cho prisma query
        const whereClause: Prisma.SeedProductWhereInput = {
            AND: [
                // Filter: Only show products from active sellers
                {
                    category: {
                        seller: {
                            isActive: true
                        }
                    }
                },

                //search keyword
                search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { category: { name: { contains: search, mode: 'insensitive' } } }
                    ]
                } : {},

                // Cannabis types filter
                cannabisTypes.length > 0 ? {
                    cannabisType: { in: cannabisTypes as CannabisType[] }
                } : {},
                // Seed types filter
                seedTypes.length > 0 ? {
                    seedType: { in: seedTypes as SeedType[] }
                } : {},
                // THC range - only apply if not default values
                ...(minTHC > 0 || maxTHC < 100 ? [{
                    OR: [
                        { thcMin: { gte: minTHC, lte: maxTHC } },
                        { thcMax: { gte: minTHC, lte: maxTHC } }
                    ]
                }] : []),
                //CBD range - only apply if not default values
                ...(minCBD > 0 || maxCBD < 100 ? [{
                    OR: [
                        { cbdMin: { gte: minCBD, lte: maxCBD } },
                        { cbdMax: { gte: minCBD, lte: maxCBD } }
                    ]
                }] : []),
                // NOTE: Price filter will be applied after query
                // because Prisma doesn't support filtering by MIN aggregate

            ]
        };
        //5. Xây dựng orderBy cho prisma query
        let orderBy: Prisma.SeedProductOrderByWithRelationInput = {};

        switch (sortBy) {
            case 'priceLowToHigh': {
                orderBy = {
                    pricings: {
                        _count: 'asc' as Prisma.SortOrder
                    }
                };
            };
                break;
            case 'priceHighToLow': {
                orderBy = {
                    pricings: {
                        _count: 'desc' as Prisma.SortOrder
                    }
                };
            };
                break;
            case 'newest': {
                orderBy = {
                    createdAt: 'desc' as Prisma.SortOrder
                };
            };
                break;
            case 'popularity':
            default:
                orderBy = { createdAt: 'asc' as Prisma.SortOrder };
        }
        //6. Xây dựng inClude realtions
        const inCludeClause: Prisma.SeedProductInclude = {
            seller:{
                select:{
                    id: true,
                    affiliateTag:true
                }
            },
            category: {
                include: {
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            url: true,
                            isActive: true, // Add isActive to verify filtering
                        }
                    }
                }
            },
            pricings: {
                orderBy: {
                    pricePerSeed: 'asc'
                }
            },
            productImages: {
                where: {
                    isPrimary: true
                },
                take: 1,
                include: {
                    image: {
                        select: {
                            url: true,
                            alt: true,
                        }
                    }
                }
            }
        };
        //7. Query seeds từ database (without price filter)
        let seeds = await prisma.seedProduct.findMany({
            where: whereClause,
            orderBy,
            include: inCludeClause,
        });

        const totalBeforeFilter = seeds.length;

        apiLogger.debug('[API /seed] Query results after active sellers filter:', {
            totalSeeds: totalBeforeFilter,
            activeSellersOnly: true,
            minPrice,
            maxPrice,
        });

        // Verify all returned seeds have active sellers (debug logging)
        if (totalBeforeFilter > 0) {
            apiLogger.debug('[API /seed] ✅ Query completed with active sellers filter', {
                totalProducts: totalBeforeFilter,
                sampleCategoryId: seeds[0]?.categoryId,
                activeSellerFilterApplied: true
            });
        }

        // 8. Filter out seeds without pricing first
        seeds = seeds.filter(seed => seed.pricings.length > 0);

        const totalWithPricing = seeds.length;
        apiLogger.debug('[API /seed] After removing seeds without pricing:', {
            totalBeforeFilter,
            totalWithPricing,
            removedCount: totalBeforeFilter - totalWithPricing
        });

        // 9. Apply price filter in-memory (filter by minimum pricePerSeed)
        if (minPrice > 0 || maxPrice < 999999) {
            seeds = seeds.filter(seed => {
                const minPricePerSeed = seed.pricings[0]?.pricePerSeed || 0;
                const passesFilter = minPricePerSeed >= minPrice && minPricePerSeed <= maxPrice;

                if (!passesFilter && totalBeforeFilter < 5) { // Debug first 5
                    apiLogger.debug(`[API /seed] Filtered out: ${seed.name}`, {
                        minPricePerSeed,
                        minPrice,
                        maxPrice,
                    });
                }

                return passesFilter;
            });
        }

        // 10. Apply pagination after filtering
        const total = seeds.length;
        const paginatedSeeds = seeds.slice(skip, skip + limit);

        apiLogger.debug(
            '[API /seed] Final results:', {
            totalBeforeFilter,
            totalAfterFilter: total,
            returnedCount: paginatedSeeds.length,
            page,
            limit,
        }
        )

        // apiLogger.debug("[API /seed] Final results (after pagination):", seeds[0]);
        console.dir("check raw seed" + JSON.stringify(seeds[0]), { depth: 1 });

        //11. Trả về dữ liệu với Cloudflare caching headers
        const response = NextResponse.json(
            {
                seeds: paginatedSeeds,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
            },
            {
                status: 200,
            }
        );

        // ADD: Cloudflare cache headers
        const cacheHeaders = getCacheHeaders('api')
        Object.entries(cacheHeaders).forEach(([key, value]) => {
            response.headers.set(key, value)
        })
        
        // ADD: Cache tags for selective purging
        const tags = ['seeds', 'products']
        if (cannabisTypes.length > 0) {
            cannabisTypes.forEach(type => tags.push(`cannabis_${type.toLowerCase()}`))
        }
        if (seedTypes.length > 0) {
            seedTypes.forEach(type => tags.push(`seed_${type.toLowerCase()}`))
        }
        if (search) {
            tags.push('search')
        }
        
        response.headers.set('CF-Cache-Tag', tags.join(','))
        response.headers.set('Vary', 'Accept-Encoding')
        
        // Enhanced logging with cache info
        apiLogger.info('Seeds API cached response', {
            search,
            cannabisTypes,
            seedTypes,
            resultCount: paginatedSeeds.length,
            responseTime: `${Date.now() - (Date.now() - 100)}ms`, // Approximate
            cacheTags: tags,
            totalResults: total
        })

        return response;
        //9. Xử lý lỗi và trả về lỗi dưới dạng JSON response
    } catch (error) {
        apiLogger.logError(
            '[API/seed] GET /seed - Lỗi khi fetch seeds:',
            { error }
        )

        return NextResponse.json(
            {
                error: 'Failed To fetch seeds data',
                message: (error as Error).message || 'Internal Server Error',
            },
            { status: 500 }
        )
    }
}