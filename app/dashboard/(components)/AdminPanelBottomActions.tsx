"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Home } from "lucide-react"
import { DashboardSidebarItem } from "./DashboardSidebar"
import SignOutModal from "@/components/custom/modals/SignOutModal"
import { createPortal } from "react-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGuilded } from "@fortawesome/free-brands-svg-icons"
import { faBookBible } from "@fortawesome/free-solid-svg-icons"

export function AdminPanelBottomActions() {
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  const router = useRouter()

  const handleReturnHomepage = () => {
    router.push("/")
  }

  const handleSignOutClick = () => {
    setIsSignOutModalOpen(true)
  }

  const handleConfirmSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleCancelSignOut = () => {
    setIsSignOutModalOpen(false)
  }

  return (
    <>
      {/* Spacer to push bottom buttons to the bottom */}
      <div className="flex-1" />

      {/* Bottom Action Buttons */}
      <div className="mt-auto pt-4 border-t-2 border-(--border-color) border-dashed space-y-2 flex flex-col gap-2">
        <DashboardSidebarItem
          icon={<FontAwesomeIcon icon={faBookBible} className="text-lg" />}
          onClick={handleReturnHomepage}
          className="admin-bottom-action-home"
        >
          Document
        </DashboardSidebarItem>
        <DashboardSidebarItem
          icon={<LogOut className="text-lg" />}
          onClick={handleSignOutClick}
          className="admin-bottom-action-signout"
        >
          Sign Out
        </DashboardSidebarItem>
      </div>

      {/* Sign Out Confirmation Modal - Portal to body */}
      {typeof document !== "undefined" &&
        createPortal(
          <SignOutModal
            isOpen={isSignOutModalOpen}
            onCancel={handleCancelSignOut}
            onConfirm={handleConfirmSignOut}
          />,
          document.body
        )}
    </>
  )
}
