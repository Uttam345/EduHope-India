import React, { useState } from 'react';
import { CreditCard, Calendar, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SUGGESTED_AMOUNTS = [500, 1000, 2500, 5000];

const DonationCard: React.FC = () => {
  const [amount, setAmount] = useState<number | string>('');
  const [customAmount, setCustomAmount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount(false);
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value || /^\d+$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!amount || Number(amount) < 100) {
        setError('Please enter a valid donation amount (minimum ₹100)');
        return;
      }
      setStep(2);
      return;
    }

    if (!name || !email) {
      setError('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert amount to paise (smallest currency unit)
      const amountInPaise = Number(amount) * 100;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-donation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            name,
            email,
            phone,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from payment server');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <>
      <h3 className="text-2xl font-bold mb-4 text-center">Make a Donation</h3>
      <p className="text-center mb-6 text-gray-600">
        Choose an amount to donate
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {SUGGESTED_AMOUNTS.map((value) => (
          <button
            key={value}
            type="button"
            className={`py-3 rounded-lg border-2 transition-all ${
              !customAmount && amount === value
                ? 'border-secondary bg-secondary text-white font-semibold'
                : 'border-gray-300 text-black hover:border-secondary'
            }`}
            onClick={() => handleAmountSelect(value)}
          >
            ₹{value.toLocaleString()}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            className={`input-field pl-8 ${
              customAmount
                ? 'border-secondary ring-2 ring-secondary ring-opacity-10'
                : ''
            }`}
            placeholder="Custom Amount"
            value={customAmount ? amount : ''}
            onChange={(e) => {
              setCustomAmount(true);
              handleCustomAmountChange(e);
            }}
            onClick={() => setCustomAmount(true)}
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            ₹
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary w-full">
        Continue
      </button>
    </>
  );

  const renderStep2 = () => (
    <>
      <button
        type="button"
        className="mb-4 text-sm flex items-center text-primary"
        onClick={() => {
          setStep(1);
          setError(null);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      <h3 className="text-2xl font-bold mb-2">Your Details</h3>
      <p className="mb-6 text-gray-600">
        Donating:{' '}
        <span className="font-semibold text-secondary">
          ₹{Number(amount).toLocaleString()}
        </span>
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full Name
          </label>
          <input
            type="text"
            id="name"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full flex justify-center items-center"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </>
        ) : (
          'Complete Donation'
        )}
      </button>
    </>
  );

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-md w-full mx-auto">
      <form onSubmit={handleSubmit} className="p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </form>
    </div>
  );
};

export default DonationCard;