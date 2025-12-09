// lib/services/seed/seed.transformer.ts

import { apiLogger } from '@/lib/helpers/api-logger';
import { PackUI, SeedProductRaw, SeedUI } from '@/types/seed.type';

export class SeedTransformer {
    /**
     * Transform raw seed data to UI format
     */
    static toUI(raw: SeedProductRaw): SeedUI {
        apiLogger.logRequest('SeedTransformer.toUI', {
            seedId: raw.id,
            seedName: raw.name,
            pricingsCount: raw.pricings?.length || 0,
            imagesCount: raw.productImages?.length || 0
        });

        // Transform pricings to PackUI
        const packs: PackUI[] = raw.pricings.map(pricing => ({
            size: pricing.packSize,
            totalPrice: pricing.totalPrice,
            pricePerSeed: pricing.pricePerSeed,
        }));

        // Get pack with LOWEST pricePerSeed (best value for money)
        const bestValuePack = packs.reduce((best, pack) =>
            pack.pricePerSeed < best.pricePerSeed ? pack : best,
            packs[0] || { size: 0, totalPrice: 0, pricePerSeed: 0 }
        );

        // Get primary image
        const primaryImage = raw.productImages.find(img => img.isPrimary)
            || raw.productImages[0];

        // Calculate average THC/CBD
        const thc = raw.thcMax || raw.thcMin || 0;
        const cbd = raw.cbdMax || raw.cbdMin || 0;

        const result: SeedUI = {
            id: raw.id,
            name: raw.name,
            type: raw.seedType || 'UNKNOWN',
            category: raw.category.cannabisType || 'UNKNOWN',
            price: bestValuePack.pricePerSeed,
            thc,
            cbd,
            popularity: 0, // TODO: Implement popularity logic
            date: raw.createdAt,
            vendorName: raw.category.seller.name,
            vendorUrl: raw.url,
            smallestPackSize: bestValuePack.size,
            smallestPackPrice: bestValuePack.totalPrice,
            strainDescription: raw.description || '',
            packs,
            imageUrl: primaryImage?.image.url || '/images/placeholder-seed.png',
            stockStatus: raw.stockStatus,
        };

        apiLogger.logResponse('SeedTransformer.toUI', {}, {
            seedId: result.id,
            seedName: result.name,
            price: result.price,
            thc: result.thc,
            cbd: result.cbd,
            packsCount: result.packs.length,
            imageUrl: result.imageUrl
        });

        return result;
    }

    /**
     * Transform array of raw seeds
     */
    static toUIList(rawSeeds: SeedProductRaw[]): SeedUI[] {
        apiLogger.logRequest('SeedTransformer.toUIList', {
            rawSeedsCount: rawSeeds.length
        });

        const result = rawSeeds.map(seed => this.toUI(seed));

        apiLogger.logResponse('SeedTransformer.toUIList', {}, {
            inputCount: rawSeeds.length,
            outputCount: result.length,
            seeds: result.map(s => ({ id: s.id, name: s.name, price: s.price }))
        });

        return result;
    }
}