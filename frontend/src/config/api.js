// Auto-detect backend URL based on how the frontend is accessed
const getBackendUrl = () => {
  const configuredUrl = process.env.REACT_APP_BACKEND_URL;
  
  // If explicitly set and not 'auto', use it
  if (configuredUrl && configuredUrl !== 'auto') {
    return configuredUrl;
  }

  // Auto-detect based on current hostname
  const hostname = window.location.hostname;
  const networkIP = process.env.REACT_APP_NETWORK_IP || '192.168.190.178';
  
  // If accessing via localhost or 127.0.0.1, use localhost backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }
  
  // If accessing via network IP, use network IP backend
  if (hostname === networkIP) {
    return `http://${networkIP}:8000`;
  }
  
  // Default to localhost
  return 'http://127.0.0.1:8000';
};

export const BACKEND_URL = getBackendUrl();
export const API = `${BACKEND_URL}/api`;

console.log('🔗 Backend URL:', BACKEND_URL);
console.log('📡 API Endpoint:', API);
