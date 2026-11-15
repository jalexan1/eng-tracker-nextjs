import { redirect } from 'next/navigation'

/**
 * Raíz: redirige al dashboard (el middleware ya protege la ruta).
 */
export default function RootPage() {
  redirect('/dashboard')
}
