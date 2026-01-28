'use client';

import { useState, useEffect } from 'react';
import HomepageContentTab from './cms/HomepageContentTab';
import FaqContentTab from './cms/FaqContentTab';
import styles from './dashboardAdmin.module.css';

type ContentTab = 'homepage' | 'faq';

interface ContentManagementTabContentProps {
  activeContentTab?: ContentTab;
}

export default function ContentManagementTabContent({ 
  activeContentTab: initialTab = 'homepage' 
}: ContentManagementTabContentProps) {
  const [activeContentTab, setActiveContentTab] = useState<ContentTab>(initialTab);

  // Update active tab when prop changes
  useEffect(() => {
    setActiveContentTab(initialTab);
  }, [initialTab]);

  return (
    <div className={styles.contentManagementContainer}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Content Management</h2>
        <p className={styles.contentSubtitle}>
          Edit website content without redeploying
        </p>
      </div>

      {/* Tab Content - No tabs, direct render based on prop */}
      <div className={styles.contentTabContent}>
        {activeContentTab === 'homepage' && <HomepageContentTab />}
        {activeContentTab === 'faq' && <FaqContentTab />}
      </div>
    </div>
  );
}
