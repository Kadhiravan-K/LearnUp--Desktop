import { useDesktopNavigation } from './navigation-store';

export function useRouter() {
  const { navigate } = useDesktopNavigation();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    prefetch: () => {},
    refresh: () => window.dispatchEvent(new CustomEvent('learnup_refresh')),
  };
}

export function usePathname(): string {
  const { pathname } = useDesktopNavigation();
  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const { searchParams } = useDesktopNavigation();
  return searchParams;
}

export function useParams(): Record<string, string> {
  const { params } = useDesktopNavigation();
  return params;
}
