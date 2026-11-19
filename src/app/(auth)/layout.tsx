export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1E] px-4">
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Language Tracker</h1>
          <p className="mt-1 text-sm text-gray-400">Aprende idiomas con spaced repetition</p>
        </div>
        {children}
      </div>
    </div>
  )
}
