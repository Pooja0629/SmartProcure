import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { 
      componentId, 
      alertType, 
      subject, 
      html, 
      previewOnly,
      modifiedByManager = false,
      originalQuantity,
      finalQuantity
    } = await req.json();

    // Fetch component details
    const { data: component, error: componentError } = await supabaseClient
      .from('components')
      .select('*, suppliers(*)')
      .eq('id', componentId)
      .single();

    if (componentError || !component) {
      console.error('Error fetching component:', componentError);
      return new Response(
        JSON.stringify({ error: 'Component not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!component.suppliers?.email) {
      return new Response(
        JSON.stringify({ error: 'Supplier email not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email content
    const { subject: emailSubject, html: emailHtml } = subject && html 
      ? { subject, html }
      : generateEmailContent(component, alertType);

    // If preview only, return without sending
    if (previewOnly) {
      return new Response(
        JSON.stringify({ 
          preview: true, 
          emailContent: { subject: emailSubject, html: emailHtml } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send email using Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Inventory System <onboarding@resend.dev>',
        to: [component.suppliers.email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log('Email sent successfully:', emailData);

    // Log email to history
    const { error: historyError } = await supabaseClient
      .from('email_history')
      .insert({
        component_id: componentId,
        supplier_id: component.supplier_id,
        alert_type: alertType,
        subject: emailSubject,
        email_body: emailHtml,
        sent_to: component.suppliers.email,
        status: 'sent',
        modified_by_manager: modifiedByManager,
        original_quantity: originalQuantity,
        final_quantity: finalQuantity || originalQuantity,
      });

    if (historyError) {
      console.error('Error logging email history:', historyError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: emailData?.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in send-supplier-alert:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

function generateEmailContent(component: any, alertType: 'critical' | 'reorder' | 'low_stock'): { subject: string; html: string } {
  const stockPercentage = (component.current_stock / component.min_stock) * 100;
  const recommendedQuantity = component.reorder_quantity || 
    Math.max(component.optimal_inventory_level || component.min_stock * 2, component.min_stock * 2);
  
  const urgencyLevel = alertType === 'critical' ? 'URGENT' : alertType === 'low_stock' ? 'NOTICE' : 'STANDARD';
  const deliveryTimeline = alertType === 'critical' ? '24-48 hours' : alertType === 'low_stock' ? '5-7 business days' : '3-5 business days';

  if (alertType === 'critical') {
    return {
      subject: `🔴 CRITICAL: ${component.name} Stock Alert - Immediate Action Required`,
      html: `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto}.header{background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{padding:30px;background:#ffffff}.alert-box{background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%);border-left:4px solid #dc2626;padding:20px;margin:20px 0;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.recommendation{background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border:2px solid #f59e0b;padding:20px;margin:20px 0;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb}.quantity{font-size:28px;font-weight:bold;color:#dc2626;text-align:center;padding:20px;background:rgba(255,255,255,0.7);border-radius:8px;margin:15px 0}.ai-badge{background:#3b82f6;color:white;padding:4px 12px;border-radius:12px;font-size:11px;display:inline-block;margin-left:8px}.footer{background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;border-radius:0 0 8px 8px}</style></head><body><div class="header"><h1>🚨 CRITICAL STOCK ALERT</h1><p>Immediate action required - Production at risk</p></div><div class="content"><p>Dear ${component.suppliers?.name || 'Supplier'},</p><p>Our <strong>AI-powered inventory system</strong> has detected <strong>critically low stock levels</strong> requiring immediate attention:</p><div class="alert-box"><h2 style="color:#991b1b;margin-top:0">📦 Component Details</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:10px 0;color:#6b7280;font-weight:500;width:45%">Component:</td><td style="padding:10px 0;color:#111827;font-weight:600">${component.name}</td></tr><tr><td style="padding:10px 0;color:#6b7280;font-weight:500">Category:</td><td style="padding:10px 0;color:#111827">${component.category}</td></tr><tr style="background:rgba(255,255,255,0.5)"><td style="padding:10px;color:#6b7280;font-weight:500">Current Stock:</td><td style="padding:10px;color:#dc2626;font-weight:700;font-size:20px">${component.current_stock} units</td></tr><tr><td style="padding:10px 0;color:#6b7280;font-weight:500">Minimum Required:</td><td style="padding:10px 0;color:#111827;font-weight:600">${component.min_stock} units</td></tr><tr style="background:rgba(255,255,255,0.5)"><td style="padding:10px;color:#6b7280;font-weight:500">Stock Level:</td><td style="padding:10px;color:#dc2626;font-weight:700;font-size:16px">${stockPercentage.toFixed(1)}% of minimum</td></tr></table></div><div class="recommendation"><h3 style="color:#92400e;margin-top:0">🤖 AI-Generated Recommendation<span class="ai-badge">AI CALCULATED</span></h3><div class="quantity">${recommendedQuantity} units</div><p style="margin-top:15px;color:#78350f;background:rgba(255,255,255,0.8);padding:15px;border-radius:6px"><strong>📊 Analysis:</strong> This AI-calculated quantity will restore optimal inventory levels based on historical usage patterns. Ordering this amount will prevent production disruption.<br><br><strong>⏱️ Urgency Level:</strong> ${urgencyLevel}<br><strong>📅 Required Delivery:</strong> ${deliveryTimeline}<br><strong>💰 Unit Cost:</strong> ₹${component.unit_cost?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}<br><strong>💵 Total Value:</strong> ₹${(recommendedQuantity * (component.unit_cost || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div><p><strong>⚡ Please confirm receipt and provide:</strong></p><ul style="line-height:1.8"><li>Expedited delivery timeframe</li><li>Order confirmation number</li><li>Expected delivery date</li><li>Tracking information</li></ul></div><div class="footer"><p>Inventory Management System | AI-Powered Automated Alert</p></div></body></html>`
    };
  } else if (alertType === 'reorder') {
    return {
      subject: `📋 Reorder Recommendation: ${component.name}`,
      html: `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto}.header{background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{padding:30px;background:#ffffff}.info-box{background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-left:4px solid #2563eb;padding:20px;margin:20px 0;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.recommendation{background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:2px solid #22c55e;padding:20px;margin:20px 0;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.quantity{font-size:28px;font-weight:bold;color:#2563eb;text-align:center;padding:20px;background:rgba(255,255,255,0.7);border-radius:8px;margin:15px 0}.ai-badge{background:#10b981;color:white;padding:4px 12px;border-radius:12px;font-size:11px;display:inline-block;margin-left:8px}.footer{background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;border-radius:0 0 8px 8px}</style></head><body><div class="header"><h1>📋 Reorder Recommendation</h1><p>Proactive AI-powered inventory management</p></div><div class="content"><p>Dear ${component.suppliers?.name || 'Supplier'},</p><p>Our <strong>AI-powered inventory system</strong> recommends restocking the following component to maintain optimal inventory levels:</p><div class="info-box"><h2 style="color:#1e40af;margin-top:0">📦 Component Information</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:10px 0;color:#6b7280;font-weight:500;width:45%">Component:</td><td style="padding:10px 0;color:#111827;font-weight:600">${component.name}</td></tr><tr><td style="padding:10px 0;color:#6b7280;font-weight:500">Current Stock:</td><td style="padding:10px;color:#f59e0b;font-weight:700;font-size:18px">${component.current_stock} units</td></tr><tr><td style="padding:10px 0;color:#6b7280;font-weight:500">Stock Level:</td><td style="padding:10px;color:#f59e0b;font-weight:700;font-size:16px">${stockPercentage.toFixed(1)}% of minimum</td></tr></table></div><div class="recommendation"><h3 style="color:#166534;margin-top:0">🤖 AI-Generated Recommendation<span class="ai-badge">AI CALCULATED</span></h3><div class="quantity">${recommendedQuantity} units</div><p style="margin-top:15px;color:#166534;background:rgba(255,255,255,0.8);padding:15px;border-radius:6px"><strong>📊 Analysis:</strong> Our AI system calculated this optimal reorder quantity to maintain operational efficiency.<br><br><strong>⏱️ Urgency Level:</strong> ${urgencyLevel}<br><strong>📅 Delivery:</strong> ${deliveryTimeline}<br><strong>💰 Unit Cost:</strong> ₹${component.unit_cost?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}<br><strong>💵 Total Value:</strong> ₹${(recommendedQuantity * (component.unit_cost || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div></div><div class="footer"><p>Inventory Management System | AI-Powered Automated Recommendation</p></div></body></html>`
    };
  } else {
    return {
      subject: `⚠️ Low Stock Notice: ${component.name}`,
      html: `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{padding:30px;background:#ffffff}.info-box{background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border-left:4px solid #f59e0b;padding:20px;margin:20px 0;border-radius:8px}.quantity{font-size:28px;font-weight:bold;color:#f59e0b;text-align:center;padding:20px;background:rgba(255,255,255,0.7);border-radius:8px;margin:15px 0}.ai-badge{background:#84cc16;color:white;padding:4px 12px;border-radius:12px;font-size:11px;display:inline-block;margin-left:8px}.footer{background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;border-radius:0 0 8px 8px}</style></head><body><div class="header"><h1>⚠️ Low Stock Warning</h1><p>Early notification - Action recommended</p></div><div class="content"><p>Dear ${component.suppliers?.name || 'Supplier'},</p><p>Our <strong>AI monitoring system</strong> has detected that ${component.name} is approaching reorder levels. This is an early notification to help you plan ahead.</p><div class="info-box"><h2 style="color:#d97706;margin-top:0">📦 Component Information</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:10px 0;color:#6b7280">Component:</td><td style="padding:10px 0;font-weight:600">${component.name}</td></tr><tr><td style="padding:10px 0;color:#6b7280">Current Stock:</td><td style="padding:10px;color:#f59e0b;font-weight:700;font-size:18px">${component.current_stock} units</td></tr><tr><td style="padding:10px 0;color:#6b7280">Stock Level:</td><td style="padding:10px;color:#f59e0b;font-weight:700">${stockPercentage.toFixed(1)}% of minimum</td></tr></table></div><p style="background:#fef3c7;padding:12px;border-radius:6px;border-left:3px solid #f59e0b"><strong>📅 Planning Advantage:</strong> This advance notice gives you time to plan the order and coordinate with other orders for potential savings.</p></div><div class="footer"><p>Inventory Management System | AI-Powered Early Warning System</p></div></body></html>`
    };
  }
}

serve(handler);
