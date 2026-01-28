import { prisma } from '@/lib/prisma';

async function checkUserRole() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'weblem00@gmail.com' },
            select: { 
                id: true,
                email: true,
                name: true,
                role: true,
                acquisitionDate: true
            }
        });

        console.log('🔍 Direct Database Query Result:');
        console.log(JSON.stringify(user, null, 2));

        if (user) {
            console.log(`\n✅ User found: ${user.email}`);
            console.log(`📋 Current role: ${user.role}`);
            console.log(`🆔 User ID: ${user.id}`);
        } else {
            console.log('❌ User not found');
        }
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserRole();