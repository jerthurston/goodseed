"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function UserDashboard() {
    const [specialOffers, setSpecialOffers] = useState(true)
    const [priceAlerts, setPriceAlerts] = useState(false)

    return (
        <div className="min-h-screen flex flex-col bg-[#e8dfc8]">

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="bg-white border-4 border-[#2d2d2d] p-12">
                        {/* Account Settings Section */}
                        <section className="mb-12">
                            <h1 className="text-3xl font-bold text-[#38a169] mb-4">ACCOUNT SETTINGS</h1>
                            <div className="mb-2">
                                <span className="text-[#2d2d2d]">Signed in as: </span>
                                <span className="font-semibold text-[#2d2d2d]">youremail@example.com</span>
                            </div>
                            <p className="text-sm text-[#666666]">To use a different email, sign out and log in with a new one.</p>
                        </section>

                        <div className="border-t-2 border-[#2d2d2d] mb-8"></div>

                        {/* Notifications Section */}
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-[#38a169] mb-6">NOTIFICATIONS</h2>

                            <div className="space-y-6">
                                {/* Special Offers Toggle */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[#2d2d2d] mb-1">Receive Special Offers</h3>
                                        <p className="text-sm text-[#666666]">Get exclusive deals and updates from GoodSeed.</p>
                                    </div>
                                    <button
                                        onClick={() => setSpecialOffers(!specialOffers)}
                                        className={`relative ml-4 w-12 h-6 border-2 border-[#2d2d2d] transition-colors ${specialOffers ? "bg-[#38a169]" : "bg-[#e8dfc8]"
                                            }`}
                                        aria-label="Toggle special offers"
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white border border-[#2d2d2d] transition-transform ${specialOffers ? "translate-x-6" : "translate-x-0"
                                                }`}
                                        ></span>
                                    </button>
                                </div>

                                {/* Price Alerts Toggle */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[#2d2d2d] mb-1">Receive Price Alerts</h3>
                                        <p className="text-sm text-[#666666]">Be notified when prices drop on seeds you've favorited.</p>
                                    </div>
                                    <button
                                        onClick={() => setPriceAlerts(!priceAlerts)}
                                        className={`relative ml-4 w-12 h-6 border-2 border-[#2d2d2d] transition-colors ${priceAlerts ? "bg-[#38a169]" : "bg-[#e8dfc8]"
                                            }`}
                                        aria-label="Toggle price alerts"
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white border border-[#2d2d2d] transition-transform ${priceAlerts ? "translate-x-6" : "translate-x-0"
                                                }`}
                                        ></span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        <div className="border-t-2 border-[#2d2d2d] mb-8"></div>

                        {/* Account Controls Section */}
                        <section>
                            <h2 className="text-2xl font-bold text-[#38a169] mb-6">ACCOUNT CONTROLS</h2>

                            <div className="space-y-6">
                                {/* Delete Account */}
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[#2d2d2d] mb-1">Delete My Account</h3>
                                        <p className="text-sm text-[#666666]">Permanently delete your account and all associated data.</p>
                                    </div>
                                    <Button className="ml-4 bg-[#c53030] text-white hover:bg-[#9b2c2c] border-2 border-[#2d2d2d] font-medium px-6">
                                        DELETE ACCOUNT
                                    </Button>
                                </div>

                                {/* Sign Out */}
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[#2d2d2d] mb-1">Sign Out</h3>
                                        <p className="text-sm text-[#666666]">Sign out of your account and return to the homepage.</p>
                                    </div>
                                    <Button className="ml-4 bg-white text-[#2d2d2d] hover:bg-[#f5f5f5] border-2 border-[#2d2d2d] font-medium px-8">
                                        SIGN OUT
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

        </div>
    )
}
