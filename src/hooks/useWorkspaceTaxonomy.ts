import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';

export const useWorkspaceTaxonomy = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { getTaxonomy } = useLanguage();
  
  return getTaxonomy(activeWorkspace.type);
};
