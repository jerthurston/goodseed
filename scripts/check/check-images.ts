import { prisma } from '@/lib/prisma';
import 'dotenv/config';

async function main() {
    const productsCount = await prisma.dispensaryProduct.count();
    const imagesCount = await prisma.image.count();
    const relationsCount = await prisma.productImage.count();

    console.log('\n=== Image Statistics ===\n');
    console.log(`Total Products: ${productsCount}`);
    console.log(`Total Images: ${imagesCount}`);
    console.log(`Total ProductImage relations: ${relationsCount}`);
    console.log(`Products with images: ${relationsCount}`);
    console.log(`Products without images: ${productsCount - relationsCount}`);

    // Sample images
    const sampleImages = await prisma.image.findMany({
        take: 5,
        include: {
            productImages: {
                include: {
                    dispensaryProduct: {
                        select: { name: true }
                    }
                }
            }
        }
    });

    console.log('\n=== Sample Images ===\n');
    sampleImages.forEach((img, i) => {
        console.log(`${i + 1}. ${img.url}`);
        console.log(`   Alt: ${img.alt}`);
        console.log(`   Used by: ${img.productImages.length} products`);
        if (img.productImages.length > 0) {
            console.log(`   Products: ${img.productImages.map(pi => pi.dispensaryProduct.name).join(', ')}`);
        }
        console.log('');
    });

    // Products with images
    const productsWithImages = await prisma.dispensaryProduct.findMany({
        where: {
            productImages: {
                some: {}
            }
        },
        take: 5,
        include: {
            productImages: {
                include: {
                    image: true
                },
                orderBy: {
                    order: 'asc'
                }
            }
        }
    });

    console.log('\n=== Products with Images ===\n');
    productsWithImages.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Images: ${p.productImages.length}`);
        p.productImages.forEach((pi, j) => {
            console.log(`   ${j + 1}. ${pi.image.url.substring(0, 60)}... (Primary: ${pi.isPrimary})`);
        });
        console.log('');
    });
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        prisma.$disconnect();
        process.exit(1);
    });
