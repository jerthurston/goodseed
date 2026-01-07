'use client';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react';
import { createPortal } from 'react-dom';
import ActionConfirmModal from '../modals/ActionConfirmModal';
import SignOutModal from '../modals/SignOutModal';


const SignOutBtn = () => {
    const [isConfirmModal,setIsConfirmModal] = useState(false);
    const handleLogOut = () => {
        setIsConfirmModal(true);
    }
    return (
        <>
        <Link
            href="#"
            id="logout-btn"
            className="dropdown-item"
            onClick={() => handleLogOut()}
            >
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
        </Link>
            
            {/* Confirmation Action Modal - Rendered using Portal */}
            {/* --> Đưa SignOutModal vào body để render ngang cấp với hompage để position ở giữa mà không chịu chi phối bởi parent css context */}
           {isConfirmModal && createPortal(
            <SignOutModal 
               isOpen={isConfirmModal}
               onCancel={() => setIsConfirmModal(false)}
               onConfirm={() => signOut()}
            />,
            document.body
           )}
            </>
    )
}

export default SignOutBtn