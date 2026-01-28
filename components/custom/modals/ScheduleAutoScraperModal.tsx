"use client"

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faTimes } from '@fortawesome/free-solid-svg-icons';

interface ScheduleAutoScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startTime: Date) => void;
  isLoading?: boolean;
  totalSellers: number;
}

export default function ScheduleAutoScraperModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  totalSellers,
}: ScheduleAutoScraperModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  });

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setSelectedTime(`${hours}:${minutes}`);
  }, [isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setSelectedTime(`${hours}:${minutes}`);
    onClose();
  };

  const handleContinue = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleConfirm = () => {
    // Parse selected time
    const now = new Date();
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const currentHour = now.getHours();
    
    // If selected hour is less than current hour, schedule for tomorrow
    const isTomorrow = hours < currentHour;
    
    const startTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (isTomorrow ? 1 : 0),
      hours,
      minutes || 0
    );
    
    onConfirm(startTime);
    setStep(1);
    const resetHours = now.getHours().toString().padStart(2, '0');
    const resetMinutes = now.getMinutes().toString().padStart(2, '0');
    setSelectedTime(`${resetHours}:${resetMinutes}`);
  };

  const isScheduledForTomorrow = () => {
    const now = new Date();
    const [hours] = selectedTime.split(':').map(Number);
    return hours < now.getHours();
  };

  const getStartTimeFormatted = () => {
    const now = new Date();
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const isTomorrow = hours < now.getHours();
    
    const startTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (isTomorrow ? 1 : 0),
      hours,
      minutes || 0
    );
    
    return startTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-(--bg-main) border-4 border-(--border-color) max-w-md w-full mx-4 shadow-[8px_8px_0_var(--border-color)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-(--border-color)">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon 
              icon={faClock} 
              className="text-2xl text-(--brand-primary)" 
            />
            <div>
              <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
                Schedule Auto Scraper
              </h2>
              <p className="font-['Poppins'] text-xs text-(--text-primary-muted) mt-1">
                Step {step} of 2
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-(--text-primary-muted) hover:text-(--text-primary) transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Content - Step 1: Time Selection */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            {/* Simple instruction */}
            <div className="text-center">
              <h3 className="font-['Poppins'] text-lg font-semibold text-(--text-primary) mb-2">
                Select Start Time
              </h3>
              <p className="font-['Poppins'] text-sm text-(--text-primary-muted)">
                Auto scraper will activate for <span className="font-bold text-(--brand-primary)">{totalSellers} enabled seller{totalSellers !== 1 ? 's' : ''}</span>
              </p>
            </div>

            {/* Time Picker - Simple Input */}
            <div className="flex flex-col items-center">
              <input
                id="start-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={isLoading}
                className="w-full max-w-xs p-4 text-center text-3xl border-4 border-(--border-color) bg-(--bg-main) font-['Poppins'] font-bold text-(--text-primary) focus:outline-none focus:border-(--brand-primary) transition-colors rounded"
              />
            </div>

            {/* Info about selected time */}
            <div className={`p-4 border-2 rounded ${isScheduledForTomorrow() ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300'}`}>
              <p className={`font-['Poppins'] text-sm text-center font-semibold ${isScheduledForTomorrow() ? 'text-blue-800' : 'text-green-800'}`}>
                {isScheduledForTomorrow() ? '📅 ' : '✓ '}
                Scheduled for: <span className="font-bold text-lg">{selectedTime}</span>
                {isScheduledForTomorrow() && <span className="font-bold"> (Tomorrow)</span>}
              </p>
            </div>
          </div>
        )}

        {/* Content - Step 2: Review */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            {/* Review Info */}
            <div className="bg-(--bg-section) border-2 border-(--border-color) p-4">
              <h3 className="font-['Poppins'] font-bold text-(--text-primary) mb-3">
                � Review Schedule
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-['Poppins'] text-(--text-primary-muted)">Start Time:</span>
                  <span className="font-['Poppins'] font-semibold text-(--text-primary)">
                    {getStartTimeFormatted()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-['Poppins'] text-(--text-primary-muted)">Sellers with Auto Scrape Enabled:</span>
                  <span className="font-['Poppins'] font-semibold text-(--brand-primary)">
                    {totalSellers} seller{totalSellers !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="bg-green-50 border-2 border-green-300 p-4">
              <p className="font-['Poppins'] text-green-800 text-sm">
                ✅ Auto scraper will be activated and start running at the scheduled times every day.
              </p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border-2 border-yellow-300 p-4">
              <p className="font-['Poppins'] text-yellow-800 text-sm">
                ⚠️ Previous auto scraper jobs will be cancelled and rescheduled.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t-4 border-(--border-color)">
          {step === 1 && (
            <>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border-2 border-(--border-color) bg-(--bg-section) font-['Poppins'] font-semibold text-(--text-primary) hover:bg-(--bg-main) transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border-2 border-(--border-color) bg-(--brand-primary) font-['Poppins'] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border-2 border-(--border-color) bg-(--bg-section) font-['Poppins'] font-semibold text-(--text-primary) hover:bg-(--bg-main) transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border-2 border-(--border-color) bg-green-600 font-['Poppins'] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Starting...
                  </span>
                ) : (
                  'Start Auto Scraper ✓'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
