"use client"

import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Add multiple data attributes to body for dashboard pages
    document.body.setAttribute('data-page', 'dashboard');
    document.body.setAttribute('data-dashboard', 'true');
    document.body.classList.add('dashboard-page');
    
    // Cleanup on unmount
    return () => {
      document.body.removeAttribute('data-page');
      document.body.removeAttribute('data-dashboard');
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  return <div className="dashboard-layout">{children}</div>;
}