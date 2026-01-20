'use client';

import api from '@/lib/api'
import { apiLogger } from '@/lib/helpers/api-logger'
import React, { useState } from 'react'
import { useCheckFirstTimeUser } from '@/hooks/client-user/notification-preference/useCheckFirstTimeUser'

interface PreferencesState {
  specialOffers: boolean
  priceAlerts: boolean
}

const NotificationPreferences = () => {
  // Custom hook để check first-time user
  const { shouldShowModal, isChecking, setShouldShowModal } = useCheckFirstTimeUser();
  
  const [preferences, setPreferences] = useState<PreferencesState>({
    specialOffers: true,
    priceAlerts: true
  })

  const handleToggle = (key: keyof PreferencesState) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = async () => {
    try {
      apiLogger.info('[NotificationPreferences] Saving preferences...', {
        specialOffers: preferences.specialOffers,
        priceAlerts: preferences.priceAlerts
      });
      
      // Gọi API tạo/update notification preferences (PUT method)
      await api.put('/me/notification-preference', {
        receiveSpecialOffers: preferences.specialOffers,
        receivePriceAlerts: preferences.priceAlerts
      });
      apiLogger.info('[NotificationPreferences] Preferences saved successfully');
      // Đóng modal
      setShouldShowModal(false);
      
    } catch (error) {
      apiLogger.logError('[NotificationPreferences] Failed to save preferences:', error as Error);
      // TODO: Show error toast
    }
  }

  const handleDecideLater = async () => {
    try {
      apiLogger.info('[NotificationPreferences] User decided later - saving default preferences (all false)');
      
      // Gọi API tạo/update với giá trị mặc định false (opt-out)
      await api.put('/me/notification-preference', {
        receiveSpecialOffers: false,
        receivePriceAlerts: false
      });
      
      apiLogger.info('[NotificationPreferences] Default preferences saved successfully');
      
      // Đóng modal (modal sẽ không show lại vì preference đã tồn tại)
      setShouldShowModal(false);
      
    } catch (error) {
      apiLogger.logError('[NotificationPreferences] Failed to save default preferences:', error as Error);
      // Vẫn đóng modal ngay cả khi lỗi
      setShouldShowModal(false);
      // TODO: Show error toast
    }
  }

  // Không render nếu không cần show modal
  if (!shouldShowModal) return null

  return (
    <div className={`login-modal-overlay ${shouldShowModal ? 'active' : ''}`} id="signupPrefsModal">
      <div className="login-modal-content">
        <h2 className="login-modal-title">Communication Preferences</h2>
        <p className="login-modal-subtitle">
          Customize how you hear from us. You can change these settings later.
        </p>

        <div className="preferences-list">
          {/* Preference Item 1: Special Offers */}
          <div className="setting-item">
            <div className="setting-text">
              <label htmlFor="specialOffersToggle">Receive Special Offers</label>
              <p>Get exclusive deals and updates from GoodSeed.</p>
            </div>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="specialOffersToggle"
                checked={preferences.specialOffers}
                onChange={() => handleToggle('specialOffers')}
              />
              <label className="toggle-label" htmlFor="specialOffersToggle"></label>
            </div>
          </div>

          {/* Preference Item 2: Price Alerts */}
          <div className="setting-item">
            <div className="setting-text">
              <label htmlFor="priceAlertsToggle">Receive Price Alerts</label>
              <p>Be notified when prices drop on seeds you&apos;ve favorited.</p>
            </div>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="priceAlertsToggle"
                checked={preferences.priceAlerts}
                onChange={() => handleToggle('priceAlerts')}
              />
              <label className="toggle-label" htmlFor="priceAlertsToggle"></label>
            </div>
          </div>
        </div>

        <div className="modal-actions-prefs">
          <button className="btn-styled primary" onClick={handleSave}>
            Save & Continue
          </button>
          <button className="btn-styled ghost" onClick={handleDecideLater}>
            Decide Later
          </button>
        </div>

        <p className="transparency-link">
          You can update these preferences anytime in your account settings.
        </p>
      </div>
    </div>
  )
}

export default NotificationPreferences;