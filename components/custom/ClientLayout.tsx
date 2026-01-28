"use client"

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  if (!Array.isArray(children)) return <>{children}</>;

  const [Header, Content, Footer] = children;

  return (
    <>
      {/* Header - hidden on mobile for dashboard pages */}
      <div className={isDashboard ? "hidden lg:block" : ""}>
        {Header}
      </div>
      
      {/* Main content */}
      {Content}
      
      {/* Footer - hidden on mobile for dashboard pages */}
      <div className={isDashboard ? "hidden lg:block" : ""}>
        {Footer}
      </div>
    </>
  );
}