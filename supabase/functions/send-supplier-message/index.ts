import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from 'npm:resend@1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, message } = await req.json();

    // Send email via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { data, error } = await resend.emails.send({
      from: 'Procurement Team <onboarding@resend.dev>',
      to: to,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .message { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h2>Message from Procurement Team</h2>
          <div class="message">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p><strong>Best regards,</strong><br>Procurement Team</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from our inventory management system.
            Please do not reply directly to this email.
          </p>
        </body>
        </html>
      `
    });

    if (error) throw error;

    return new Response(JSON.stringify({
      message: 'Message sent successfully',
      resendId: data?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});