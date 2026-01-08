import { auth } from '@/auth/auth';
import { prisma } from '@/lib/prisma';

async function debugUserRole() {
    console.log('🔍 Debugging user role discrepancy...');
    
    try {
        // 1. Check database directly
        const dbUser = await prisma.user.findUnique({
            where: { email: 'weblem00@gmail.com' },
            select: { id: true, name: true, email: true, role: true }
        });
        
        console.log('📊 Database user data:', dbUser);
        
        // 2. Check current session
        const session = await auth();
        console.log('🔐 Current session data:', {
            user: session?.user,
            role: session?.user?.role
        });
        
        // 3. If session exists, check database for session user
        if (session?.user?.email) {
            const sessionDbUser = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true, name: true, email: true, role: true }
            });
            console.log('👤 Session user in DB:', sessionDbUser);
        }
        
        // 4. Check if there's a mismatch
        if (dbUser && session?.user?.email === 'weblem00@gmail.com') {
            console.log('⚠️ ROLE MISMATCH DETECTED!');
            console.log('Database role:', dbUser.role);
            console.log('Session role:', session.user.role);
        }
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugUserRole();