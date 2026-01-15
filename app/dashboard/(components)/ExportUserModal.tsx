/**
 * Export User Modal Component
 * Handles user data export with customizable field selection and format options
 */

'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileDownload,
    faTimes,
    faCheck,
    faSpinner,
    faFileCsv,
    faFileCode,
    faFileExcel,
    faNoteSticky,
    faExclamation,
    faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { useFetchAllUsers } from '@/hooks/admin/users';
import { exportUsers, type ExportFormat } from '@/lib/utils/export-utils';
import type { ExportField } from '@/lib/utils/export-utils';
import { apiLogger } from '@/lib/helpers/api-logger';
import styles from './dashboardAdmin.module.css';

interface ExportUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchTerm: string;
    roleFilter: 'all' | 'USER' | 'ADMIN' | 'BANNED';
}

export default function ExportUserModal({
    isOpen,
    onClose,
    searchTerm,
    roleFilter
}: ExportUserModalProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
    const [exportFields, setExportFields] = useState<ExportField[]>([
        { key: 'id', label: 'User ID', selected: true },
        { key: 'name', label: 'Name', selected: true },
        { key: 'email', label: 'Email', selected: true },
        { key: 'role', label: 'Role', selected: true },
        { key: 'emailVerified', label: 'Email Verified', selected: true },
        { key: 'acquisitionDate', label: 'Registration Date', selected: true },
        { key: 'lastActiveAt', label: 'Last Active', selected: false },
        { key: 'acquisitionSource', label: 'Acquisition Source', selected: false },
        { key: 'wishlistCount', label: 'Wishlist Count', selected: true },
        { key: 'receiveSpecialOffers', label: 'Special Offers Enabled', selected: false },
        { key: 'receivePriceAlerts', label: 'Price Alerts Enabled', selected: false },
        { key: 'receiveBackInStock', label: 'Back In Stock Enabled', selected: false },
    ]);

    // Fetch all users for export - only when modal is open
    const { data, isLoading, error, refetch } = useFetchAllUsers({
        search: searchTerm,
        role: roleFilter,
        enabled: isOpen
    });

    // Refetch when filters change
    useEffect(() => {
        if (isOpen) {
            refetch();
        }
    }, [searchTerm, roleFilter, isOpen, refetch]);

    // Toggle export field selection
    const toggleExportField = (key: string) => {
        setExportFields(prev => prev.map(field =>
            field.key === key ? { ...field, selected: !field.selected } : field
        ));
    };

    // Select all export fields
    const selectAllFields = () => {
        setExportFields(prev => prev.map(field => ({ ...field, selected: true })));
    };

    // Deselect all export fields
    const deselectAllFields = () => {
        setExportFields(prev => prev.map(field => ({ ...field, selected: false })));
    };

    // Export users to selected format
    const handleExportUsers = async () => {
        try {
            setIsExporting(true);

            // Get selected field keys
            const selectedFields = exportFields.filter(f => f.selected);

            if (selectedFields.length === 0) {
                alert('Please select at least one field to export');
                return;
            }

            if (!data?.users || data.users.length === 0) {
                alert('No users found to export');
                return;
            }

            apiLogger.info('Starting user export', {
                selectedFields: selectedFields.map(f => f.key),
                filters: { searchTerm, roleFilter },
                format: selectedFormat,
                userCount: data.users.length
            });

            // Use the export utility function
            exportUsers(data.users, selectedFields, selectedFormat);

            apiLogger.info('User export completed successfully', {
                format: selectedFormat,
                userCount: data.users.length,
                fieldCount: selectedFields.length
            });

            // Close modal
            onClose();

        } catch (error) {
            apiLogger.logError('User export failed', error as Error, {
                filters: { searchTerm, roleFilter },
                format: selectedFormat
            });
            alert('Failed to export users. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.exportModalOverlay} onClick={onClose}>
            <div className={styles.exportModalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.exportModalHeader}>
                    <h3 className={styles.exportModalTitle}>
                        <FontAwesomeIcon icon={faFileDownload} />
                        Export User Data
                    </h3>
                    <button
                        className={styles.exportModalCloseBtn}
                        onClick={onClose}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className={styles.exportModalBody}>
                    <div className={styles.exportModalDescription}>
                        <FontAwesomeIcon icon={faCircleExclamation} />
                    <p >
                        Select the fields and format you want to export.
                        Current filters (search: &quot;{searchTerm || 'none'}&quot;, role: {roleFilter}) will be applied.
                        {data && <strong> Found {data.users.length} users to export.</strong>}
                    </p>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className={styles.exportLoadingContainer}>
                            <FontAwesomeIcon icon={faSpinner} spin />
                            <span>Loading users...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className={styles.exportErrorContainer}>
                            <p>Error loading users: {error.message}</p>
                        </div>
                    )}

                    {/* Format Selection */}
                    {data && (
                        <>
                            {/* Quick Actions */}
                            <div className={styles.exportQuickActions}>
                                <button
                                    className={styles.exportQuickActionBtn}
                                    onClick={selectAllFields}
                                >
                                    <FontAwesomeIcon icon={faCheck} />
                                    Select All
                                </button>
                                <button
                                    className={styles.exportQuickActionBtn}
                                    onClick={deselectAllFields}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                    Deselect All
                                </button>
                            </div>

                            {/* Field Selection Grid */}
                            <div className={styles.exportFieldsGrid}>
                                {exportFields.map((field) => (
                                    <label
                                        key={field.key}
                                        className={`${styles.exportFieldLabel} ${field.selected ? styles.exportFieldLabelSelected : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={field.selected}
                                            onChange={() => toggleExportField(field.key)}
                                            className={styles.exportFieldCheckbox}
                                        />
                                        <span className={styles.exportFieldText}>{field.label}</span>
                                        {field.selected && (
                                            <FontAwesomeIcon
                                                icon={faCheck}
                                                className={styles.exportFieldCheckIcon}
                                            />
                                        )}
                                    </label>
                                ))}
                            </div>

                            {/* Field Format */}
                            <div className={styles.exportFormatSection}>
                                <h4 className={styles.exportSectionTitle}>Export Format</h4>
                                <div className={styles.exportFormatGrid}>
                                    <button
                                        className={`${styles.exportFormatButton} ${selectedFormat === 'csv' ? styles.exportFormatButtonActive : ''}`}
                                        onClick={() => setSelectedFormat('csv')}
                                    >
                                        <FontAwesomeIcon icon={faFileCsv} />
                                        <span>CSV</span>
                                    </button>
                                    <button
                                        className={`${styles.exportFormatButton} ${selectedFormat === 'json' ? styles.exportFormatButtonActive : ''}`}
                                        onClick={() => setSelectedFormat('json')}
                                    >
                                        <FontAwesomeIcon icon={faFileCode} />
                                        <span>JSON</span>
                                    </button>
                                    <button
                                        className={`${styles.exportFormatButton} ${selectedFormat === 'excel' ? styles.exportFormatButtonActive : ''}`}
                                        onClick={() => setSelectedFormat('excel')}
                                    >
                                        <FontAwesomeIcon icon={faFileExcel} />
                                        <span>Excel</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div className={styles.exportModalFooter}>
                    <button
                        className={styles.exportModalCancelBtn}
                        onClick={onClose}
                        disabled={isExporting}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.exportModalExportBtn}
                        onClick={handleExportUsers}
                        disabled={isExporting || isLoading || !data || exportFields.filter(f => f.selected).length === 0}
                    >
                        {isExporting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faFileDownload} />
                                Export {exportFields.filter(f => f.selected).length} Fields as {selectedFormat.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
