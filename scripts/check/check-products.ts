import { prisma } from '@/lib/prisma';
import 'dotenv/config';

async function checkProducts() {
    console.log('\n=== Products in Database ===\n');

    const products = await prisma.dispensaryProduct.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
            dispensary: {
                select: { name: true, slug: true },
            },
            strain: {
                select: { name: true, type: true },
            },
        },
    });

    console.log(`Total products found: ${products.length}\n`);

    products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Brand: ${p.brand || 'N/A'}`);
        console.log(`   Type: ${p.type}`);
        console.log(`   Price: $${p.price}`);
        console.log(`   THC: ${p.thc || 'N/A'}%`);
        console.log(`   CBD: ${p.cbd || 'N/A'}`);
        console.log(`   Weight: ${p.weight || 'N/A'}`);
        console.log(`   Dispensary: ${p.dispensary.name}`);
        console.log(`   Strain: ${p.strain?.name || 'Not linked'}`);
        console.log(`   Slug: ${p.slug}`);
        console.log('');
    });

    // Stats by type
    const byType = await prisma.dispensaryProduct.groupBy({
        by: ['type'],
        _count: true,
    });

    console.log('\n=== Products by Type ===');
    byType.forEach((t) => {
        console.log(`  ${t.type}: ${t._count}`);
    });

    // Stats by dispensary
    const byDispensary = await prisma.dispensaryProduct.groupBy({
        by: ['dispensaryId'],
        _count: true,
    });

    console.log('\n=== Products by Dispensary ===');
    for (const d of byDispensary) {
        const dispensary = await prisma.dispensary.findUnique({
            where: { id: d.dispensaryId },
            select: { name: true },
        });
        console.log(`  ${dispensary?.name}: ${d._count}`);
    }
}

checkProducts()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
