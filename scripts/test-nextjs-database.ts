// Load environment variables như Next.js
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local như Next.js
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

console.log('🔍 Environment Variables Debug (with proper loading):');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ❌');

if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (urlParts) {
        console.log('🔗 DATABASE_URL Details:');
        console.log(`   Host: ${urlParts[3]}`);
        console.log(`   Port: ${urlParts[4]}`);
        console.log(`   Database: ${urlParts[5]}`);
        console.log(`   Username: ${urlParts[1]}`);
    }
}

// Import prisma sau khi đã load environment
import { prisma } from '@/lib/prisma';

async function testNextJSDatabase() {
    try {
        console.log('\n🔍 Testing NextJS Prisma connection...');
        
        // Test basic connection
        console.log('✅ Prisma client loaded successfully');
        
        // Test connection với database
        await prisma.$connect();
        console.log('✅ Database connection successful');
        
        // Test user count
        const userCount = await prisma.user.count();
        console.log(`👥 Users found: ${userCount}`);
        
        // Test specific user từ logs
        const specificUser = await prisma.user.findUnique({
            where: { id: 'cmk49wtam00006wsbzg5io2ci' }
        });
        
        if (specificUser) {
            console.log('✅ Found specific user from logs:');
            console.log('   ID:', specificUser.id);
            console.log('   Email:', specificUser.email);
            console.log('   Name:', specificUser.name);
            console.log('   Role:', specificUser.role);
        } else {
            console.log('❌ Specific user from logs NOT found');
        }
        
        // Check current database
        try {
            const currentDb = await prisma.$queryRaw`SELECT current_database() as dbname`;
            console.log('📍 Currently connected database:', currentDb);
        } catch (error) {
            console.log('❌ Cannot get current database:', error);
        }
        
        // Kiểm tra accounts và sessions
        const accountCount = await prisma.account.count();
        const sessionCount = await prisma.session.count();
        console.log(`🔗 Accounts: ${accountCount}, Sessions: ${sessionCount}`);
        
        if (accountCount > 0) {
            const recentAccounts = await prisma.account.findMany({
                take: 3
            });
            console.log('📊 Recent accounts:');
            recentAccounts.forEach((account, index) => {
                console.log(`   ${index + 1}. Provider: ${account.provider}, UserID: ${account.userId}`);
            });
        }
        
    } catch (error) {
        console.error('❌ NextJS Database test error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testNextJSDatabase();