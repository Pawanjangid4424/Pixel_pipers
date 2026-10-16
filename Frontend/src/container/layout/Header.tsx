/**
 * Top navigation bar (fixed to the top of every page).
 *
 * Responsive behaviour:
 *  - Phone / small tablet (< 768px): links are hidden behind the hamburger button (NavButton).
 *  - Tablet landscape / desktop (>= 768px, Tailwind `md:`): links are always shown in a row.
 *
 * Earlier this used a JS window-width hook, which started at width 0 and so hid the menu on
 * desktop for the first render. Tailwind's `hidden md:flex` does the same job in pure CSS.
 */
import { NavItem, NavButton } from '@/components';
import { useState } from 'react';
import { navbarSection } from '@/lib/contents/navbar';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  // true = mobile menu is open
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);
  const { navLinks } = navbarSection;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="w-full antialiased text-gray-700 bg-gray-100 shadow-md">
        <div className="flex flex-col max-w-screen-xl px-4 mx-auto md:items-center md:justify-between md:flex-row md:px-6 lg:px-8">
          {/* Logo + hamburger button (button only visible below md) */}
          <div className="flex flex-row items-center justify-between py-4">
            <Link
              to="/"
              onClick={() => setNavbarCollapsed(false)}
              className="text-base sm:text-lg font-semibold tracking-widest text-gray-900 uppercase rounded-lg focus:outline-none focus:shadow-outline">
              Pixel Pipers
            </Link>
            <NavButton
              onClick={() => setNavbarCollapsed(!navbarCollapsed)}
              navbarCollapsed={navbarCollapsed}
              className="rounded-lg md:hidden focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Links: shown on mobile only when the menu is open, always shown from md upwards */}
          <nav
            className={`${
              navbarCollapsed ? 'flex' : 'hidden'
            } md:flex flex-col flex-grow pb-4 md:pb-0 md:justify-end md:flex-row gap-1 md:gap-2`}>
            {navLinks.map((navLink, index) => (
              <NavItem
                key={index}
                to={navLink.url}
                children={navLink.name}
                // close the mobile menu after a link is tapped
                onClick={() => setNavbarCollapsed(false)}
              />
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
