import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for Recharts' ResponsiveContainer in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
