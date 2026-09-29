import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Share',
    template: '%s',
  },
  description: 'Video calls and screen sharing.',
  openGraph: {
    siteName: 'Share',
  },
  appleWebApp: { capable: true, title: 'Share', statusBarStyle: 'black' },
  icons: {
    icon: { rel: 'icon', url: '/favicon.ico' },
    apple: [{ rel: 'apple-touch-icon', url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#070707',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-lk-theme="default">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
