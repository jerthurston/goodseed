'use client'
import React, { useEffect, useRef, useState } from 'react'
import styles from './dashboardAdmin.module.css';
import { Edit, MoreVertical, Settings, Trash2 } from 'lucide-react';

interface ActionSellerCardProps {
    sellerId: string;
    onUpdate: ((id: string) => void) | undefined;
    onDelete: ((id: string) => void) | undefined;
}

export const ActionSellerCardBtn = ({ sellerId, onUpdate, onDelete }: ActionSellerCardProps) => {
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])
    return (
        <>
            <div className={styles.dropdownContainer} ref={dropdownRef}>
                <button
                    className={styles.dropdownTrigger}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    title="More actions"
                >
                    <Settings className="w-4 h-4" />
                </button>

                {isDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                        {onUpdate && (
                            <button
                                className={`${styles.dropdownItem} ${styles.dropdownItemUpdate}`}
                                onClick={() => {
                                    onUpdate(sellerId)
                                    setIsDropdownOpen(false)
                                }}
                            >
                                <Edit className="w-4 h-4" />
                                Update Seller
                            </button>
                        )}
                        {onDelete && (
                            <button
                                className={`${styles.dropdownItem} ${styles.dropdownItemDelete}`}
                                onClick={() => {
                                    onDelete(sellerId)
                                    setIsDropdownOpen(false)
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Seller
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
