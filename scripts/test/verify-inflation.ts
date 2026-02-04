import { prisma } from '@/lib/prisma';

const SUNWEST_SELLER_ID = 'cmjoskrq40000rksbn4hm8ixt';

async function main() {
  console.log('\n🔎 VERIFY INFLATION - Sunwest Genetics (first 12 products)\n');
  try {
    const products = await prisma.seedProduct.findMany({
      where: { sellerId: SUNWEST_SELLER_ID },
      include: { pricings: true },
      take: 12,
      orderBy: { createdAt: 'asc' },
    });

    if (!products || products.length === 0) {
      console.log('No products found for Sunwest Genetics.');
      return;
    }

    const out = products.map(p => ({
      id: p.id,
      name: p.name,
      pricings: p.pricings.map(r => ({
        id: r.id,
        packSize: r.packSize,
        totalPrice: r.totalPrice,
        pricePerSeed: r.pricePerSeed,
      })),
    }));

    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error('Error while verifying inflation:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().then(() => process.exit(0));
