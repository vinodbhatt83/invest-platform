export const runtime = 'nodejs';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated and redirect to documents page
        // or to login if not authenticated
        const checkAuth = async () => {
            const session = await getSession();
            if (session) {
                router.push('/documents');
            } else {
                router.push('/auth/login');
            }
        };

        checkAuth();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">INVEST Platform</h1>
                    <p className="mt-2 text-gray-600">Loading...</p>
                    <div className="mt-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}