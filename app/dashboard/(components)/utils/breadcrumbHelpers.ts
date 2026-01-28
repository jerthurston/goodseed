/**
 * Helper function to generate breadcrumb items for Admin Dashboard main page
 * @param activeTab - Current active tab
 * @param sellerName - Optional seller name for seller detail pages
 * @returns Array of breadcrumb items
 */
export function getAdminBreadcrumbs(
  activeTab: string,
  sellerName?: string
): Array<{ label: string; href?: string }> {
  const breadcrumbs: Array<{ label: string; href?: string }> = [
    { label: "Admin Dashboard", href: "/dashboard/admin" },
  ]

  switch (activeTab) {
    case "overview":
      breadcrumbs.push({ label: "Overview" })
      break

    case "sellers":
      breadcrumbs.push({ label: "Sellers" })
      break

    case "auto-scraper":
      breadcrumbs.push({ label: "Scraper Config" })
      break

    case "alert":
      breadcrumbs.push({ label: "Error & Success Alerts" })
      break

    case "user-management":
      breadcrumbs.push({ label: "User Management" })
      break

    case "content-management":
      breadcrumbs.push({ label: "Content Management" })
      break

    case "cms-homepage":
      breadcrumbs.push(
        { label: "Content Management", href: "/dashboard/admin" },
        { label: "Homepage" }
      )
      break

    case "cms-faq":
      breadcrumbs.push(
        { label: "Content Management", href: "/dashboard/admin" },
        { label: "FAQ" }
      )
      break

    default:
      break
  }

  // If seller name is provided, add it to breadcrumb
  if (sellerName) {
    breadcrumbs.push({ label: sellerName })
  }

  return breadcrumbs
}

/**
 * Generate breadcrumb for Seller Detail page
 * @param sellerName - Name of the seller
 * @returns Array of breadcrumb items
 */
export function getSellerDetailBreadcrumbs(
  sellerName: string
): Array<{ label: string; href?: string }> {
  return [
    { label: "Admin Dashboard", href: "/dashboard/admin" },
    { label: "Sellers", href: "/dashboard/admin?tab=sellers" },
    { label: sellerName }
  ]
}

/**
 * Generate breadcrumb for User Detail page
 * @param userName - Name or email of the user
 * @returns Array of breadcrumb items
 */
export function getUserDetailBreadcrumbs(
  userName: string
): Array<{ label: string; href?: string }> {
  return [
    { label: "Admin Dashboard", href: "/dashboard/admin" },
    { label: "User Management", href: "/dashboard/admin?tab=user-management" },
    { label: userName }
  ]
}

/**
 * Generate breadcrumb for Jobs page
 * @returns Array of breadcrumb items
 */
export function getJobsBreadcrumbs(): Array<{ label: string; href?: string }> {
  return [
    { label: "Admin Dashboard", href: "/dashboard/admin" },
    { label: "Jobs Monitoring" }
  ]
}
