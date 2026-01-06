import axios from 'axios';

const getBaseUrl = () => {
    if (process.env.NODE_ENV == 'production') {
        // Use current domain for API calls in production
        // This allows API calls to work with custom domains (lembooking.com)
        if (typeof window !== 'undefined') {
            // Browser environment - use current domain
            return `${window.location.origin}/api`;
        }
        
        // Server environment - use environment variable or ALB fallback
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
        if (baseUrl) {
            return `${baseUrl}/api`;
        }
        
        // Fallback to ALB endpoint for server-side calls
        return 'http://goodseed-free-alb-1825640970.us-east-1.elb.amazonaws.com/api';
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