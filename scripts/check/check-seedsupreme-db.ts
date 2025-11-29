/**
 * Check Seed Supreme seeds in database
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Get all Seed Supreme seeds
    const seeds = await prisma.seed.findMany({
        where: {
            seller: {
                name: 'Seed Supreme'
            }
        },
        include: {
            seller: true,
            seedImages: {
                include: {
                    image: true
                }
            }
        },
        orderBy: {
            pricePerSeed: 'asc'
        }
    });

    console.log('\n🌱 Seed Supreme Seeds in Database:');
    console.log('═'.repeat(120));

    seeds.forEach(seed => {
        console.log(`\n${seed.name}`);
        console.log(`  Slug: ${seed.slug}`);
        console.log(`  Pack: ${seed.packSize}x | Total: $${seed.totalPrice} | Price/Seed: $${seed.pricePerSeed.toFixed(2)}`);
        console.log(`  Type: ${seed.seedType || 'N/A'} | Cannabis: ${seed.cannabisType || 'N/A'} | Photoperiod: ${seed.photoperiodType || 'N/A'}`);
        console.log(`  THC: ${seed.thcMin || 0}-${seed.thcMax || 0}% | CBD: ${seed.cbdMin || 0}-${seed.cbdMax || 0}%`);
        console.log(`  Stock: ${seed.stockStatus} | Images: ${seed.seedImages.length}`);
    });

    console.log('\n' + '═'.repeat(120));
    console.log(`📊 Total: ${seeds.length} Seed records`);

    // Count by type
    const bySeedType = seeds.reduce((acc, s) => {
        const type = s.seedType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const byCannabisType = seeds.reduce((acc, s) => {
        const type = s.cannabisType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Statistics:');
    console.log('  By Seed Type:', bySeedType);
    console.log('  By Cannabis Type:', byCannabisType);

    // Price range
    const prices = seeds.map(s => s.pricePerSeed);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    console.log('\n💰 Price Range (per seed):');
    console.log(`  Min: $${minPrice.toFixed(2)}`);
    console.log(`  Max: $${maxPrice.toFixed(2)}`);
    console.log(`  Avg: $${avgPrice.toFixed(2)}`);
    console.log('');

    await prisma.$disconnect();
}

main().catch(console.error);
