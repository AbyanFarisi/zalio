import axios from "axios";

// Base URL diambil dari env, default ke gateway lokal.
const BASE_URL =
  process.env.REACT_APP_API_GATEWAY_URL || "http://localhost:9080";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Inject Bearer token bila ada di localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper untuk menampilkan pesan error yang bersih.
export const errorMessage = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  "Unknown error";

// Daftar route yang dipublikasikan API gateway.
export const routes = {
  // identity
  login: "/identity/auth/login",
  register: "/identity/auth/register",
  me: "/identity/auth/me",
  users: "/identity/users",
  // product
  products: "/product/products",
  product: (id) => `/product/products/${id}`,
  // inventory
  stocks: "/inventory/stocks",
  stock: (id) => `/inventory/stocks/${id}`,
  // sales
  orders: "/sales/orders",
  order: (id) => `/sales/orders/${id}`,
  // finance
  transactions: "/finance/transactions",
  transaction: (id) => `/finance/transactions/${id}`,
};

export const gatewayURL = BASE_URL;
