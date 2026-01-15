/**
 * Export Utilities
 * Helper functions to export data in various formats (CSV, JSON, Excel)
 */

import type { UserExportData } from '@/hooks/admin/users';

export type ExportFormat = 'csv' | 'json' | 'excel';

export interface ExportField {
  key: string;
  label: string;
  selected: boolean;
}

/**
 * Get value from user object based on field key
 */
export const getFieldValue = (user: UserExportData, fieldKey: string): string => {
  switch (fieldKey) {
    case 'id':
      return user.id || '';
    case 'name':
      return user.name || '';
    case 'email':
      return user.email || '';
    case 'role':
      return user.role || '';
    case 'emailVerified':
      return user.emailVerified ? 'Yes' : 'No';
    case 'acquisitionDate':
      return user.acquisitionDate 
        ? new Date(user.acquisitionDate).toLocaleDateString() 
        : '';
    case 'lastActiveAt':
      return user.lastActiveAt 
        ? new Date(user.lastActiveAt).toLocaleDateString() 
        : 'Never';
    case 'acquisitionSource':
      return user.acquisitionSource || 'Unknown';
    case 'wishlistCount':
      return user._count?.wishlist?.toString() || '0';
    case 'receiveSpecialOffers':
      return user.notificationPreference?.receiveSpecialOffers ? 'Yes' : 'No';
    case 'receivePriceAlerts':
      return user.notificationPreference?.receivePriceAlerts ? 'Yes' : 'No';
    case 'receiveBackInStock':
      return user.notificationPreference?.receiveBackInStock ? 'Yes' : 'No';
    default:
      return '';
  }
};

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
export const escapeCsvValue = (value: string): string => {
  if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Export data as CSV
 */
export const exportToCSV = (
  users: UserExportData[],
  selectedFields: ExportField[]
): void => {
  const headers = selectedFields.map(f => f.label).join(',');
  const rows = users.map(user => {
    return selectedFields.map(field => {
      const value = getFieldValue(user, field.key);
      return escapeCsvValue(value);
    }).join(',');
  }).join('\n');

  const csvContent = `${headers}\n${rows}`;
  downloadFile(csvContent, 'text/csv', 'csv');
};

/**
 * Export data as JSON
 */
export const exportToJSON = (
  users: UserExportData[],
  selectedFields: ExportField[]
): void => {
  const jsonData = users.map(user => {
    const obj: Record<string, string> = {};
    selectedFields.forEach(field => {
      obj[field.label] = getFieldValue(user, field.key);
    });
    return obj;
  });

  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, 'application/json', 'json');
};

/**
 * Export data as Excel (using HTML table format)
 * Note: This creates a simple Excel-compatible HTML file
 * For true .xlsx format, you would need a library like xlsx or exceljs
 */
export const exportToExcel = (
  users: UserExportData[],
  selectedFields: ExportField[]
): void => {
  const headers = selectedFields.map(f => `<th>${f.label}</th>`).join('');
  const rows = users.map(user => {
    const cells = selectedFields.map(field => {
      const value = getFieldValue(user, field.key);
      return `<td>${value}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;

  downloadFile(htmlContent, 'application/vnd.ms-excel', 'xls');
};

/**
 * Generic download file function
 */
const downloadFile = (
  content: string,
  mimeType: string,
  extension: string
): void => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const fileName = `users_export_${new Date().toISOString().split('T')[0]}.${extension}`;
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
};

/**
 * Main export function that handles all formats
 */
export const exportUsers = (
  users: UserExportData[],
  selectedFields: ExportField[],
  format: ExportFormat
): void => {
  if (!users || users.length === 0) {
    throw new Error('No users to export');
  }

  if (!selectedFields || selectedFields.length === 0) {
    throw new Error('No fields selected for export');
  }

  switch (format) {
    case 'csv':
      exportToCSV(users, selectedFields);
      break;
    case 'json':
      exportToJSON(users, selectedFields);
      break;
    case 'excel':
      exportToExcel(users, selectedFields);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};
