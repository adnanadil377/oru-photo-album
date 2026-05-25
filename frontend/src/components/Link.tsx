import * as React from "react";

export function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export function Link({ href, children, ...props }: LinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
