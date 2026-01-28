const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupStuckJobs() {
  try {
    console.log('Checking for stuck WAITING jobs...');
    
    // Get all WAITING jobs from database
    const waitingJobs = await prisma.scrapeJob.findMany({
      where: { status: 'WAITING' },
      select: { id: true, jobId: true, createdAt: true }
    });
    
    console.log(`Found ${waitingJobs.length} WAITING jobs in database`);
    
    // For now, let's just mark jobs older than 1 hour as CANCELLED
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stuckJobs = waitingJobs.filter(j => j.createdAt < oneHourAgo);
    
    console.log(`Found ${stuckJobs.length} jobs older than 1 hour (likely stuck)`);
    
    if (stuckJobs.length > 0) {
      const result = await prisma.scrapeJob.updateMany({
        where: {
          id: { in: stuckJobs.map(j => j.id) }
        },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Cancelled ${result.count} stuck jobs`);
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupStuckJobs();
