import React from 'react';
import { useRouter } from './next-navigation';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, onClick, children, ...rest },
  ref
) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && rest.target !== '_blank') {
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <a ref={ref} href={`#${href}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});

export default Link;
