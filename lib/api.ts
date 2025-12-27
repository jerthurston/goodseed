import axios from 'axios';

const getBaseUrl = () => {
    if (process.env.NODE_ENV == 'production') {
        // Force use HTTP ALB endpoint in production
        return 'http://goodseed-free-alb-1825640970.us-east-1.elb.amazonaws.com/api';
        
        // Original env-based logic (commented for now)
        // const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
        // if (baseUrl) {
        //     return `${baseUrl}/api`;
        // }
        // //Fallback with official URL
        // return 'https://goodseed.app/api';
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