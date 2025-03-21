import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export async function getServerSessionSafe(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Handle the case where Next.js is statically rendering
    if (process.env.NODE_ENV === 'production' && (!req || !req.headers)) {
      return null;
    }
    
    const session = await getServerSession(req, res, authOptions);
    return session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}