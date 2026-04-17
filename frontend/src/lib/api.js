import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export default api;

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Indian number system formatting: 1,00,000 (lakh), 1,00,00,000 (crore)
export const formatIndianNumber = (num) => {
  if (!num && num !== 0) return '';
  const n = typeof num === 'string' ? num.replace(/,/g, '') : String(num);
  const parts = n.split('.');
  let intPart = parts[0];
  if (intPart.length <= 3) return n;
  let last3 = intPart.slice(-3);
  let remaining = intPart.slice(0, -3);
  let formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return parts.length > 1 ? formatted + '.' + parts[1] : formatted;
};

// Parse Indian formatted number back to plain number
export const parseIndianNumber = (str) => {
  if (!str) return '';
  return str.replace(/,/g, '');
};

// Format amount in human-readable Indian style (5L, 1.5Cr)
export const formatAmountShort = (amount) => {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(amount % 10000000 === 0 ? 0 : 1)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return String(amount);
};

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
