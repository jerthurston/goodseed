'use client'

import DeleteAccountModal from '@/components/custom/modals/DeleteAccountModal';
import VerifyEmailModal from '@/components/custom/modals/VerifyEmailModal';
import { Icons } from '@/components/ui/icons';
import { Archivo_Black, Poppins } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiLogger } from '@/lib/helpers/api-logger';
import { signIn, signOut } from 'next-auth/react';
import { ScrapingSourceService } from '@/lib/services/scraping-sources/scraping-source.service';
import SignOutBtnInUserDashboard from '@/components/custom/auth/SignOutBtnInUserDashboard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWarning } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import { useFetchCurrentUser, useDeleteAccount } from '@/hooks/client-user';
import { useUpdateNotificationPreference } from '@/hooks/client-user/notification-preference';

export const getArchivoBlack = Archivo_Black({ subsets: ['latin'], weight: ['400'], variable: '--font-archivo-black' })

const SettingsPage = () => {
    const router = useRouter()
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isVerifyEmailModalOpen, setIsVerifyEmailModalOpen] = useState(false)

    const [email, setEmail] = useState('')
    const [isEmailLoading, setIsEmailLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)


    // Fetch user data with Tanstack Query
    const { data: user, isLoading, error } = useFetchCurrentUser();

    // Update notification preferences mutation
    const { mutate: updatePreference, isPending: isUpdating } = useUpdateNotificationPreference();

    // Delete account mutation
    const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

    apiLogger.debug('Fetched user data:', { user });

    // Notification preferences state - sync with fetched data
    const [specialOffers, setSpecialOffers] = useState(false)
    const [priceAlerts, setPriceAlerts] = useState(false)
    const [backInStockAlerts, setBackInStockAlerts] = useState(false)

    // Update notification preferences when user data loads
    useEffect(() => {
        if (user?.notificationPreference) {
            setSpecialOffers(user.notificationPreference.receiveSpecialOffers ?? false);
            setPriceAlerts(user.notificationPreference.receivePriceAlerts ?? false);
            setBackInStockAlerts(user.notificationPreference.receiveBackInStock ?? false);
        }
    }, [user]);

    const handleDeleteAccount = () => {
        apiLogger.info('PERMANENTLY DELETING ACCOUNT...')
        // Call delete account mutation
        deleteAccount();
        setIsDeleteModalOpen(false);
    }

    const handleToggleChange = (preference: 'receiveSpecialOffers' | 'receivePriceAlerts' | 'receiveBackInStock', enabled: boolean) => {
        apiLogger.info(`Notification preference '${preference}' is now ${enabled ? 'ON' : 'OFF'}.`)

        // Call API to update preference
        updatePreference({
            [preference]: enabled,
        });
    }

    // Loading state
    if (isLoading) {
        return (
            <main className="account-page-main">
                <div className="account-content-wrapper">
                    <div className="account-container flex items-center justify-center py-12">
                        <Icons.spinner className="h-8 w-8 animate-spin mr-3" />
                        <span>Loading account settings...</span>
                    </div>
                </div>
            </main>
        );
    }

    // Error state
    if (error || !user) {
        return (
            <main className="account-page-main">
                <div className="account-content-wrapper">
                    <div className="account-container py-12 text-center">
                        <p className="text-red-500 mb-4">
                            {error?.message || 'Failed to load account settings'}
                        </p>
                        <button
                            className="btn-styled ghost"
                            onClick={() => router.push('/signin')}
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <>
            <main className={`account-page-main`}>
                <div className="account-content-wrapper">
                    <div className="account-container">

                        {/* Top Section: Email Display */}
                        <section className="account-section">
                            <h1 className={getArchivoBlack.variable}>Account Settings</h1>
                            <p className="email-display">
                                Signed in as: <strong id="user-email">{user.email}</strong>
                            </p>
                            {
                                !user.emailVerified || user.emailVerified === null ? (
                                    <div>
                                        <div className="flex items-center gap-2 mt-3 p-3 bg-yellow-50 border border-yellow-200">
                                            <FontAwesomeIcon icon={faWarning} className="text-yellow-600" />
                                            <span className='text-sm text-yellow-800'>
                                                You're signed in with an unverified email address. Please{' '}
                                                <span
                                                    onClick={() => setIsVerifyEmailModalOpen(true)} 
                                                    className='underline cursor-pointer text-red-700 font-bold hover:text-red-800'
                                                >
                                                    verify your email
                                                </span>
                                                {' '}to ensure account security.
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="subtle-note">
                                            To use a different email, sign out and log in with a new one.
                                        </p>
                                    </>
                                )
                            }
                            

                        </section>

                        <hr className="account-divider" />

                        {/* Notification Preferences Section */}
                        <section className="account-section">
                            <h2 className={`account-section-title`}>Notifications</h2>
                            {/* --> Special offer alert */}
                            <div className="setting-item">
                                <div className="setting-text">
                                    <label htmlFor="special-offers" style={{ fontFamily: "Poppins" }}>
                                        Receive Special Offers
                                    </label>
                                    <p>Get exclusive deals and updates from GoodSeed.</p>
                                </div>
                                <div className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        id="special-offers"
                                        checked={specialOffers}
                                        disabled={isUpdating}
                                        onChange={(e) => {
                                            setSpecialOffers(e.target.checked)
                                            handleToggleChange('receiveSpecialOffers', e.target.checked)
                                        }}
                                    />
                                    <label htmlFor="special-offers" className="toggle-label"></label>
                                </div>
                            </div>
                            {/* --> Price alert */}
                            <div className="setting-item">
                                <div className="setting-text">
                                    <label htmlFor="price-alerts" style={{ fontFamily: "Poppins, sans-serif" }}>
                                        Receive Price Alerts
                                    </label>
                                    <p>Be notified when prices drop on seeds you&apos;ve favorited.</p>
                                </div>
                                <div className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        id="price-alerts"
                                        checked={priceAlerts}
                                        disabled={isUpdating}
                                        onChange={(e) => {
                                            setPriceAlerts(e.target.checked)
                                            handleToggleChange('receivePriceAlerts', e.target.checked)
                                        }}
                                    />
                                    <label htmlFor="price-alerts" className="toggle-label"></label>
                                </div>
                            </div>
                            {/* --> Back in stock alert */}
                            <div className="setting-item">
                                <div className="setting-text">
                                    <label htmlFor="back-in-stock" style={{ fontFamily: "Poppins, sans-serif" }}>
                                        Receive Back in Stock Alerts
                                    </label>
                                    <p>Get notified when out-of-stock seeds become available again.</p>
                                </div>
                                <div className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        id="back-in-stock"
                                        checked={backInStockAlerts}
                                        disabled={isUpdating}
                                        onChange={(e) => {
                                            setBackInStockAlerts(e.target.checked)
                                            handleToggleChange('receiveBackInStock', e.target.checked)
                                        }}
                                    />
                                    <label htmlFor="back-in-stock" className="toggle-label"></label>
                                </div>
                            </div>
                        </section>

                        <hr className="account-divider" />

                        {/* Account Actions Section */}
                        <section className="account-section">
                            <h2 className="account-section-title">Account Controls</h2>

                            <div className="setting-item">
                                <div className="setting-text">
                                    <h3 style={{ fontFamily: "Poppins, sans-serif" }}>Delete My Account</h3>
                                    <p>Permanently delete your account and all associated data.</p>
                                </div>
                                <button
                                    id="delete-account-btn"
                                    className="btn-styled danger"
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    disabled={isDeleting}
                                    type="button"
                                >
                                    {isDeleting ? (
                                        <span className="flex items-center gap-2">
                                            <Icons.spinner className="h-4 w-4 animate-spin" />
                                            Deleting...
                                        </span>
                                    ) : (
                                        'Delete Account'
                                    )}
                                </button>
                            </div>

                            <div className="setting-item">
                                <div className="setting-text">
                                    <h3 style={{ fontFamily: "Poppins, sans-serif" }}>Sign Out</h3>
                                    <p>Sign out of your account and return to the homepage.</p>
                                </div>
                                <SignOutBtnInUserDashboard />
                            </div>
                        </section>

                    </div>
                </div>
            </main>

            {/* Confirmation Modal for Deleting Account */}
            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
            />

            {/* Verify Email Modal */}
            <VerifyEmailModal
                isOpen={isVerifyEmailModalOpen}
                onClose={() => setIsVerifyEmailModalOpen(false)}
                currentEmail={user?.email}
            />
        </>
    )
}

export default SettingsPage
