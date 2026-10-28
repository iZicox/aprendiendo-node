import { useEffect, useState } from 'react'

export const Menu = () => {
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/' },
    { name: 'Contact', path: '/' },
    { name: 'About', path: '/' },
  ]

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav
      aria-label="Navegación principal"
      className={`
        fixed top-0 left-0 z-50
        flex w-full items-center justify-between
        px-4 md:px-16 lg:px-24 xl:px-32
        transition-all duration-500
        ${
          isScrolled
            ? 'bg-white/80 py-3 text-gray-700 shadow-md backdrop-blur-lg md:py-4'
            : 'bg-indigo-500 py-4 text-white md:py-6'
        }
      `}
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-2" aria-label="Inicio">
        <svg
          width="32"
          height="40"
          viewBox="0 0 32 40"
          fill="none"
          className="h-9 w-auto"
          aria-hidden="true"
        >
          <path
            d="m8.75 11.3 6.75 3.884 6.75-3.885M8.75 34.58v-7.755L2 22.939m27 0-6.75 3.885v7.754M2.405 15.408 15.5 22.954l13.095-7.546M15.5 38V22.939M29 28.915V16.962a2.98 2.98 0 0 0-1.5-2.585L17 8.4a3.01 3.01 0 0 0-3 0L3.5 14.377A3 3 0 0 0 2 16.962v11.953A2.98 2.98 0 0 0 3.5 31.5L14 37.477a3.01 3.01 0 0 0 3 0L27.5 31.5a3 3 0 0 0 1.5-2.585"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="text-xl font-semibold">Inventario</span>
      </a>

      {/* Enlaces de escritorio */}
      <div className="hidden items-center gap-4 md:flex lg:gap-8">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.path}
            className="group flex flex-col gap-0.5"
          >
            {link.name}

            <span
              aria-hidden="true"
              className="
                h-0.5 w-0 bg-current
                transition-all duration-300
                group-hover:w-full
              "
            />
          </a>
        ))}
        
      </div>

      {/* Acciones de escritorio */}
      <div className="hidden items-center gap-4 md:flex">
        <button type="button" aria-label="Buscar" className="cursor-pointer">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <button
          type="button"
          className={`
            ml-4 cursor-pointer rounded-full
            px-8 py-2.5 transition-colors duration-500
            ${isScrolled ? 'bg-black text-white' : 'bg-white text-black'}
          `}
        >
          Login
        </button>
      </div>

      {/* Abrir menú móvil */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="cursor-pointer md:hidden"
        aria-label="Abrir menú"
        aria-expanded={isMenuOpen}
        aria-controls="mobile-menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* Menú móvil */}
      <div
        id="mobile-menu"
        inert={!isMenuOpen}
        aria-hidden={!isMenuOpen}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsMenuOpen(false)
          }
        }}
        className={`
          fixed inset-0 z-50
          flex h-dvh flex-col
          items-center justify-center gap-6
          overflow-y-auto bg-white
          text-base font-medium text-gray-800
          transition-transform duration-500
          md:hidden
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          type="button"
          className="absolute top-4 right-4 cursor-pointer"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Cerrar menú"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.path}
            onClick={() => setIsMenuOpen(false)}
          >
            {link.name}
          </a>
        ))}

        <button
          type="button"
          className="
            cursor-pointer rounded-full
            bg-black px-8 py-2.5 text-white
          "
        >
          Login
        </button>
      </div>
    </nav>
  )
}
