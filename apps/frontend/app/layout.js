export const metadata = {
  title: 'HC Photos',
  description: 'Private photo/video hub',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif', margin: 0, background: '#09090b', color: '#f4f4f5' }}>
        {children}
      </body>
    </html>
  );
}
