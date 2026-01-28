// Development helper for Demo Password Modal
// Add this to browser console for testing

/**
 * Clear demo access and reload page
 */
function clearDemoAccess() {
  localStorage.removeItem('goodseed_demo_access');
  window.location.reload();
  console.log('Demo access cleared. Page reloaded.');
}

/**
 * Check current demo access status
 */
function checkDemoAccess() {
  const hasAccess = localStorage.getItem('goodseed_demo_access');
  console.log('Demo access status:', hasAccess ? 'GRANTED' : 'NOT GRANTED');
  return hasAccess;
}

/**
 * Force show demo modal (for testing)
 */
function forceDemoModal() {
  localStorage.removeItem('goodseed_demo_access');
  console.log('Demo access cleared. Refresh page to see modal.');
}

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).clearDemoAccess = clearDemoAccess;
  (window as any).checkDemoAccess = checkDemoAccess;
  (window as any).forceDemoModal = forceDemoModal;
  
  console.log(`
  🔐 Demo Password Helpers Available:
  - clearDemoAccess() - Clear access and reload
  - checkDemoAccess() - Check current status  
  - forceDemoModal() - Force show modal on next load
  
  Current password: ${process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'goodseed2026'}
  `);
}