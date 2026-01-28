import { PrismaClient } from '@prisma/client';

// Test với connection thực tế mà NextAuth đang dùng
console.log('🔍 Environment Variables Debug:');
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

// Tạo Prisma client trực tiếp để test
const testPrisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function testDirectConnection() {
    try {
        console.log('\n🔍 Testing direct Prisma connection...');
        
        // Test basic connection
        await testPrisma.$connect();
        console.log('✅ Connection successful');
        
        // Test a simple query
        const userCount = await testPrisma.user.count();
        console.log(`👥 Users found: ${userCount}`);
        
        // Test if we can see any users with specific ID
        const specificUser = await testPrisma.user.findUnique({
            where: { id: 'cmk49wtam00006wsbzg5io2ci' }
        });
        console.log('🔍 Specific user from logs:', specificUser ? '✅ Found' : '❌ Not found');
        
        // List all databases accessible
        try {
            const databases = await testPrisma.$queryRaw`SELECT datname FROM pg_database WHERE datistemplate = false`;
            console.log('\n📊 Available databases:', databases);
        } catch (error) {
            console.log('❌ Cannot list databases:', error);
        }
        
        // Check current database
        try {
            const currentDb = await testPrisma.$queryRaw`SELECT current_database()`;
            console.log('📍 Currently connected to:', currentDb);
        } catch (error) {
            console.log('❌ Cannot get current database:', error);
        }
        
    } catch (error) {
        console.error('❌ Connection error:', error);
    } finally {
        await testPrisma.$disconnect();
    }
}

testDirectConnection();