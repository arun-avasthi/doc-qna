// lib/config.ts
const getConfig = () => {
  // Use NEXT_PUBLIC_API_URL environment variable if set, otherwise default to localhost
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return {
    apiUrl,
  };
};

export default getConfig;