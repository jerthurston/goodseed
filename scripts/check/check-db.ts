import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function checkDatabase() {
    console.log('=== Database Statistics ===\n');

    // Total strains
    const total = await prisma.cannabisStrain.count();
    console.log(`Total strains: ${total}`);

    // By type
    const byType = await prisma.cannabisStrain.groupBy({
        by: ['type'],
        _count: true,
    });

    console.log('\nBy Type:');
    byType.forEach(({ type, _count }) => {
        console.log(`  ${type}: ${_count}`);
    });

    // Recent 10
    const recent = await prisma.cannabisStrain.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { name: true, slug: true, thc: true, updatedAt: true },
    });

    console.log('\nRecent 10 strains:');
    recent.forEach((strain, i) => {
        console.log(`  ${i + 1}. ${strain.name} (${strain.thc}%) - Updated: ${strain.updatedAt.toLocaleString()}`);
    });

    await prisma.$disconnect();
}

checkDatabase().catch(console.error);
