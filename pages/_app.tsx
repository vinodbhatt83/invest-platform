// pages/_app.tsx
import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import { NotificationProvider } from '../components/ui/Notification';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
    return (
        <SessionProvider session={session}>
            <NotificationProvider>
                <Component {...pageProps} />
            </NotificationProvider>
        </SessionProvider>
    );
}