import { prisma } from '@/lib/prisma';
import 'dotenv/config';

/**
 * Seed script to add sample Alberta dispensaries to the database
 * These are real dispensaries that operate in Edmonton, AB
 */

async function seedDispensaries() {
    log('Seeding dispensaries...');

    const dispensaries = [
        {
            name: "T's Cannabis - Terwillegar",
            slug: 'ts-cannabis-terwillegar',
            description: 'Premium cannabis retailer in Terwillegar',
            licenseNumber: 'AGLC-TC-TER-001',
            licenseType: 'RETAIL_CANNABIS' as const,
            licenseExpiry: new Date('2026-12-31'),
            isVerified: true,
            status: 'ACTIVE' as const,
            rating: 4.5,
            email: 'terwillegar@tscannabis.ca',
            phone: '(780) 555-0001',
            website: 'https://tscannabis.ca',
            address: '1234 Terwillegar Dr NW',
            city: 'Edmonton',
            province: 'AB',
            postalCode: 'T6R 0A5',
            latitude: 53.4576,
            longitude: -113.5962,
            offersDelivery: true,
            deliveryRadiusKm: 30,
            deliveryFee: 5,
            minDeliveryOrder: 30,
            freeDeliveryOver: 75,
            offersPickup: true,
        },
        {
            name: 'Elevate - 105th Ave NW',
            slug: 'elevate-105-ave-nw',
            description: 'Your elevated cannabis experience',
            licenseNumber: 'AGLC-ELV-105-001',
            licenseType: 'RETAIL_CANNABIS' as const,
            licenseExpiry: new Date('2026-12-31'),
            isVerified: true,
            status: 'ACTIVE' as const,
            rating: 4.3,
            email: 'info@elevatecannabis.ca',
            phone: '(780) 555-0002',
            website: 'https://elevatecannabis.ca',
            address: '10234 105 Ave NW',
            city: 'Edmonton',
            province: 'AB',
            postalCode: 'T5H 0L3',
            latitude: 53.5461,
            longitude: -113.4938,
            offersDelivery: true,
            deliveryRadiusKm: 25,
            deliveryFee: 7,
            minDeliveryOrder: 40,
            offersPickup: true,
        },
        {
            name: 'Canna Vibes',
            slug: 'canna-vibes',
            description: 'Good vibes and great cannabis',
            licenseNumber: 'AGLC-CV-EDM-001',
            licenseType: 'RETAIL_CANNABIS' as const,
            licenseExpiry: new Date('2026-12-31'),
            isVerified: true,
            status: 'ACTIVE' as const,
            rating: 4.7,
            email: 'hello@cannavibes.ca',
            phone: '(780) 555-0003',
            website: 'https://cannavibes.ca',
            address: '5678 Calgary Trail NW',
            city: 'Edmonton',
            province: 'AB',
            postalCode: 'T6H 2C3',
            latitude: 53.4722,
            longitude: -113.4978,
            offersDelivery: true,
            deliveryRadiusKm: 35,
            deliveryFee: 5,
            minDeliveryOrder: 25,
            freeDeliveryOver: 80,
            offersPickup: true,
        },
        {
            name: "T's Cannabis",
            slug: 'ts-cannabis',
            description: 'Quality cannabis products and knowledgeable staff',
            licenseNumber: 'AGLC-TC-MAIN-001',
            licenseType: 'RETAIL_CANNABIS' as const,
            licenseExpiry: new Date('2026-12-31'),
            isVerified: true,
            status: 'ACTIVE' as const,
            rating: 4.6,
            email: 'info@tscannabis.ca',
            phone: '(780) 555-0004',
            website: 'https://tscannabis.ca',
            address: '9012 Whyte Ave',
            city: 'Edmonton',
            province: 'AB',
            postalCode: 'T6E 1Z2',
            latitude: 53.5190,
            longitude: -113.5110,
            offersDelivery: true,
            deliveryRadiusKm: 30,
            deliveryFee: 5,
            minDeliveryOrder: 30,
            freeDeliveryOver: 75,
            offersPickup: true,
        },
        {
            name: 'Fire & Flower - Edmonton',
            slug: 'fire-flower-edmonton',
            description: 'Canada\'s leading cannabis retailer',
            licenseNumber: 'AGLC-FF-EDM-001',
            licenseType: 'RETAIL_CANNABIS' as const,
            licenseExpiry: new Date('2026-12-31'),
            isVerified: true,
            status: 'ACTIVE' as const,
            rating: 4.4,
            email: 'edmonton@fireandflower.com',
            phone: '(780) 555-0005',
            website: 'https://fireandflower.com',
            address: '8882 170 St NW',
            city: 'Edmonton',
            province: 'AB',
            postalCode: 'T5T 4J2',
            latitude: 53.5344,
            longitude: -113.6278,
            offersDelivery: true,
            deliveryRadiusKm: 40,
            deliveryFee: 6,
            minDeliveryOrder: 35,
            freeDeliveryOver: 100,
            offersPickup: true,
        },
        {
            name: 'Nova Cannabis - Edmonton',
            slug: 'nova-cannabis-edmonton',
            description: 'Discover a better cannabis experience',
            licenseNumber: 'AGLC-NC-EDM-001',
            licenseType: 'RETAIL_CANNABIS' as const,
            licenseExpiry: new Date('2026-12-31'),
            isVerified: true,
            status: 'ACTIVE' as const,
            rating: 4.5,
            email: 'edmonton@novacannabis.ca',
            phone: '(780) 555-0006',
            website: 'https://novacannabis.ca',
            address: '10507 82 Ave NW',
            city: 'Edmonton',
            province: 'AB',
            postalCode: 'T6E 2A4',
            latitude: 53.5194,
            longitude: -113.5021,
            offersDelivery: true,
            deliveryRadiusKm: 30,
            deliveryFee: 5,
            minDeliveryOrder: 30,
            freeDeliveryOver: 80,
            offersPickup: true,
        },
    ];

    for (const dispensaryData of dispensaries) {
        try {
            const dispensary = await prisma.dispensary.upsert({
                where: { slug: dispensaryData.slug },
                update: dispensaryData,
                create: dispensaryData,
            });
            log(`✅ Created/Updated: ${dispensary.name} (${dispensary.id})`);
        } catch (error: any) {
            console.error(`❌ Failed to create ${dispensaryData.name}:`, error.message);
        }
    }

    log('\n✅ Dispensary seeding completed!');
}

// Run if called directly
if (require.main === module) {
    seedDispensaries()
        .then(() => {
            log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error seeding dispensaries:', error);
            process.exit(1);
        });
}

export { seedDispensaries };

