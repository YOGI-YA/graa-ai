import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema()

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const learningStyle = typeof body.learningStyle === 'string' ? body.learningStyle : null
    const language = typeof body.language === 'string' && body.language.trim() ? body.language.trim() : 'en'

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (exists) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        learningStyle,
        language,
      },
      select: { id: true, email: true, name: true, language: true },
    })

    logger.info('AUTH', `New user registered successfully`, { userId: user.id, email: user.email })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (error) {
    logger.error('AUTH', 'User registration failed unexpectedly', error)
    return NextResponse.json(
      { error: 'Registration could not be completed. Please try again later.' },
      { status: 500 }
    )
  }
}

