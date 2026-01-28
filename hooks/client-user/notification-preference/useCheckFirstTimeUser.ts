import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Custom hook để check xem user có phải lần đầu đăng nhập không
 * Dựa trên việc kiểm tra NotificationPreference có tồn tại hay không
 * 
 * @returns {Object} - { shouldShowModal, isChecking }
 * - shouldShowModal: true nếu cần hiển thị modal preferences
 * - isChecking: true khi đang check preferences từ API
 */
export function useCheckFirstTimeUser() {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  useEffect(() => {
    const checkNotificationPreferences = async () => {
      // Không check khi chưa authenticated
      if (!isAuthenticated) {
        return;
      }

      // Không check lại nếu đang checking
      if (isChecking) {
        return;
      }

      setIsChecking(true);

      try {
        apiLogger.info('[useCheckFirstTimeUser] Checking notification preferences for user...');
        
        const response = await api.get('/me/notification-preference');
        const preferenceData = response.data;
        
        apiLogger.debug('[useCheckFirstTimeUser] Fetched preferences:', preferenceData);

        // Nếu NotificationPreference chưa có record (null hoặc undefined)
        if (!preferenceData || preferenceData === null) {
          apiLogger.info('[useCheckFirstTimeUser] No preferences found - First time user detected');
          
          // Delay 500ms để UX mượt hơn (tránh modal xuất hiện quá đột ngột)
          setTimeout(() => {
            setShouldShowModal(true);
          }, 500);
        } else {
          apiLogger.info('[useCheckFirstTimeUser] Preferences exist - Skipping modal');
          setShouldShowModal(false);
        }
      } catch (error) {
        apiLogger.logError('[useCheckFirstTimeUser] Error checking preferences:', error as Error);
        // Không show modal nếu có lỗi (tránh block UX)
        setShouldShowModal(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Execute check when user authenticates
    checkNotificationPreferences();
  }, [isAuthenticated, session?.user?.id]); // Chỉ chạy lại khi authentication state thay đổi

  return {
    shouldShowModal,
    isChecking,
    setShouldShowModal // Export để có thể manually close modal
  };
}
