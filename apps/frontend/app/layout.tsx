import React from 'react';
import { Metadata } from 'next';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import './theme.css';

export const metadata: Metadata = {
  title: 'AetherCloud',
  description: 'Private cloud for photos, videos, documents, and spaces',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

import { NotificationProvider } from '../context/NotificationContext';

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var theme = 'dark';
                  if (saved === 'light' || saved === 'dark') {
                    theme = saved;
                  } else {
                    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    theme = systemDark ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />

      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <ConfirmProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </ConfirmProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

