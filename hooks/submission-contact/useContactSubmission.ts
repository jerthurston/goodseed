import { useMutation } from '@tanstack/react-query';
import { ContactSubmissionInput } from '@/schemas/contact-submission.schema';

interface ContactSubmissionResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    createdAt: string;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Submit contact form
 */
async function submitContactForm(data: ContactSubmissionInput): Promise<ContactSubmissionResponse> {
  const response = await fetch('/api/contact-submission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to submit contact form');
  }

  return result;
}

/**
 * Hook to submit contact form with TanStack Query mutation
 * 
 * @example
 * ```tsx
 * const { mutate, isPending, isSuccess, error } = useContactSubmission();
 * 
 * const handleSubmit = (data: ContactSubmissionInput) => {
 *   mutate(data, {
 *     onSuccess: (response) => {
 *       console.log('Submitted successfully!', response);
 *     },
 *     onError: (error) => {
 *       console.error('Submission failed:', error);
 *     },
 *   });
 * };
 * ```
 */
export function useContactSubmission() {
  return useMutation<ContactSubmissionResponse, Error, ContactSubmissionInput>({
    mutationFn: submitContactForm,
    // Optional: Add retry logic
    retry: 1,
  });
}
