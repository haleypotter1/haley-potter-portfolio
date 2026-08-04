export const breakpoints = {
  sm: '(min-width: 480px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
};

export function matches(breakpoint) {
  return window.matchMedia(breakpoints[breakpoint]).matches;
}
