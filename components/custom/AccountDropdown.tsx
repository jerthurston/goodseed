'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ExtendedUser } from '@/next-auth'
import { faChevronDown, faCog, faFile, faHeart, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import SignOutBtn from './auth/SignOutBtn'
import { apiLogger } from '@/lib/helpers/api-logger'

interface AccountDropdownProps {
    onLogout: () => void;
    user: ExtendedUser | undefined;
}

const AccountDropdown = ({ onLogout, user }: AccountDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleLogout = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        onLogout()
        setIsOpen(false)
    }

    useEffect(() => {
        apiLogger.debug('🔍 Account dropdown debug:', {
            userRole: user?.role,
            userEmail: user?.email,
            userName: user?.name,
            fullUserObject: user
        });
    }, [])

    return (
        <div
            className="account-dropdown"
            ref={dropdownRef}>
            <Link
                href="#"
                className="account-btn"
                id="accountBtn"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={(e) => {
                    e.preventDefault()
                    setIsOpen(!isOpen)
                }}
            >
                {!!user ?
                    (
                        <>
                            <FontAwesomeIcon icon={faUser} />
                            <span className='text-sm'>Hi! {user.name}</span>
                        </>
                    ) : <span>Account</span>}
                <FontAwesomeIcon icon={faChevronDown} className="dropdown-caret" />
            </Link>

            {/* Render dropdown menu based on user role */}
            {
                user?.role === 'ADMIN' ? (
                    <>
                        {/* -->Admin Menu */}
                        <div
                            className={`dropdown-menu ${isOpen ? 'active' : ''}`}
                            id="accountDropdownMenu"
                        >
                            <Link href="/dashboard/admin" className="dropdown-item">
                                <FontAwesomeIcon icon={faFile} /> Dashboard
                            </Link>
                            {/* <Link href="/dashboard/dashboard/admin/settings" className="dropdown-item">
                                <FontAwesomeIcon icon={faCog} /> Settings
                            </Link> */}
                            <SignOutBtn />

                        </div>
                    </>
                ) : (
                    <>
                        {/* -->User Menu */}
                        <div
                            className={`dropdown-menu ${isOpen ? 'active' : ''}`}
                            id="accountDropdownMenu"
                        >
                            <Link href="/dashboard/user/favorites" className="dropdown-item">
                                <FontAwesomeIcon icon={faHeart} /> Wishlist
                            </Link>
                            <Link href="/dashboard/user/settings" className="dropdown-item">
                                <FontAwesomeIcon icon={faCog} /> Account Settings
                            </Link>
                            {/* Logout button */}
                            <SignOutBtn />
                        </div>
                    </>
                )
            }
        </div>
    )
}

export default AccountDropdown
