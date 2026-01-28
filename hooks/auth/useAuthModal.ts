import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// interface UseAuthModalOptions {
//     onAuthRequired?: ()=>void;
//     onAuthSuccess?: ()=> void;
//     title?:string;
//     description?:string;
// };

export function useAuthModal() {
    const {data:session , status} = useSession();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Check if user has already authenticated?
    const isAuthenticated = status === "authenticated" && !!session?.user;
    const isLoading = status === "loading";

    // Open auth modal
    const openAuthModal = useCallback(()=>{
        setIsAuthModalOpen(true);
    }, []);
    
    // Close auth modal
    const closeAuthModal = useCallback(()=>{
        setIsAuthModalOpen(false);
    },[]);

    // Execute action with authentication
    const executeWithAuth = useCallback((action: () => void) => {
        if (isAuthenticated) {
            action();
        } else if (!isLoading) {
            toast.warning("You need to sign in to add items to your wishlist.");
            // Only show modal if not still loading
            openAuthModal();
        }
    },[isLoading, isAuthenticated, openAuthModal]);

    // Check if user has already authenticated? yes => return true ; no => return false
    const checkAuthAndProceed = useCallback(():boolean => {
        // Session is loading, nothing to do
        if (isLoading) return false; 
        
        // User is authenticated, permission to continue
        if (isAuthenticated) return true; 

        // User is not authenticated, show auth modal
        openAuthModal();
        return false;
    },[isLoading, isAuthenticated]);

    // Auth Handle successful
    const handleAuthSuccess = useCallback(()=>{
        closeAuthModal();
        // options.onAuthSuccess?.();
    },[closeAuthModal]);

    return {
        // State
        isAuthenticated,
        isLoading,
        isAuthModalOpen,
        session,

        // Actions
        openAuthModal,
        closeAuthModal,
        executeWithAuth,
        handleAuthSuccess,
        checkAuthAndProceed,

        //Utilities
        requireAuth: !isAuthenticated && !isLoading
    }
}