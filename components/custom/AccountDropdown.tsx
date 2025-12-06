'use client'

import { faChevronDown, faCog, faSignOutAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface AccountDropdownProps {
    onLogout: () => void
}

const AccountDropdown = ({ onLogout }: AccountDropdownProps) => {
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

    return (
        <div className="account-dropdown" ref={dropdownRef}>
            <a
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
                Account <FontAwesomeIcon icon={faChevronDown} className="dropdown-caret" />
            </a>
            <div
                className={`dropdown-menu ${isOpen ? 'active' : ''}`}
                id="accountDropdownMenu"
            >
                <Link href="/dashboard/user/settings" className="dropdown-item">
                    <FontAwesomeIcon icon={faCog} /> Settings
                </Link>
                <a
                    href="#"
                    id="logout-btn"
                    className="dropdown-item"
                    onClick={handleLogout}
                >
                    <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                </a>
            </div>
        </div>
    )
}

export default AccountDropdown
