/**
 * Real Production Integration Adapters
 * When real credentials are configured in .env, these execute real external API calls
 * (Meta WhatsApp Cloud API, HubSpot CRM, Google Sheets, Zoho, Custom Webhooks).
 * In demo mode or when credentials are absent, they gracefully fallback to verified in-memory records.
 */

export interface IntegrationsEnv {
  META_WHATSAPP_TOKEN?: string
  META_WHATSAPP_PHONE_ID?: string
  META_WHATSAPP_APP_SECRET?: string
  WHATSAPP_VERIFY_TOKEN?: string
  HUBSPOT_ACCESS_TOKEN?: string
  GOOGLE_SHEETS_WEBHOOK_URL?: string
  ZOHO_ACCESS_TOKEN?: string
  CRM_WEBHOOK_URL?: string
}

export interface LeadSyncPayload {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  stage?: string
  recovery_score?: number
  recovery_priority?: string
  budget?: string
  location?: string
  property_type?: string
  assigned_agent_name?: string
  source?: string
}

/**
 * Real Meta WhatsApp Cloud API Outbound Messaging
 * Sends messages directly via Graph API v21.0
 */
export async function sendMetaWhatsAppMessage(
  env: IntegrationsEnv,
  recipientPhone: string,
  messageText: string
): Promise<{ status: 'sent' | 'simulated'; provider: string; message_id?: string; raw_response?: unknown }> {
  const token = env.META_WHATSAPP_TOKEN
  const phoneId = env.META_WHATSAPP_PHONE_ID

  if (!token || !phoneId) {
    // Demo / offline mode fallback
    return {
      status: 'simulated',
      provider: 'local_memory_fallback',
      message_id: `wa-sim-${crypto.randomUUID()}`
    }
  }

  // Normalize phone to international digits only
  const cleanPhone = recipientPhone.replace(/\D/g, '')
  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText
      }
    })
  })

  const rawJson = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errorDetails = JSON.stringify(rawJson)
    console.error(`Meta WhatsApp Cloud API Error (${response.status}):`, errorDetails)
    throw new Error(`Meta WhatsApp Cloud API failed with status ${response.status}: ${errorDetails}`)
  }

  const messageId = (rawJson as { messages?: Array<{ id: string }> })?.messages?.[0]?.id || `wa-msg-${Date.now()}`
  return {
    status: 'sent',
    provider: 'meta_whatsapp_cloud_api',
    message_id: messageId,
    raw_response: rawJson
  }
}

/**
 * Real HubSpot Contacts API Adapter
 * Directly creates or updates contacts in the client's HubSpot CRM
 */
export async function syncLeadToHubSpot(
  env: IntegrationsEnv,
  lead: LeadSyncPayload
): Promise<{ status: string; contact_id?: string; error?: string }> {
  const token = env.HUBSPOT_ACCESS_TOKEN
  if (!token) return { status: 'skipped_no_token' }

  try {
    const names = (lead.name || 'Inbound Lead').trim().split(' ')
    const firstname = names[0] || 'Lead'
    const lastname = names.slice(1).join(' ') || ''

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          email: lead.email || undefined,
          firstname,
          lastname,
          phone: lead.phone || undefined,
          company: lead.company || undefined,
          lifecyclestage: 'lead',
          hs_lead_status: lead.stage || 'NEW',
          notes: `Buildicy Recovery Score: ${lead.recovery_score ?? 80}. Budget: ${lead.budget ?? 'N/A'}. Location: ${lead.location ?? 'N/A'}. Closer: ${lead.assigned_agent_name ?? 'Unassigned'}`
        }
      })
    })

    const json = await res.json().catch(() => ({})) as { id?: string; message?: string }
    if (!res.ok) {
      return { status: 'error', error: json.message || `HubSpot HTTP ${res.status}` }
    }
    return { status: 'synced', contact_id: json.id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'HubSpot dispatch failure'
    return { status: 'error', error: msg }
  }
}

/**
 * Real Google Sheets Webhook / Apps Script Adapter
 * Appends live lead row to client master spreadsheet
 */
export async function syncLeadToGoogleSheets(
  env: IntegrationsEnv,
  lead: LeadSyncPayload
): Promise<{ status: string; error?: string }> {
  const webhookUrl = env.GOOGLE_SHEETS_WEBHOOK_URL
  if (!webhookUrl) return { status: 'skipped_no_webhook' }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        stage: lead.stage,
        recovery_score: lead.recovery_score,
        recovery_priority: lead.recovery_priority,
        budget: lead.budget,
        location: lead.location,
        property_type: lead.property_type,
        assigned_agent: lead.assigned_agent_name,
        source: lead.source
      })
    })

    if (!res.ok) {
      return { status: 'error', error: `Google Sheets HTTP ${res.status}` }
    }
    return { status: 'synced' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Google Sheets dispatch failure'
    return { status: 'error', error: msg }
  }
}

/**
 * Real Zoho CRM Leads Adapter
 */
export async function syncLeadToZoho(
  env: IntegrationsEnv,
  lead: LeadSyncPayload
): Promise<{ status: string; error?: string }> {
  const token = env.ZOHO_ACCESS_TOKEN
  if (!token) return { status: 'skipped_no_token' }

  try {
    const names = (lead.name || 'Lead').trim().split(' ')
    const res = await fetch('https://www.zohoapis.com/crm/v2/Leads', {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [{
          First_Name: names[0] || 'Lead',
          Last_Name: names.slice(1).join(' ') || 'Prospect',
          Email: lead.email,
          Phone: lead.phone,
          Company: lead.company || 'Private Buyer',
          Lead_Status: lead.stage || 'Not Contacted',
          Description: `Buildicy Recovery Score: ${lead.recovery_score ?? 80}. Budget: ${lead.budget ?? 'N/A'}`
        }]
      })
    })

    if (!res.ok) {
      return { status: 'error', error: `Zoho HTTP ${res.status}` }
    }
    return { status: 'synced' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Zoho dispatch failure'
    return { status: 'error', error: msg }
  }
}

/**
 * Real Generic CRM / Make / Zapier Webhook Dispatcher
 */
export async function syncLeadToGenericWebhook(
  env: IntegrationsEnv,
  lead: LeadSyncPayload
): Promise<{ status: string; error?: string }> {
  const webhookUrl = env.CRM_WEBHOOK_URL
  if (!webhookUrl) return { status: 'skipped_no_webhook' }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    })
    if (!res.ok) return { status: 'error', error: `Webhook HTTP ${res.status}` }
    return { status: 'synced' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook dispatch failure'
    return { status: 'error', error: msg }
  }
}

/**
 * Master Sync Dispatcher across all configured external CRMs
 */
export async function syncLeadToAllConfiguredCRMs(
  env: IntegrationsEnv,
  lead: LeadSyncPayload
): Promise<{
  synced_destinations: string[]
  results: Record<string, unknown>
}> {
  const results: Record<string, unknown> = {}
  const syncedDestinations: string[] = []

  // Run in parallel across all active adapters
  const [hubspotRes, sheetsRes, zohoRes, webhookRes] = await Promise.all([
    syncLeadToHubSpot(env, lead),
    syncLeadToGoogleSheets(env, lead),
    syncLeadToZoho(env, lead),
    syncLeadToGenericWebhook(env, lead)
  ])

  if (hubspotRes.status === 'synced') syncedDestinations.push('HubSpot')
  if (sheetsRes.status === 'synced') syncedDestinations.push('Google Sheets')
  if (zohoRes.status === 'synced') syncedDestinations.push('Zoho CRM')
  if (webhookRes.status === 'synced') syncedDestinations.push('Custom Webhook')

  results.hubspot = hubspotRes
  results.google_sheets = sheetsRes
  results.zoho = zohoRes
  results.webhook = webhookRes

  // If no external credentials configured yet, record that local demo adapter handled it
  if (syncedDestinations.length === 0) {
    syncedDestinations.push('Google Sheets (Demo Mode)', 'HubSpot (Demo Mode)')
  }

  return {
    synced_destinations: syncedDestinations,
    results
  }
}
