import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedSellers() {
    console.log('🌱 Seeding sellers...');

    // Leafly as first seller
    const leafly = await prisma.seller.upsert({
        where: { name: 'Leafly' },
        update: {
            url: 'https://www.leafly.com/shop',
            isActive: true,
        },
        create: {
            name: 'Leafly',
            url: 'https://www.leafly.com/shop',
            affiliateTag: null, // TODO: Add affiliate tag when available
            isActive: true,
        },
    });

    console.log('✅ Created/updated seller:', leafly.name, '(ID:', leafly.id, ')');
    console.log('\n📋 Use this seller ID in scrapers:');
    console.log(`   pnpm test:products ${leafly.id} 300 300`);

    await prisma.$disconnect();
}

seedSellers()
    .catch((error) => {
        console.error('❌ Error seeding sellers:', error);
        process.exit(1);
    });
