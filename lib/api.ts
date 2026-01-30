import axios from 'axios';

const getBaseUrl = () => {
    if (process.env.NODE_ENV == 'production') {
        // Use current domain for API calls in production
        if (typeof window !== 'undefined') {
            // Browser environment - use current domain
            return `${window.location.origin}/api`;
        }
        
        // Server environment - use environment variable
        const baseUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
        if (baseUrl) {
            return `${baseUrl}/api`;
        }
        
        // Fallback for server-side calls
        return '/api';
    }
    return "http://localhost:3000/api";
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

export default api;