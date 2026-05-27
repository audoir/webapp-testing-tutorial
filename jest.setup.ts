import '@testing-library/jest-dom';

// Suppress act() warnings that fire when async state updates happen after
// a synchronous assertion. These are expected when testing the initial
// loading state of components that fetch data in useEffect.
const originalError = console.error.bind(console);
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('not wrapped in act')
    ) {
      return;
    }
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
