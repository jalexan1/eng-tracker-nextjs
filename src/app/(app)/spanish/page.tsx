import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Español' }

export default function SpanishPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card text-center py-16">
        <p className="text-5xl mb-4">🇪🇸</p>
        <h1 className="text-2xl font-bold text-gray-900">App Español</h1>
        <p className="text-gray-500 mt-2">
          Mazos de vocabulario, consultas RAE y más — próximamente.
        </p>
        <div className="mt-6 text-left rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-medium mb-2">En desarrollo (v3):</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Mazos con SM-2 Algorithm (módulo aislado)</li>
            <li>Búsqueda de palabras en RAE</li>
            <li>Sesiones de lectura</li>
            <li>Ejercicios de gramática</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
