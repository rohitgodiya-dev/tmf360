'use client';
import { useEffect } from 'react';

// Site360 invitations are accepted on the shared invitation page, which sends
// site staff on to the Site360 sign-in afterwards.
export default function Site360InviteRedirect() {
  useEffect(() => {
    window.location.replace('/platform/invite' + window.location.search);
  }, []);
  return <div style={{ maxWidth: 420, margin: '80px auto', fontFamily: 'Arial, sans-serif', color: '#6B7280', fontSize: 13 }}>Opening your invitation…</div>;
}
