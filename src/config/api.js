// In production (Vercel), API routes are at /api
// In development, use localhost backend
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Vercel serves from same domain
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000');

export default API_BASE_URL;