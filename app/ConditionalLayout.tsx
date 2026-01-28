"use client"

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface ConditionalLayoutProps {
  children: ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  if (isDashboard) {
    // On dashboard pages, conditionally render header/footer based on screen size
    return (
      <>
        {/* Header - hidden on mobile for dashboard */}
        <div className="hidden lg:block">
          {/* Extract first child (Header) */}
          {Array.isArray(children) ? children[0] : null}
        </div>
        
        {/* Main content (children) */}
        {Array.isArray(children) ? children[1] : children}
        
        {/* Footer - hidden on mobile for dashboard */}
        <div className="hidden lg:block">
          {/* Extract last child (Footer) */}
          {Array.isArray(children) ? children[2] : null}
        </div>
      </>
    );
  }

  // For non-dashboard pages, render everything normally
  return <>{children}</>;
}