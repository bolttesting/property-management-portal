'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Menu, X, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    logout()
    router.push('/')
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/properties', label: 'Properties' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/20 backdrop-blur-xl bg-white/90 shadow-lg shadow-gray-200/20">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
        <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6 py-3">
          <Link href="/" className="flex items-center flex-shrink-0 group/logo">
            <div className="relative">
              <Home className="h-8 w-8 text-primary group-hover/logo:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="ml-3 text-xl md:text-2xl font-heading font-extrabold gradient-text">
              Property UAE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex flex-1 min-w-0 flex-wrap items-center justify-center gap-2 md:gap-3 lg:gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  isActive(link.href)
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-700 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {hasHydrated && isAuthenticated && user ? (
              <>
                {user.userType === 'tenant' && (
                  <Link
                    href="/tenant/dashboard"
                    className="px-4 py-2 rounded-lg font-semibold text-gray-700 hover:text-primary hover:bg-primary/10 transition-all duration-300"
                  >
                    Dashboard
                  </Link>
                )}
                {user.userType === 'owner' && (
                  <Link
                    href="/owner/dashboard"
                    className="px-4 py-2 rounded-lg font-semibold text-gray-700 hover:text-primary hover:bg-primary/10 transition-all duration-300"
                  >
                    Dashboard
                  </Link>
                )}
                {user.userType === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="px-4 py-2 rounded-lg font-semibold text-gray-700 hover:text-primary hover:bg-primary/10 transition-all duration-300"
                  >
                    Dashboard
                  </Link>
                )}
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{user.email || user.mobile || 'User'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg font-semibold text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg font-semibold text-gray-700 hover:text-primary hover:bg-primary/10 transition-all duration-300"
                >
                  Login
                </Link>
                <Link href="/auth/register" className="btn-primary">
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-text-primary hover:text-primary"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`transition-colors font-medium ${
                    isActive(link.href)
                      ? 'text-primary'
                      : 'text-text-primary hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                {hasHydrated && isAuthenticated && user ? (
                  <>
                    {user.userType === 'tenant' && (
                      <Link
                        href="/tenant/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-text-primary hover:text-primary transition-colors font-medium"
                      >
                        Dashboard
                      </Link>
                    )}
                    {user.userType === 'owner' && (
                      <Link
                        href="/owner/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-text-primary hover:text-primary transition-colors font-medium"
                      >
                        Dashboard
                      </Link>
                    )}
                    {user.userType === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-text-primary hover:text-primary transition-colors font-medium"
                      >
                        Dashboard
                      </Link>
                    )}
                    <div className="flex items-center gap-2 text-text-secondary py-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{user.email || user.mobile || 'User'}</span>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleLogout()
                      }}
                      className="block w-full text-left text-text-primary hover:text-red-600 transition-colors font-medium"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-text-primary hover:text-primary transition-colors font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block btn-primary text-center"
                    >
                      <span>Sign Up</span>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

