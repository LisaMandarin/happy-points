import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Happy Points
          </h1>
          <p className="text-gray-600 text-lg">
            Store and redeem your points with ease
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/login"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 block text-center"
          >
            Login
          </Link>
          
          <Link
            href="/register"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 block text-center"
          >
            Register
          </Link>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          Join thousands of users earning and redeeming points daily
        </div>
      </div>
    </div>
  )
}