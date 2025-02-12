// src/ordering/components/auth/Profile.tsx

import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const Profile: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div className="p-4 text-center">Loading profile...</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold">You are not logged in</h2>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
      <img
        src={user.picture}
        alt={user.name}
        className="mx-auto rounded-full w-24 h-24 mb-4"
      />
      <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
      <p className="text-gray-700">{user.email}</p>
      {/* Additional user fields: user.nickname, user.updated_at, etc. */}
    </div>
  );
};

export default Profile;
