'use client';

import { useState } from 'react';
import { logoutAction } from '@/app/actions/auth';

export default function LogoutButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      action={async () => {
        setIsSubmitting(true);
        await logoutAction();
      }}
    >
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging out...' : 'Logout'}
      </button>
    </form>
  );
}
