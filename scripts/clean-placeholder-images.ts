import { prisma } from '@/lib/prisma';
import 'dotenv/config';

async function main() {
    console.log('Cleaning placeholder images...');

    // Delete all ProductImage relations
    const deletedRelations = await prisma.image.deleteMany();
    console.log(`Deleted ${deletedRelations.count} ProductImage relations`);

    // Delete placeholder images
    const deletedImages = await prisma.image.deleteMany({
        where: {
            url: { contains: 'no_image_disclaimer' }
        }
    });
    console.log(`Deleted ${deletedImages.count} placeholder images`);

    console.log('Done!');
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        prisma.$disconnect();
        process.exit(1);
    });
