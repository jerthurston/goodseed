/**
 * User Management Tab Content
 * Displays list of users with search, filters, and actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faEye,
  faTrash,
  faBan,
  faUserShield,
  faCheckCircle,
  faSpinner,
  faUser,
  faFileDownload,
  faFileAlt,
  faBell,
  faBellSlash,
  faDollarSign,
  faBox
} from '@fortawesome/free-solid-svg-icons';
import { useFetchUsers, useDeleteUser, useUserActions } from '@/hooks/admin/users';
import ExportUserModal from './ExportUserModal';
import styles from './dashboardAdmin.module.css';

export default function UserManagementTabContent() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'USER' | 'ADMIN' | 'BANNED'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Fetch users
  const { data, isLoading, error } = useFetchUsers({
    search: searchTerm,
    role: roleFilter,
    page: currentPage,
    limit: 20
  });

  // Delete mutation
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  
  // Actions mutation
  const { mutate: performAction, isPending: isActing } = useUserActions();

  const handleViewUser = (userId: string) => {
    router.push(`/dashboard/admin/users/${userId}`);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      deleteUser(userId);
    }
  };

  const handleBanUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to ban user "${userName}"?`)) {
      performAction({ userId, action: 'BAN' });
    }
  };

  const handleUnbanUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to unban user "${userName}"?`)) {
      performAction({ userId, action: 'UNBAN' });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500 text-white';
      case 'BANNED':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={styles.userManagementHeader}>
        <div>
          <h2 className={styles.userManagementTitle}>
            User Management
          </h2>
          <p className={styles.userManagementSubtitle}>
            Manage all users in the system
          </p>
        </div>
      </div>

      {/* Filters Section - Brutalist Style */}
      <div className={styles.filtersSection}>
        <h3 className={styles.filtersTitle}>
          Filter Users
        </h3>

        <div className={styles.filtersGrid}>
          {/* Search Input */}
          <div className={styles.searchInputWrapper}>
            <FontAwesomeIcon 
              icon={faSearch} 
              className={styles.searchIcon}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          {/* Role Filter Dropdown */}
          <div className={styles.filterDropdownWrapper}>
            <FontAwesomeIcon 
              icon={faFilter} 
              className={styles.filterIcon}
            />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className={styles.roleFilterDropdown}
            >
              <option value="all">All Roles</option>
              <option value="USER">Users</option>
              <option value="ADMIN">Admins</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
        </div>

        {/* Stats Bar */}
        {data && (
         <div className={styles.statsContainer}>
           <div className={styles.statsBar}>
            <div className={styles.statsItemUser}>
              <FontAwesomeIcon icon={faUser} />
            <span className={styles.statsHighlight}>
              {data.pagination.total}
            </span>
            {/* <span>Users</span> */}
            </div>
            <span className={styles.statsSeparator}>•</span>
            <FontAwesomeIcon icon={faFileAlt} />
            {/* <span>Page</span> */}
            <span className={styles.statsHighlight}>
              {data.pagination.page}
            </span>
            <span>/</span>
            <span className={styles.statsHighlight}>
              {data.pagination.totalPages}
            </span>
          </div>

            {/*--> Export email with filter fields */}
            <button 
              className={styles.exportUserBtn}
              onClick={() => setIsExportModalOpen(true)}
            >
              <FontAwesomeIcon icon={faFileDownload} />
              <span className={styles.exportUserLabel}>Export User Data</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={styles.loadingContainer}>
          <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingIcon} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>
            Error loading users: {error.message}
          </p>
        </div>
      )}

      {/* Users Table - Brutalist Style */}
      {data && data.users.length > 0 && (
        <div className={styles.usersTableContainer}>
          <div className={styles.usersTableScroll}>
            <table className={styles.usersTable}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeaderCell}>User</th>
                  <th className={styles.tableHeaderCell}>Email</th>
                  <th className={styles.tableHeaderCell}>Role</th>
                  <th className={styles.tableHeaderCell}>Email Status</th>
                  <th className={styles.tableHeaderCell}>Notifications</th>
                  <th className={styles.tableHeaderCell}>Wishlist</th>
                  <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRight}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className={styles.tableRow}>
                    {/* User Info */}
                    <td className={styles.tableCell}>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className={styles.userName}>
                            {user.name || 'Unknown User'}
                          </div>
                          <div className={styles.userId}>
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className={styles.tableCell}>
                      <span className={styles.userEmail}>{user.email}</span>
                    </td>

                    {/* Role Badge */}
                    <td className={styles.tableCell}>
                      <span className={`${styles.roleBadge} ${
                        user.role === 'ADMIN' ? styles.roleBadgeAdmin :
                        user.role === 'BANNED' ? styles.roleBadgeBanned :
                        styles.roleBadgeUser
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className={styles.tableCell}>
                      {user.emailVerified ? (
                        <span className={styles.statusVerified}>
                          <FontAwesomeIcon icon={faCheckCircle} />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className={styles.statusUnverified}>
                          <span>Not Verified</span>
                        </span>
                      )}
                    </td>

                    {/* Notification Preferences */}
                    <td className={styles.tableCell}>
                      {user.notificationPreference ? (
                        <div className={styles.notificationPreferences}>
                          {user.notificationPreference.receiveSpecialOffers && (
                            <span 
                              className={styles.notificationBadge}
                              title="Receives Special Offers"
                            >
                              <FontAwesomeIcon icon={faBell} />
                            </span>
                          )}
                          {user.notificationPreference.receivePriceAlerts && (
                            <span 
                              className={styles.notificationBadge}
                              title="Receives Price Alerts"
                            >
                              <FontAwesomeIcon icon={faDollarSign} />
                            </span>
                          )}
                          {user.notificationPreference.receiveBackInStock && (
                            <span 
                              className={styles.notificationBadge}
                              title="Receives Back In Stock Alerts"
                            >
                              <FontAwesomeIcon icon={faBox} />
                            </span>
                          )}
                          {!user.notificationPreference.receiveSpecialOffers && 
                           !user.notificationPreference.receivePriceAlerts && 
                           !user.notificationPreference.receiveBackInStock && (
                            <span 
                              className={styles.notificationBadgeOff}
                              title="All notifications disabled"
                            >
                              <FontAwesomeIcon icon={faBellSlash} />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={styles.notificationBadgeNone}>
                          No preferences
                        </span>
                      )}
                    </td>

                    {/* Wishlist Count */}
                    <td className={styles.tableCell}>
                      <span className={styles.wishlistCount}>{user._count.wishlist} items</span>
                    </td>

                    {/* Action Buttons */}
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        {/* View Button */}
                       {/* <div className='w-4/12 flex items-center justify-center'> */}
                         <button
                          onClick={() => handleViewUser(user.id)}
                          className={`${styles.actionButton} ${styles.actionButtonView}`}
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                       {/* </div> */}

                        {/* Ban/Unban Button */}
                        {user.role === 'BANNED' ? (
                          <button
                            onClick={() => handleUnbanUser(user.id, user.name || user.email)}
                            disabled={isActing}
                            className={`${styles.actionButton} ${styles.actionButtonUnban}`}
                            title="Unban User"
                          >
                            <FontAwesomeIcon icon={faUserShield} />
                          </button>
                        ) : user.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleBanUser(user.id, user.name || user.email)}
                            disabled={isActing}
                            className={`${styles.actionButton} ${styles.actionButtonBan}`}
                            title="Ban User"
                          >
                            <FontAwesomeIcon icon={faBan} />
                          </button>
                        )}

                        {/* Delete Button */}
                        {user.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                            disabled={isDeleting}
                            className={`${styles.actionButton} ${styles.actionButtonDelete}`}
                            title="Delete User"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination - Brutalist Style */}
          {data.pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={styles.paginationButton}
              >
                ← Previous
              </button>

              <span className={styles.paginationInfo}>
                Page <span className={styles.statsHighlight}>{currentPage}</span> of <span className={styles.statsHighlight}>{data.pagination.totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={currentPage === data.pagination.totalPages}
                className={styles.paginationButton}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State - Brutalist Style */}
      {data && data.users.length === 0 && !isLoading && (
        <div className={styles.emptyStateContainer}>
          <div className={styles.emptyStateIcon}>
            <FontAwesomeIcon 
              icon={faUser} 
              className={styles.emptyStateIconSvg}
            />
          </div>
          <p className={styles.emptyStateTitle}>
            No users found matching your filters.
          </p>
          <p className={styles.emptyStateDescription}>
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Export User Modal */}
      <ExportUserModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        searchTerm={searchTerm}
        roleFilter={roleFilter}
      />
    </div>
  );
}
