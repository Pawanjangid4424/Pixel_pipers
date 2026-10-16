// Home page = the pipe-counting Demo + footer
import { Footer } from '@/container';
import Demo from './Demo';

const Home: React.FC = () => {
  return (
    <>
      <main>
        <Demo />
      </main>
      <Footer />
    </>
  );
};

export default Home;
