'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { ToastProvider, useToast, ToastItem } from './ToastContext';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext';
import { AssetProvider, useAssets } from './AssetContext';
import { UploadProvider, useUpload } from './UploadContext';

export type { ToastItem };

const CloudContext = createContext<any>(undefined);

function LegacyCloudBridge({ children }: { children: React.ReactNode }): React.JSX.Element {
  const toast = useToast();
  const workspace = useWorkspace();
  const asset = useAssets();
  const upload = useUpload();
  const { t, language } = useLanguage();

  const merged = useMemo(() => ({
    t,
    language,
    ...toast,
    ...workspace,
    ...asset,
    ...upload
  }), [t, language, toast, workspace, asset, upload]);

  return (
    <CloudContext.Provider value={merged}>
      {children}
    </CloudContext.Provider>
  );
}

export function CloudProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ToastProvider>
      <WorkspaceProvider>
        <AssetProvider>
          <UploadProvider>
            <LegacyCloudBridge>
              {children}
            </LegacyCloudBridge>
          </UploadProvider>
        </AssetProvider>
      </WorkspaceProvider>
    </ToastProvider>
  );
}

export function useCloud() {
  const context = useContext(CloudContext);
  if (context === undefined) {
    throw new Error('useCloud must be used within a CloudProvider');
  }
  return context;
}
