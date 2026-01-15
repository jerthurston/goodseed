/**
 * Admin User Detail Page
 * 
 * View detailed user information with tabs:
 * - Overview: Basic info, stats
 * - Activity: User activity log
 * - Actions: Admin actions (ban, delete, etc.)
 */

'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faUser,
  faEnvelope,
  faCalendar,
  faDollarSign,
  faShoppingCart,
  faHeart,
  faChartLine,
  faBan,
  faTrash,
  faEdit,
  faShield,
  faClock,
  faMapMarkerAlt,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { 
  useFetchUserDetail, 
  useFetchUserActivity, 
  useUpdateUser,
  useDeleteUser,
  useUserActions 
} from '@/hooks/admin/users';
import { useRouter } from 'next/navigation';
import styles from '../../../(components)/dashboardAdmin.module.css';

type TabType = 'overview' | 'activity' | 'actions';

interface UserDetailProps {
  params: Promise<{ userId: string }>;
}

export default function UserDetailPage({ params }: UserDetailProps) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Fetch user data
  const { data: userData, isLoading, error } = useFetchUserDetail(userId);
  const { data: activityData, isLoading: isActivityLoading } = useFetchUserActivity({ userId });
  
  // Mutations
  const { mutate: performAction } = useUserActions();
  const { mutate: deleteUser } = useDeleteUser();

  if (isLoading) {
    return (
      <div className={styles.detailLoadingContainer}>
        <FontAwesomeIcon icon={faSpinner} spin className={styles.detailLoadingIcon} />
        <p className={styles.detailLoadingText}>Loading user details...</p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className={styles.detailErrorContainer}>
        <p className={styles.detailErrorText}>User not found or error loading data</p>
        <Link href="/dashboard/admin" className={styles.backLink}>
          Back to Admin Dashboard
        </Link>
      </div>
    );
  }

  const user = userData.user;

  return (
    <div className={styles.userDetailPage}>
      {/* Back Button */}
      <Link href="/dashboard/admin" className={styles.backLink}>
        <FontAwesomeIcon icon={faArrowLeft} /> Back to Admin Dashboard
      </Link>

      {/* User Header */}
      <div className={styles.userHeader}>
        <div className={styles.userHeaderContent}>
          {/* Avatar */}
          <div className={styles.userDetailAvatar}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>

          {/* User Info */}
          <div className={styles.userHeaderInfo}>
            <div className={styles.userHeaderTop}>
              <h1 className={styles.userDetailName}>{user.name || 'Unknown User'}</h1>
              <div>
                <span className={`${styles.userDetailBadge} ${
                user.role === 'ADMIN' ? styles.badgeAdmin : 
                user.role === 'BANNED' ? styles.badgeBanned : 
                styles.badgeUser
              }`}>
                {user.role}
              </span>
              {user.emailVerified && (
                <span className={`${styles.userDetailBadge} ${styles.badgeVerified}`}>
                  ✓ Verified
                </span>
              )}
              </div>
            </div>
            
            <div className={styles.userMetadata}>
              <div className={styles.metadataItem}>
                <FontAwesomeIcon icon={faEnvelope} className={styles.metadataIcon} />
                <span>{user.email}</span>
              </div>
              <div className={styles.metadataItem}>
                <FontAwesomeIcon icon={faCalendar} className={styles.metadataIcon} />
                <span>Joined {user.acquisitionDate ? new Date(user.acquisitionDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className={styles.metadataItem}>
                <FontAwesomeIcon icon={faClock} className={styles.metadataIcon} />
                <span>Last active {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}</span>
              </div>
              <div className={styles.metadataItem}>
                <FontAwesomeIcon icon={faMapMarkerAlt} className={styles.metadataIcon} />
                <span>Source: {user.acquisitionSource || 'Direct'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsList}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
          >
            <FontAwesomeIcon icon={faUser} className={styles.tabIcon} /> Overview
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`${styles.tabButton} ${activeTab === 'activity' ? styles.tabButtonActive : ''}`}
          >
            <FontAwesomeIcon icon={faChartLine} className={styles.tabIcon} /> Activity
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`${styles.tabButton} ${activeTab === 'actions' ? styles.tabButtonActive : ''}`}
          >
            <FontAwesomeIcon icon={faShield} className={styles.tabIcon} /> Actions
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab user={user} />
      )}

      {activeTab === 'activity' && (
        <ActivityTab userId={userId} activities={activityData?.activities || []} isLoading={isActivityLoading} />
      )}

      {activeTab === 'actions' && (
        <ActionsTab user={user} performAction={performAction} deleteUser={deleteUser} router={router} />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ user }: { user: any }) {
  return (
    <div className={styles.overviewTab}>
      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={faDollarSign}
          label="Total Spent"
          value={`$${user.totalSpent?.toFixed(2) || '0.00'}`}
          colorClass={styles.actionIconSuccess}
        />
        <StatCard
          icon={faShoppingCart}
          label="Orders"
          value="0"
          colorClass={styles.actionIconInfo}
        />
        <StatCard
          icon={faHeart}
          label="Wishlist Items"
          value={user._count?.wishlist?.toString() || '0'}
          colorClass={styles.actionIconDanger}
        />
        <StatCard
          icon={faChartLine}
          label="Lifetime Value"
          value={`$${(user.lifetimeValue || 0).toFixed(2)}`}
          colorClass={styles.actionIconWarning}
        />
      </div>

      {/* User Details */}
      <div className={styles.detailsGrid}>
        {/* Personal Information */}
        <div className={styles.detailCard}>
          <h3 className={styles.detailCardTitle}>Personal Information</h3>
          <div className={styles.detailCardContent}>
            <DetailRow label="Full Name" value={user.name || 'N/A'} />
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="Bio" value={user.bio || 'No bio provided'} />
            <DetailRow label="Language" value={user.preferredLanguage?.toUpperCase() || 'EN'} />
          </div>
        </div>

        {/* Account Information */}
        <div className={styles.detailCard}>
          <h3 className={styles.detailCardTitle}>Account Information</h3>
          <div className={styles.detailCardContent}>
            <DetailRow label="User ID" value={user.id} />
            <DetailRow label="Role" value={user.role} />
            <DetailRow 
              label="Email Verified" 
              value={user.emailVerified ? 'Yes ✓' : 'No ✗'} 
            />
            <DetailRow 
              label="Acquisition Source" 
              value={user.acquisitionSource || 'Direct'} 
            />
            <DetailRow 
              label="2FA Enabled" 
              value="No" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ userId, activities, isLoading }: { userId: string; activities: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className={styles.detailLoadingContainer}>
        <FontAwesomeIcon icon={faSpinner} spin className={styles.detailLoadingIcon} />
        <p className={styles.detailLoadingText}>Loading activity...</p>
      </div>
    );
  }

  return (
    <div className={styles.activityTab}>
      <div className={styles.activityContainer}>
        <h3 className={styles.activityTitle}>Recent Activity</h3>
        
        {activities && activities.length > 0 ? (
          <div className={styles.activityList}>
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                date={new Date(activity.date).toLocaleDateString()}
                action={activity.action}
                details={activity.details}
              />
            ))}
          </div>
        ) : (
          <div className={styles.activityEmpty}>
            <p className={styles.activityEmptyText}>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Actions Tab Component
function ActionsTab({ user, performAction, deleteUser, router }: { user: any; performAction: any; deleteUser: any; router: any }) {
  const handleAction = (action: string) => {
    const actionMessages: Record<string, string> = {
      BAN: `ban user "${user.name || user.email}"`,
      UNBAN: `unban user "${user.name || user.email}"`,
      PROMOTE: `promote "${user.name || user.email}" to admin`,
      DEMOTE: `demote "${user.name || user.email}" from admin`,
      VERIFY_EMAIL: `verify email for "${user.name || user.email}"`
    };

    if (confirm(`Are you sure you want to ${actionMessages[action]}?`)) {
      performAction({ userId: user.id, action });
    }
  };

  const handleDelete = () => {
    if (confirm(`⚠️ WARNING: This will permanently delete user "${user.name || user.email}" and all their data. This action CANNOT be undone. Are you absolutely sure?`)) {
      deleteUser(user.id, {
        onSuccess: () => {
          router.push('/dashboard/admin');
        }
      });
    }
  };

  return (
    <div className={styles.actionsTab}>
      <div className={styles.actionsContainer}>
        <h3 className={styles.actionsTitle}>Admin Actions</h3>
        
        <div className={styles.actionsList}>
          <ActionButton
            icon={faEdit}
            label="Edit User Profile"
            description="Modify user information and settings"
            variant="info"
            onClick={() => alert('Edit functionality coming soon')}
          />
          
          {!user.emailVerified && (
            <ActionButton
              icon={faShield}
              label="Verify Email"
              description="Manually verify user email address"
              variant="success"
              onClick={() => handleAction('VERIFY_EMAIL')}
            />
          )}
          
          {user.role === 'USER' && (
            <ActionButton
              icon={faShield}
              label="Promote to Admin"
              description="Grant admin privileges to this user"
              variant="warning"
              onClick={() => handleAction('PROMOTE')}
            />
          )}
          
          {user.role === 'ADMIN' && (
            <ActionButton
              icon={faShield}
              label="Demote from Admin"
              description="Remove admin privileges"
              variant="warning"
              onClick={() => handleAction('DEMOTE')}
            />
          )}
          
          {user.role !== 'BANNED' && user.role !== 'ADMIN' && (
            <ActionButton
              icon={faBan}
              label="Ban User"
              description="Suspend user account temporarily"
              variant="danger"
              onClick={() => handleAction('BAN')}
            />
          )}
          
          {user.role === 'BANNED' && (
            <ActionButton
              icon={faShield}
              label="Unban User"
              description="Restore user account access"
              variant="success"
              onClick={() => handleAction('UNBAN')}
            />
          )}
          
          {user.role !== 'ADMIN' && (
            <ActionButton
              icon={faTrash}
              label="Delete User"
              description="Permanently delete user and all data"
              variant="danger"
              onClick={handleDelete}
              dangerous
            />
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className={styles.dangerZone}>
        <h4 className={styles.dangerZoneTitle}>⚠️ Danger Zone</h4>
        <p className={styles.dangerZoneDescription}>
          Actions in this section are irreversible. Please proceed with caution.
        </p>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, colorClass }: any) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardHeader}>
        <FontAwesomeIcon icon={icon} className={`${styles.statCardIcon} ${colorClass}`} />
        <span className={styles.statCardLabel}>{label}</span>
      </div>
      <div className={styles.statCardValue}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
}

function ActivityItem({ date, action, details }: any) {
  return (
    <div className={styles.activityItem}>
      <div className={styles.activityDot} />
      <div className={styles.activityDate}>{date}</div>
      <div className={styles.activityAction}>{action}</div>
      <div className={styles.activityDetails}>{details}</div>
    </div>
  );
}

function ActionButton({ icon, label, description, variant, onClick, disabled, dangerous }: any) {
  const variantClasses = {
    info: { button: styles.actionButtonInfo, icon: styles.actionIconInfo },
    success: { button: styles.actionButtonSuccess, icon: styles.actionIconSuccess },
    warning: { button: styles.actionButtonWarning, icon: styles.actionIconWarning },
    danger: { button: styles.actionButtonDanger, icon: styles.actionIconDanger }
  };

  const classes = variantClasses[variant as keyof typeof variantClasses] || variantClasses.info;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${styles.actionButton} ${classes.button}`}
    >
      <FontAwesomeIcon 
        icon={icon} 
        className={`${styles.actionIcon} ${disabled ? '' : classes.icon}`}
      />
      <div className={styles.actionContent}>
        <div className={styles.actionLabel}>{label}</div>
        <div className={styles.actionDescription}>{description}</div>
      </div>
    </button>
  );
}
