import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

// Custom error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} non trouvé`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Accès refusé') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

// Error response type
interface ErrorResponse {
  error: string
  code?: string
  details?: any
  timestamp: string
}

// Main error handler for API routes
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error)

  const timestamp = new Date().toISOString()

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp,
      },
      { status: 400 }
    )
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        timestamp,
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'champ'
        return NextResponse.json(
          {
            error: `Cette valeur existe déjà pour: ${field}`,
            code: 'DUPLICATE_ENTRY',
            timestamp,
          },
          { status: 409 }
        )
      case 'P2025': // Record not found
        return NextResponse.json(
          {
            error: 'Enregistrement non trouvé',
            code: 'NOT_FOUND',
            timestamp,
          },
          { status: 404 }
        )
      case 'P2003': // Foreign key constraint
        return NextResponse.json(
          {
            error: 'Référence invalide à un enregistrement inexistant',
            code: 'FOREIGN_KEY_ERROR',
            timestamp,
          },
          { status: 400 }
        )
      case 'P2014': // Required relation violation
        return NextResponse.json(
          {
            error: 'Impossible de supprimer: des enregistrements liés existent',
            code: 'RELATION_CONSTRAINT',
            timestamp,
          },
          { status: 400 }
        )
      default:
        return NextResponse.json(
          {
            error: 'Erreur de base de données',
            code: 'DATABASE_ERROR',
            timestamp,
          },
          { status: 500 }
        )
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: 'Données invalides pour la base de données',
        code: 'VALIDATION_ERROR',
        timestamp,
      },
      { status: 400 }
    )
  }

  // Handle standard Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? error.message
          : 'Une erreur interne est survenue',
        code: 'INTERNAL_ERROR',
        timestamp,
      },
      { status: 500 }
    )
  }

  // Unknown error
  return NextResponse.json(
    {
      error: 'Une erreur inconnue est survenue',
      code: 'UNKNOWN_ERROR',
      timestamp,
    },
    { status: 500 }
  )
}

// Wrapper for API route handlers with error handling
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

// Client-side error handler for hooks
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'error' in error) {
    return (error as { error: string }).error
  }
  return 'Une erreur est survenue'
}

// Retry logic for failed requests
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  }

  throw lastError
}
