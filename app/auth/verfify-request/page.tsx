import { Icons } from '@/components/ui/icons';

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <Icons.mail className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-muted-foreground mb-4">
          A sign in link has been sent to your email address.
        </p>
        <p className="text-sm text-muted-foreground">
          Make sure to check your spam folder if you don't see it within a few minutes.
        </p>
      </div>
    </div>
  );
}