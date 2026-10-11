import React from 'react';
import { WorkspaceType } from '../../types';
import { LandingPage as EnterpriseLandingPage } from '../../pages/LandingPage';

export interface PublicLandingPageProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onDemoStart?: (type: WorkspaceType) => void;
}

export const LandingPage: React.FC<PublicLandingPageProps> = (props) => {
  return <EnterpriseLandingPage {...props} />;
};

export default LandingPage;
