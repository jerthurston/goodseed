import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { CannabisType, Prisma, SeedType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        //--> 1. Lấy search params từ req.url - Test pass
        const { searchParams } = new URL(req.url);
        //--> 2. Parse các search params thành các biến tương ứng
        //---> 2.1 Basic search param
        const search = searchParams.get('search');
        //---> 2.2 Filter params- cần test lại sau
        const cannabisTypes = searchParams.get('cannabisTypes')?.split(',').filter(Boolean) || [];
        const seedTypes = searchParams.get('seedTypes')?.split(',').filter(Boolean) || [];
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
        //2.4--> sortBy, sortOrder
        const sortBy = searchParams.get('sortBy');
        const sortOrder = searchParams.get('sortOrder') || 'asc';

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
                sortOrder,
            }
        );
        //3. Tính skip cho pagination
        const skip = (page - 1) * limit;
        //4. Xây dựng điều kiện lọc (where) cho prisma query
        const whereClause: Prisma.SeedProductWhereInput = {
            AND: [
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
            case 'price': {
                orderBy = {
                    pricings: {
                        _count: sortOrder as Prisma.SortOrder
                    }
                };
            };
                break;
            case 'thc': {
                orderBy = {
                    thcMax: sortOrder as Prisma.SortOrder
                };
            };
                break;
            case 'cbd': {
                orderBy = {
                    cbdMax: sortOrder as Prisma.SortOrder
                }
            };
                break;
            default:
                orderBy = { createdAt: sortOrder as Prisma.SortOrder };
        }
        //6. Xây dựng inClude realtions
        const inCludeClause: Prisma.SeedProductInclude = {
            category: {
                include: {
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            url: true,
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
            include: inCludeClause
        });

        const totalBeforeFilter = seeds.length;

        apiLogger.debug('[API /seed] Query results before price filter:', {
            totalSeeds: totalBeforeFilter,
            minPrice,
            maxPrice,
        });

        // 8. Apply price filter in-memory (filter by minimum pricePerSeed)
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

        // 9. Apply pagination after filtering
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

        //10. Trả về dữ liệu dưới dạng JSON response nếu thành công
        return NextResponse.json(
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
            },

        );
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