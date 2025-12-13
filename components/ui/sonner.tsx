"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import styles from "../../styles/sooner.module.css"
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={`${styles.goodseedToaster} toaster group`}
      icons={{
        success: <CircleCheckIcon className={`size-7 ${styles.successIcon}`} />,
        info: <InfoIcon className={`size-7 ${styles.infoIcon}`} />,
        warning: <TriangleAlertIcon className={`size-7 ${styles.warningIcon}`} />,
        error: <OctagonXIcon className={`size-7 ${styles.errorIcon}`} />,
        loading: <Loader2Icon className={`size-7 animate-spin ${styles.loadingIcon}`} />,
      }}
      style={
        {
          // Override với CSS variables của goodseed theme
          "--normal-bg": "var(--bg-main)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-color)",
          "--success-bg": "var(--bg-main)",
          "--success-text": "var(--brand-primary)",
          "--success-border": "var(--brand-primary)",
          "--error-bg": "var(--bg-main)",
          "--error-text": "var(--danger-color)",
          "--error-border": "var(--danger-color)",
          "--warning-bg": "var(--bg-main)",
          "--warning-text": "#f39c12",
          "--warning-border": "#f39c12",
          "--info-bg": "var(--bg-main)",
          "--info-text": "#3498db",
          "--info-border": "#3498db",
          "--border-radius": "0px",
          "--font-family": "Poppins, sans-serif",
        } as React.CSSProperties
      }
      toastOptions={{
        className: styles.goodseedToast,
        classNames: {
          title: styles.toastTitle,
          description: styles.toastDescription,
          closeButton: styles.closeButton,
          icon: styles.toastIcon,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
