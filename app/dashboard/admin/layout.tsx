"use client"

import { useEffect } from "react";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Add admin-specific data attribute to body
    document.body.setAttribute('data-page', 'admin-dashboard');
    document.body.classList.add('admin-dashboard-page');
    
    // Cleanup on unmount
    return () => {
      document.body.removeAttribute('data-page');
      document.body.classList.remove('admin-dashboard-page');
    };
  }, []);

  return <>{children}</>;
}
