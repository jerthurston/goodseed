import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 API Debug: Environment check');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
        
        if (process.env.DATABASE_URL) {
            const dbUrl = process.env.DATABASE_URL;
            const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
            if (urlParts) {
                console.log('🔗 API Runtime DATABASE_URL:');
                console.log(`   Host: ${urlParts[3]}`);
                console.log(`   Port: ${urlParts[4]}`);
                console.log(`   Database: ${urlParts[5]}`);
                console.log(`   Username: ${urlParts[1]}`);
            }
        }

        // Test database trong runtime NextJS
        console.log('🔍 Testing database in NextJS runtime...');
        
        const userCount = await prisma.user.count();
        const accountCount = await prisma.account.count();
        const sessionCount = await prisma.session.count();
        
        // Check current database
        const currentDb = await prisma.$queryRaw`SELECT current_database() as dbname`;
        
        // Search for specific user
        const specificUser = await prisma.user.findUnique({
            where: { id: 'cmk49wtam00006wsbzg5io2ci' }
        });
        
        const result = {
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                DATABASE_URL_SET: !!process.env.DATABASE_URL,
                DATABASE_URL_DB: process.env.DATABASE_URL?.split('/').pop()
            },
            database: {
                currentDatabase: currentDb,
                counts: {
                    users: userCount,
                    accounts: accountCount, 
                    sessions: sessionCount
                }
            },
            specificUserCheck: {
                found: !!specificUser,
                user: specificUser || null
            }
        };

        console.log('🔍 API Debug Result:', JSON.stringify(result, null, 2));

        return NextResponse.json(result);

    } catch (error) {
        console.error('❌ API Debug Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}