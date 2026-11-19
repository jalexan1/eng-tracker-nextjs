import type { Metadata } from 'next'
import { SignupForm } from '@modules/auth/components/SignupForm'

export const metadata: Metadata = { title: 'Crear cuenta' }

export default function SignupPage() {
  return <SignupForm />
}
