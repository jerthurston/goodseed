import api from "@/lib/api";
import { apiLogger } from "@/lib/helpers/api-logger";
import { useQuery } from "@tanstack/react-query";

export function useFetchNotificationPreferences() {
    let hookKey = 'useFetchNotificationPreferences';
    const query = useQuery({
        queryKey: ['notificationPreferences'],
        queryFn: async () => {
            try {
                apiLogger.info(`${hookKey}:Fetching notification preferences...`);
                const res = await api.get('/me/notification-preferences');
                const notificationPreferences = res.data
                apiLogger.debug(`${hookKey}: Fetched notification preferences:`, notificationPreferences);
                return notificationPreferences;
            } catch (error) {
                apiLogger.logError(`${hookKey}: Error fetching notification preferences:`, error as Error);
            }
        },
        staleTime: 5 * 60 * 1000, // Giải thích staleTime: Thời gian dữ liệu được coi là "tươi" trước khi cần refetch
        gcTime: 10 * 60 * 1000, // Thời gian dữ liệu không còn được sử dụng trước khi bị xóa
        refetchOnWindowFocus: false, // Không refetch khi switch tab
        refetchOnMount: false, // Dùng cache nếu còn fresh
    });

    return {
        preferences: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch
    };
}