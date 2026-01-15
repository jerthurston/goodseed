'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import styles from './CategoryModal.module.css'; // Reuse same styles

interface FaqItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: { question: string; answer: string }) => void;
  initialData?: { question: string; answer: string };
  title?: string;
  categoryName?: string;
}

export default function FaqItemModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = 'Add New FAQ Item',
  categoryName,
}: FaqItemModalProps) {
  const [question, setQuestion] = useState(initialData?.question || '');
  const [answer, setAnswer] = useState(initialData?.answer || '');

  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question);
      setAnswer(initialData.answer);
    }
  }, [initialData]);

  const handleSave = () => {
    if (question.trim() && answer.trim()) {
      // Chỉ add vào state, chưa lưu vào database
      onSave({ question: question.trim(), answer: answer.trim() });
      handleClose();
    }
  };

  const handleClose = () => {
    setQuestion('');
    setAnswer('');
    onClose();
  };

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
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
          <div>
            <h3 className={styles.modalTitle}>{title}</h3>
            {categoryName && (
              <p className={styles.modalSubtitle}>Category: {categoryName}</p>
            )}
          </div>
          <button type="button" onClick={handleClose} className={styles.closeButton}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Question *</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={styles.input}
              placeholder="What is your question?"
              required
              autoFocus
              minLength={5}
            />
            <p className={styles.hint}>Minimum 5 characters</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Answer *</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={styles.textarea}
              placeholder="Provide a detailed answer to help your customers"
              required
              rows={6}
              minLength={10}
            />
            <p className={styles.hint}>Minimum 10 characters. Use clear and concise language.</p>
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
          <p>💡 Item will be added to the list. Click "Save Changes" to save to database.</p>
        </div>
      </div>
    </div>
  );
}
