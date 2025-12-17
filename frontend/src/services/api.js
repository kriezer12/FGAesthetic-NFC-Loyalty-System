const API_BASE_URL = "http://localhost:5000/api";

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API error");
  }

  return response.json();
};

export const authService = {
  register: (email, password, name) =>
    apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email, password) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getToken: () => localStorage.getItem("token"),
  
  getUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => !!localStorage.getItem("token"),
};