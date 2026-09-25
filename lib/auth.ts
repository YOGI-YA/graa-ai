import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma, ensureDatabaseSchema } from './prisma'
import { logger } from './logger'

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null
      try {
        await ensureDatabaseSchema()
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })
        if (!user || !user.password) {
          logger.warn('AUTH', 'Login failed: user not found or no password set', { email: credentials.email })
          return null
        }
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) {
          logger.warn('AUTH', 'Login failed: incorrect password', { email: credentials.email })
          return null
        }
        logger.info('AUTH', 'User signed in via credentials', { userId: user.id, email: user.email })
        return { id: user.id, email: user.email, name: user.name }
      } catch (err) {
        logger.error('AUTH', 'Unexpected error during credentials authorization', err)
        return null
      }
    },
  }),
]

// Google is optional — only enabled when credentials are configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    // For Google sign-ins, make sure a matching user row exists in our DB.
    async signIn({ user, account }) {
      try {
        await ensureDatabaseSchema()
        if (account?.provider === 'google' && user.email) {
          await prisma.user.upsert({
            where: { email: user.email.toLowerCase().trim() },
            create: { email: user.email.toLowerCase().trim(), name: user.name || user.email.split('@')[0], image: user.image || null },
            update: { name: user.name || undefined, image: user.image || undefined },
          })
          logger.info('AUTH', 'User signed in via Google', { email: user.email })
        }
        return true
      } catch (err) {
        logger.error('AUTH', 'Error during Google sign-in callback', err)
        return true
      }
    },
    async jwt({ token, user, account }) {
      try {
        await ensureDatabaseSchema()
        // Credentials sign-in: user.id is already our DB id.
        if (user?.id && account?.provider !== 'google') {
          token.id = user.id
        }
        // Google sign-in: resolve our DB id from the email.
        if (account?.provider === 'google' && token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email.toLowerCase().trim() },
            select: { id: true, language: true },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.language = dbUser.language || 'en'
          }
        } else if (token.id && !token.language) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { language: true },
          })
          if (dbUser) token.language = dbUser.language || 'en'
        }
      } catch (err) {
        logger.error('AUTH', 'Error in JWT callback', err)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.language = (token.language as string) || 'en'
      }
      return session
    },
  },
}
