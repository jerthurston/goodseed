'use client'

import { useEffect, useState } from 'react'

const AgeVerificationModal = () => {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already verified age
        const ageVerified = localStorage.getItem('ageVerified')

        if (!ageVerified) {
            // Show modal if not verified
            setIsVisible(true)
        }
    }, [])

    const handleConfirmAge = () => {
        // Save verification to localStorage
        localStorage.setItem('ageVerified', 'true')
        setIsVisible(false)
    }

    const handleDenyAge = () => {
        // Redirect to a safe page or show message
        alert('You must be of legal age to access this website.')
        // Optional: redirect to another page
        // window.location.href = 'https://www.google.com'
    }

    if (!isVisible) return null

    return (
        <div className={`age-verification ${isVisible ? '' : 'hidden'}`} id="ageVerification">
            <div className="age-modal">
                <h2>Age Verification</h2>
                <p>
                    This website connects users to other sites that may sell plant seeds and
                    related products. You must be of legal age in your jurisdiction to enter
                    and use our service.
                </p>
                <div className="age-buttons">
                    <button
                        className="age-btn confirm"
                        onClick={handleConfirmAge}
                        type="button"
                    >
                        I am of Legal Age
                    </button>
                    <button
                        className="age-btn deny"
                        onClick={handleDenyAge}
                        type="button"
                    >
                        I am Not
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AgeVerificationModal
