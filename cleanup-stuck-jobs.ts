import { prisma } from './lib/prisma';

async function cleanupStuckJobs() {
  try {
    console.log('Ì¥ç Checking for stuck WAITING jobs...');
    
    // Get all WAITING jobs from database
    const waitingJobs = await prisma.scrapeJob.findMany({
      where: { status: 'WAITING' },
      select: { id: true, jobId: true, createdAt: true, mode: true }
    });
    
    console.log(`Ì≥ä Found ${waitingJobs.length} WAITING jobs in database`);
    
    // Mark jobs older than 30 minutes as stuck (auto-scraper jobs should start immediately)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckJobs = waitingJobs.filter(j => j.createdAt < thirtyMinutesAgo);
    
    console.log(`‚è∞ Found ${stuckJobs.length} jobs older than 30 minutes (likely stuck)`);
    
    if (stuckJobs.length > 0) {
      console.log('Ì∑π Cleaning up stuck jobs...');
      
      const result = await prisma.scrapeJob.updateMany({
        where: {
          id: { in: stuckJobs.map(j => j.id) }
        },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
      
      console.log(`‚úÖ Successfully cancelled ${result.count} stuck jobs`);
    } else {
      console.log('‚ú® No stuck jobs found - database is clean!');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('‚ùå Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupStuckJobs();
