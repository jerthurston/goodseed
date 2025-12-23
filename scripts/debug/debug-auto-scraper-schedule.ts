/**
 * Script để debug vấn đề Start All Auto Scrapers không tạo jobs
 */

import { prisma } from '../../lib/prisma';
import { AutoScraperScheduler } from '../../lib/services/auto-scraper/backend/auto-scraper-scheduler.service';
import Bull from 'bull';
import Redis from 'ioredis';

// Setup Redis connection (same as queue config)
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
};

const redis = new Redis(redisConfig);
const autoScrapeQueue = new Bull('autoScrapeQueue', { redis: redisConfig });

async function debugAutoScraperSchedule() {
  console.log('🔍 DEBUGGING AUTO SCRAPER SCHEDULE');
  console.log('=====================================\n');

  try {
    // 1. Kiểm tra sellers có đủ điều kiện
    console.log('1. Checking sellers eligibility...');
    const allSellers = await prisma.seller.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        autoScrapeInterval: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`📊 Total sellers: ${allSellers.length}`);
    
    // Group sellers by conditions
    const activeSellers = allSellers.filter(s => s.isActive);
    const autoScrapeEnabledSellers = activeSellers.filter(s => s.autoScrapeInterval && s.autoScrapeInterval > 0);
    
    console.log(`✅ Active sellers: ${activeSellers.length}`);
    console.log(`⏰ Auto-scrape enabled sellers: ${autoScrapeEnabledSellers.length}`);
    
    if (autoScrapeEnabledSellers.length === 0) {
      console.log('❌ NO SELLERS WITH AUTO-SCRAPE ENABLED!');
      console.log('\nSellers status breakdown:');
      
      allSellers.forEach(seller => {
        console.log(`- ${seller.name}:`);
        console.log(`  ├─ Active: ${seller.isActive}`);
        console.log(`  ├─ Auto Interval: ${seller.autoScrapeInterval || 'NULL'}`);
        console.log(`  └─ Last Updated: ${seller.updatedAt.toISOString()}`);
      });
      
      console.log('\n💡 TO FIX: Enable auto-scrape for at least one seller:');
      console.log('   - Set isActive = true');
      console.log('   - Set autoScrapeInterval > 0 (hours)');
      return;
    }

    console.log('\n📋 Auto-scrape enabled sellers:');
    autoScrapeEnabledSellers.forEach(seller => {
      console.log(`- ${seller.name}: every ${seller.autoScrapeInterval}h`);
    });

    // 2. Kiểm tra Redis connection
    console.log('\n2. Checking Redis connection...');
    try {
      await redis.ping();
      console.log('✅ Redis connection: OK');
    } catch (error) {
      console.log('❌ Redis connection: FAILED');
      console.error('Error:', error);
      return;
    }

    // 3. Kiểm tra queue trước khi schedule
    console.log('\n3. Checking queue status BEFORE scheduling...');
    const beforeStats = await getQueueStats();
    console.log('Queue stats BEFORE:');
    console.log(`- Waiting jobs: ${beforeStats.waiting}`);
    console.log(`- Active jobs: ${beforeStats.active}`);
    console.log(`- Completed jobs: ${beforeStats.completed}`);
    console.log(`- Failed jobs: ${beforeStats.failed}`);
    console.log(`- Delayed jobs: ${beforeStats.delayed}`);

    // 4. Clear queue để test clean
    console.log('\n4. Clearing existing jobs...');
    await autoScrapeQueue.clean(0, 'completed');
    await autoScrapeQueue.clean(0, 'failed');
    await autoScrapeQueue.clean(0, 'active');
    await autoScrapeQueue.clean(0, 'wait');
    await autoScrapeQueue.clean(0, 'delayed');
    
    const afterCleanStats = await getQueueStats();
    console.log('✅ Queue cleaned');
    console.log(`- Remaining jobs: ${afterCleanStats.waiting + afterCleanStats.active + afterCleanStats.delayed}`);

    // 5. Run initializeAllAutoJobs
    console.log('\n5. Running initializeAllAutoJobs()...');
    const startTime = Date.now();
    
    try {
      await AutoScraperScheduler.initializeAllAutoJobs();
      const endTime = Date.now();
      console.log(`✅ initializeAllAutoJobs completed in ${endTime - startTime}ms`);
    } catch (error) {
      console.log('❌ initializeAllAutoJobs FAILED');
      console.error('Error:', error);
      return;
    }

    // 6. Kiểm tra queue sau khi schedule
    console.log('\n6. Checking queue status AFTER scheduling...');
    // Wait a bit for jobs to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const afterStats = await getQueueStats();
    console.log('Queue stats AFTER:');
    console.log(`- Waiting jobs: ${afterStats.waiting}`);
    console.log(`- Active jobs: ${afterStats.active}`);
    console.log(`- Completed jobs: ${afterStats.completed}`);
    console.log(`- Failed jobs: ${afterStats.failed}`);
    console.log(`- Delayed jobs: ${afterStats.delayed}`);

    const totalNewJobs = afterStats.waiting + afterStats.active + afterStats.delayed + afterStats.completed + afterStats.failed;
    
    if (totalNewJobs === 0) {
      console.log('\n❌ NO JOBS CREATED!');
      console.log('\nPossible issues:');
      console.log('1. Logic trong initializeAllAutoJobs có vấn đề');
      console.log('2. Sellers không đủ điều kiện sau khi filter');
      console.log('3. Queue connection có vấn đề');
    } else {
      console.log(`\n✅ SUCCESS! Created ${totalNewJobs} jobs`);
      
      // 7. List scheduled jobs details
      console.log('\n7. Job details:');
      const jobs = await autoScrapeQueue.getJobs(['waiting', 'delayed', 'active'], 0, -1);
      
      jobs.forEach((job, index) => {
        console.log(`Job ${index + 1}:`);
        console.log(`  ├─ ID: ${job.id}`);
        console.log(`  ├─ Data: ${JSON.stringify(job.data)}`);
        console.log(`  ├─ State: ${job.opts.delay ? 'delayed' : 'waiting'}`);
        console.log(`  └─ Delay: ${job.opts.delay || 0}ms`);
      });
    }

    // 8. Test thêm: tạo manual job để verify queue hoạt động
    console.log('\n8. Testing manual job creation...');
    const testJob = await autoScrapeQueue.add('test', { 
      sellerId: 'test-seller',
      testMode: true 
    });
    console.log(`✅ Manual test job created: ${testJob.id}`);

    const finalStats = await getQueueStats();
    console.log(`Final queue stats: ${finalStats.waiting + finalStats.active + finalStats.delayed} total jobs`);

  } catch (error) {
    console.error('💥 Script error:', error);
  } finally {
    await redis.disconnect();
    await autoScrapeQueue.close();
    console.log('\n🏁 Debug script completed');
  }
}

async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    autoScrapeQueue.getWaiting(),
    autoScrapeQueue.getActive(), 
    autoScrapeQueue.getCompleted(),
    autoScrapeQueue.getFailed(),
    autoScrapeQueue.getDelayed(),
  ]);

  return {
    waiting: waiting.length,
    active: active.length, 
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
  };
}

// Run the debug script
debugAutoScraperSchedule();