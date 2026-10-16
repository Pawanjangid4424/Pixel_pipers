/**
 * Payment page (Razorpay test mode).
 *
 * Flow:
 *  1. Load Razorpay's checkout script.
 *  2. Ask our payment server to create an order → { id, final_price, callback_url }.
 *  3. Open the Razorpay popup. After paying, Razorpay calls `handler`, which sends the
 *     payment ids + signature back to the server so it can verify the payment.
 *
 * NOTE: the payment server (pixelpipers.serveo.net) is a separate service that is not in
 * this repo and is currently offline, so this page will show an error until it is hosted again.
 */
import axios from 'axios';
import { showToast } from '@/lib/validators';

const PAYMENT_SERVER = 'https://pixelpipers.serveo.net';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const Payment = (): JSX.Element => {
  // Add a <script> tag and resolve when it has loaded
  const loadScript = async (src: string): Promise<boolean> => {
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const displayRazorpay = async (): Promise<void> => {
    const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!loaded) {
      showToast('Could not load Razorpay. Check your internet connection.', 'error');
      return;
    }

    try {
      // Step 2: create the order on our server
      const result = await axios.post<{ final_price: number; id: string; callback_url: string }>(
        `${PAYMENT_SERVER}/api/payment/`,
        { user: 1 }
      );

      const { id: order_id, final_price, callback_url } = result.data;
      // Razorpay expects the amount in paise (₹1 = 100 paise)
      const amount = (final_price * 100).toString();

      const options = {
        key: 'rzp_test_4IKoZ3Gyi4heeK', // Razorpay *test* key
        amount,
        currency: 'INR',
        name: 'Pixel Pipers',
        description: 'Test Transaction',
        order_id: order_id,
        callback_url: callback_url,
        // Step 3: send the payment proof back to the server for verification
        handler: async (response: RazorpayResponse) => {
          const data = {
            orderCreationId: order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          };
          await axios.post(`${PAYMENT_SERVER}/api/hadlereques/`, data);
        },
        theme: {
          color: '#61dafb',
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error('Error in fetching or processing payment:', error);
      showToast('Payment server is not reachable', 'error');
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-100 px-4 pt-24 pb-10">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Buy Pixel Pipers</h1>
        <p className="mt-2 text-gray-500">Unlock the full pipe-counting model.</p>
        <button
          className="mt-6 w-full py-3 rounded-md bg-gray-900 text-white font-semibold hover:bg-gray-700 transition"
          onClick={displayRazorpay}>
          Pay ₹500
        </button>
      </div>
    </section>
  );
};

export default Payment;
