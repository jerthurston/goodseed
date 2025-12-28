// Quick test script to debug save issue
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSave() {
  try {
    console.log('Testing database save...');
    
    // Test seller exists
    const seller = await prisma.seller.findFirst({
      where: { name: 'Sunwest genetics' }
    });
    
    if (!seller) {
      console.log('❌ Seller not found');
      return;
    }
    
    console.log('✅ Seller found:', seller.id);
    
    // Test category exists
    const category = await prisma.seedProductCategory.findFirst({
      where: { sellerId: seller.id }
    });
    
    if (!category) {
      console.log('❌ No categories found for seller');
      return;
    }
    
    console.log('✅ Category found:', category.id);
    
    // Test create product
    const testProduct = await prisma.seedProduct.create({
      data: {
        name: 'Test Product ' + Date.now(),
        slug: 'test-product-' + Date.now(),
        url: 'https://test.com/test',
        seedType: 'REGULAR',
        cannabisType: 'HYBRID',
        stockStatus: 'IN_STOCK',
        sellerId: seller.id,
        categoryId: category.id
      }
    });
    
    console.log('✅ Test product created:', testProduct.id);
    
    // Clean up
    await prisma.seedProduct.delete({
      where: { id: testProduct.id }
    });
    
    console.log('✅ Test successful - database save works!');
    
  } catch (error) {
    console.error('❌ Database save test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSave();