import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import CryptoJS from 'npm:crypto-js@4.2.0';

const MERCHANT_KEY = Deno.env.get('PAYU_MERCHANT_KEY');
const MERCHANT_SALT = Deno.env.get('PAYU_MERCHANT_SALT');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const verifyPayuHash = (params: any): boolean => {
  const receivedHash = params.hash;
  const status = params.status;
  const txnid = params.txnid;
  const amount = params.amount;
  const productinfo = params.productinfo;
  const firstname = params.firstname;
  const email = params.email;
  
  // Generate hash string based on PayU's formula
  const hashString = `${MERCHANT_SALT}|${status}|||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${MERCHANT_KEY}`;
  const calculatedHash = CryptoJS.SHA512(hashString).toString();
  
  return receivedHash === calculatedHash;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const params = await req.json();
    
    // Verify hash
    if (!verifyPayuHash(params)) {
      throw new Error('Invalid hash');
    }

    // Update donation status in database
    const { error: dbError } = await supabase
      .from('donations')
      .update({ 
        status: params.status.toLowerCase(),
        payment_id: params.mihpayid,
        payment_mode: params.mode,
        payment_time: new Date().toISOString()
      })
      .eq('transaction_id', params.txnid);

    if (dbError) {
      throw new Error('Failed to update donation status');
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});