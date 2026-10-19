import React from 'react';
import { useParams } from 'react-router-dom';
import { DevoteeProfile } from './DevoteeProfile';

/** Route wrapper: /u/:uid — public devotee profile. */
export const DevoteeRoute: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  if (!uid) return null;
  return <DevoteeProfile uid={uid} />;
};
