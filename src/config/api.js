// In production (Render), backend serves React build at same domain
// In development, use localhost backend
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? ''  // Empty string for same-origin requests in production
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000');

export default API_BASE_URL;