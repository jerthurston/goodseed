'use client';
import SignInModal from "@/components/custom/modals/SignInModal";
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from "next/link";
import { useState } from "react";

const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <>
      <nav className="goodseed-nav">
        <Link href="/" className="logo">goodseed</Link>
        <div className="goodseed-nav-links">
          <Link href="/#features">About</Link>
          <Link href="/seeds">Browse</Link>
          <Link
            href="/favorites"
            className="favorites-link"
            title="View Favorites"
          >
            <FontAwesomeIcon icon={faHeart} />
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="login-btn">Sign in
          </button>
        </div>
      </nav>
      <SignInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
export default Header;
