import { prisma } from '@/lib/prisma';

const seedIds = [
  'cmjpdhwq400000yo3t5bq60v3',
  'cmjpdhwqx00050yo3spyh9zem',
  'cmjpdhwrh000a0yo3yzphk1fz',
  'cmjpdhwrx000f0yo3h85chjqj'
];

async function main() {
  console.log('\n📋 Checking seed products...\n');
  
  const products = await prisma.seedProduct.findMany({
    where: {
      id: { in: seedIds }
    },
    include: {
      seller: true,
      pricings: true
    }
  });

  console.log(`Found ${products.length} products:\n`);
  
  products.forEach((product, idx) => {
    console.log(`${idx + 1}. ${product.name}`);
    console.log(`   ID: ${product.id}`);
    console.log(`   Seller: ${product.seller.name} (${product.sellerId})`);
    console.log(`   Pricings: ${product.pricings.length} variants`);
    product.pricings.forEach(p => {
      console.log(`      - ${p.packSize} seeds: $${p.totalPrice}`);
    });
    console.log('');
  });

  // Group by seller
  const bySeller = products.reduce((acc, p) => {
    const sellerName = p.seller.name;
    if (!acc[sellerName]) acc[sellerName] = [];
    acc[sellerName].push(p);
    return acc;
  }, {} as Record<string, typeof products>);

  console.log('\n📊 Grouped by seller:');
  Object.entries(bySeller).forEach(([seller, prods]) => {
    console.log(`\n${seller}: ${prods.length} products`);
    console.log(`Seller ID: ${prods[0].sellerId}`);
  });

  await prisma.$disconnect();
}

main();
