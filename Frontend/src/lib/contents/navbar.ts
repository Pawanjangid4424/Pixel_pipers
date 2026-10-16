// Links shown in the top navbar (Header.tsx). Add a link here to show it in the menu.
import { NavbarSectionType } from '@/lib/types';

export const navbarSection: NavbarSectionType = {
  navLinks: [
    { name: 'Login', url: '/login/' },
    { name: 'Register', url: '/register/' },
    { name: 'Try Demo', url: '/demo/' },
  ],
};
