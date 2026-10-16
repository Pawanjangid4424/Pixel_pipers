/**
 * App layout + all page routes.
 *
 * Every page inside `children` is rendered below the fixed <Header /> through <Outlet />.
 * NotFound and PaymentSuccess are full-screen pages, so they live outside the layout.
 */
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Home, NotFound, Login, Register, Payment, PaymentSuccess } from '@/pages';
import { Header } from './container';

// Common layout: header on top, current page below it
const App: React.FC = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: <Home /> },
      // "Try Demo" in the navbar/footer points here – it was missing before and showed 404
      { path: '/demo/', element: <Home /> },
      { path: '/login/', element: <Login /> },
      { path: '/register/', element: <Register /> },
      { path: '/payment/', element: <Payment /> },
    ],
  },
  { path: '/payment/status/', element: <PaymentSuccess /> },
  // Any unknown URL
  { path: '*', element: <NotFound /> },
]);
