'use client'

import DeleteAccountModal from '@/components/custom/modals/DeleteAccountModal';
import { Archivo_Black, Poppins } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const getPoppins = Poppins({ subsets: ['latin'], weight: ['400', '700', '800'], variable: '--font-poppins' })
export const getArchivoBlack = Archivo_Black({ subsets: ['latin'], weight: ['400'], variable: '--font-archivo-black' })

const SettingsPage = () => {
    const router = useRouter()
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [userEmail] = useState('youremail@example.com') // Replace with actual user email

    // Notification preferences state
    const [specialOffers, setSpecialOffers] = useState(true)
    const [priceAlerts, setPriceAlerts] = useState(false)

    const handleSignOut = () => {
        console.log('Signing out from account page...')
        // TODO: Clear user session/token
        alert('You have been signed out.')
        router.push('/')
    }

    const handleDeleteAccount = () => {
        console.log('PERMANENTLY DELETING ACCOUNT...')
        // TODO: Make API call to delete account
        alert('Your account has been permanently deleted. You will be redirected to the homepage.')
        setIsDeleteModalOpen(false)
        router.push('/')
    }

    const handleToggleChange = (preference: string, enabled: boolean) => {
        console.log(`Notification preference '${preference}' is now ${enabled ? 'ON' : 'OFF'}.`)
        // TODO: Save preference to server
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
                                Signed in as: <strong id="user-email">{userEmail}</strong>
                            </p>
                            <p className="subtle-note">
                                To use a different email, sign out and log in with a new one.
                            </p>
                        </section>

                        <hr className="account-divider" />

                        {/* Notification Preferences Section */}
                        <section className="account-section">
                            <h2 className={`account-section-title`}>Notifications</h2>

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
                                        onChange={(e) => {
                                            setSpecialOffers(e.target.checked)
                                            handleToggleChange('special-offers', e.target.checked)
                                        }}
                                    />
                                    <label htmlFor="special-offers" className="toggle-label"></label>
                                </div>
                            </div>

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
                                        onChange={(e) => {
                                            setPriceAlerts(e.target.checked)
                                            handleToggleChange('price-alerts', e.target.checked)
                                        }}
                                    />
                                    <label htmlFor="price-alerts" className="toggle-label"></label>
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
                                    type="button"
                                >
                                    Delete Account
                                </button>
                            </div>

                            <div className="setting-item">
                                <div className="setting-text">
                                    <h3 style={{ fontFamily: "Poppins, sans-serif" }}>Sign Out</h3>
                                    <p>Sign out of your account and return to the homepage.</p>
                                </div>
                                <button
                                    id="sign-out-btn"
                                    className="btn-styled ghost"
                                    onClick={handleSignOut}
                                    type="button"
                                >
                                    Sign Out
                                </button>
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
        </>
    )
}

export default SettingsPage
