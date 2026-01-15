'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import styles from './CategoryModal.module.css';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: { name: string; icon: string }) => void;
  initialData?: { name: string; icon: string };
  title?: string;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = 'Add New Category',
}: CategoryModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [icon, setIcon] = useState(initialData?.icon || 'faLeaf');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIcon(initialData.icon);
    }
  }, [initialData]);

  const handleSave = () => {
    if (name.trim() && icon.trim()) {
      // Chỉ add vào state, chưa lưu vào database
      onSave({ name: name.trim(), icon: icon.trim() });
      handleClose();
    }
  };

  const handleClose = () => {
    setName('');
    setIcon('faLeaf');
    onClose();
  };

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button type="button" onClick={handleClose} className={styles.closeButton}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="e.g., General Questions"
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Icon Name (FontAwesome) *</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className={styles.input}
              placeholder="e.g., faLeaf, faShoppingCart, faComments"
              required
            />
            <p className={styles.hint}>
              Common icons: faLeaf, faShoppingCart, faComments, faStar, faBullhorn, faQuestionCircle
            </p>
          </div>

          {/* Modal Footer */}
          <div className={styles.modalFooter}>
            <button type="button" onClick={handleClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className={styles.saveButton}>
              <FontAwesomeIcon icon={faSave} /> Add to List
            </button>
          </div>
        </div>

        {/* Info message */}
        <div className={styles.modalInfo}>
          <p>💡 Category will be added to the list. Click "Save Changes" to save to database.</p>
        </div>
      </div>
    </div>
  );
}

