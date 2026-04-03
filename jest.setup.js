// Jest setup - intentionally minimal
// API route tests use @jest-environment node (has Web APIs built-in)
// Component tests use jsdom (default)

// Mock next/navigation for components that use useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
