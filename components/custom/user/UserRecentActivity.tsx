import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserPlus, 
  faHeart, 
  faBell, 
  faShoppingCart,
  faSearch,
  faEye,
  faClock 
} from '@fortawesome/free-solid-svg-icons';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface UserActivity {
  id: string;
  type: 'registration' | 'wishlist' | 'stock-alert' | 'cart-add' | 'search' | 'view';
  userId: string;
  userName: string;
  userEmail?: string;
  description: string;
  timestamp: Date;
  metadata?: {
    productName?: string;
    searchTerm?: string;
    location?: string;
  };
}

interface UserRecentActivityProps {
  // No props needed for MVP - uses mock data
}

export default function UserRecentActivity({}: UserRecentActivityProps) {
  // Mock user activity data for cannabis marketplace
  const mockActivities: UserActivity[] = [
    {
      id: '1',
      type: 'registration',
      userId: 'user_001',
      userName: 'Sarah M.',
      userEmail: 'sarah@example.com',
      description: 'New user registered from Vancouver, BC',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      metadata: {
        location: 'Vancouver, BC'
      }
    },
    {
      id: '2',
      type: 'wishlist',
      userId: 'user_002',
      userName: 'Mike K.',
      description: 'Added Blue Dream to wishlist',
      timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
      metadata: {
        productName: 'Blue Dream Feminized Seeds'
      }
    },
    {
      id: '3',
      type: 'stock-alert',
      userId: 'user_003',
      userName: 'Jessica L.',
      description: 'Subscribed to White Widow restock alerts',
      timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
      metadata: {
        productName: 'White Widow Autoflower'
      }
    },
    {
      id: '4',
      type: 'cart-add',
      userId: 'user_004',
      userName: 'David R.',
      description: 'Added Girl Scout Cookies to cart',
      timestamp: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      metadata: {
        productName: 'Girl Scout Cookies (3 seeds)'
      }
    },
    {
      id: '5',
      type: 'search',
      userId: 'user_005',
      userName: 'Emma W.',
      description: 'Searched for high CBD strains',
      timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      metadata: {
        searchTerm: 'CBD strains low THC'
      }
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return faUserPlus;
      case 'wishlist':
        return faHeart;
      case 'stock-alert':
        return faBell;
      case 'cart-add':
        return faShoppingCart;
      case 'search':
        return faSearch;
      case 'view':
        return faEye;
      default:
        return faClock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'var(--status-success)';
      case 'wishlist':
        return 'var(--status-info)';
      case 'stock-alert':
        return 'var(--status-warning)';
      case 'cart-add':
        return 'var(--brand-primary)';
      case 'search':
        return 'var(--brand-secondary)';
      case 'view':
        return 'var(--text-primary-muted)';
      default:
        return 'var(--text-primary-muted)';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'registration':
        return 'New User';
      case 'wishlist':
        return 'Wishlist';
      case 'stock-alert':
        return 'Stock Alert';
      case 'cart-add':
        return 'Cart Addition';
      case 'search':
        return 'Search';
      case 'view':
        return 'Product View';
      default:
        return 'Activity';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    try {
      const now = new Date();
      const diffInMs = now.getTime() - timestamp.getTime();
      
      if (diffInMs < 0 || isNaN(diffInMs)) {
        return 'Unknown time';
      }
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      const weeks = Math.floor(diffInDays / 7);
      if (weeks < 4) return `${weeks}w ago`;
      
      return timestamp.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  };

  return (
    <DashboardCard className={styles.card}>
      <DashboardCardHeader className={styles.cardHeader}>
        <h3 
          className="text-lg font-['Archivo_Black'] uppercase tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          User Recent Activity
        </h3>
        <div 
          className="text-sm font-['Poppins']"
          style={{ color: 'var(--text-primary-muted)' }}
        >
          Latest customer interactions
        </div>
      </DashboardCardHeader>

      <div className={styles.cardBody}>
        <div className="space-y-4">
          {mockActivities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              {/* Activity Icon */}
              <div className="shrink-0">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: getActivityColor(activity.type) + '20',
                    border: `1px solid ${getActivityColor(activity.type)}`
                  }}
                >
                  <FontAwesomeIcon
                    icon={getActivityIcon(activity.type)}
                    className="text-sm"
                    style={{ color: getActivityColor(activity.type) }}
                  />
                </div>
              </div>

              {/* Activity Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-xs font-semibold font-['Poppins'] px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getActivityColor(activity.type) + '15',
                          color: getActivityColor(activity.type)
                        }}
                      >
                        {getActivityLabel(activity.type)}
                      </span>
                      <span 
                        className="text-xs font-['Poppins']"
                        style={{ color: 'var(--text-primary-muted)' }}
                      >
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    
                    <h4 
                      className="text-sm font-semibold font-['Poppins'] truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {activity.userName}
                    </h4>
                    
                    <p 
                      className="text-xs font-['Poppins'] truncate"
                      style={{ color: 'var(--text-primary-muted)' }}
                    >
                      {activity.description}
                    </p>
                    
                    {/* Metadata */}
                    {activity.metadata?.productName && (
                      <p 
                        className="text-xs font-['Poppins'] mt-1"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        📦 {activity.metadata.productName}
                      </p>
                    )}
                    
                    {activity.metadata?.searchTerm && (
                      <p 
                        className="text-xs font-['Poppins'] mt-1"
                        style={{ color: 'var(--brand-secondary)' }}
                      >
                        🔍 "{activity.metadata.searchTerm}"
                      </p>
                    )}
                    
                    {activity.metadata?.location && (
                      <p 
                        className="text-xs font-['Poppins'] mt-1"
                        style={{ color: 'var(--status-info)' }}
                      >
                        📍 {activity.metadata.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {mockActivities.length === 0 && (
            <div className="text-center py-8">
              <FontAwesomeIcon
                icon={faClock}
                className="text-2xl mb-3"
                style={{ color: 'var(--text-primary-muted)' }}
              />
              <p 
                className="font-['Poppins']"
                style={{ color: 'var(--text-primary-muted)' }}
              >
                No recent user activity
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}