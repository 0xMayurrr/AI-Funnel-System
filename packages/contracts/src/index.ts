import { z } from 'zod'

export const moduleCodes = ['ai_funnel', 'lead_concierge', 'growth_engine'] as const
export type ModuleCode = (typeof moduleCodes)[number]

export const modules = [
  { code: 'ai_funnel', name: 'Lead Recovery System', description: 'Capture every enquiry, respond in seconds, and qualify before agents waste time.', state: 'available' },
  { code: 'lead_concierge', name: 'AI Receptionist & Concierge', description: '24/7 WhatsApp & multi-channel response, objection handling, and booking.', state: 'planned' },
  { code: 'growth_engine', name: 'Qualified Booking & Recovery Engine', description: 'Site-visit scheduling, no-show recovery, CRM sync, and leakage prevention.', state: 'planned' },
] as const satisfies readonly { code: ModuleCode; name: string; description: string; state: 'available' | 'planned' }[]

export const formSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  company: z.string().trim().max(160).optional().default(''),
  service: z.string().trim().min(1).max(300),
  consent: z.literal(true),
  phone: z.string().trim().max(30).optional(),
  budget: z.string().trim().max(60).optional(),
  location: z.string().trim().max(100).optional(),
  source: z.string().trim().max(100).optional(),
  utm_source: z.string().trim().max(100).optional(),
  utm_medium: z.string().trim().max(100).optional(),
  utm_campaign: z.string().trim().max(100).optional()
})
export type FormSubmissionInput = z.infer<typeof formSubmissionSchema>

export const funnelFieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  label: z.string().trim().min(1).max(100),
  type: z.enum(['text', 'email', 'phone', 'select', 'textarea', 'checkbox']),
  required: z.boolean().default(false),
  position: z.number().int().min(0).max(30),
  validation: z.record(z.string(), z.unknown()).default({}),
})

const defaultFunnelFields: z.infer<typeof funnelFieldSchema>[] = [
  { key: 'name', label: 'Your Full Name', type: 'text', required: true, position: 0, validation: {} },
  { key: 'email', label: 'Work / Direct Email', type: 'email', required: true, position: 1, validation: {} },
  { key: 'phone', label: 'WhatsApp / Mobile Number', type: 'phone', required: true, position: 2, validation: {} },
  { key: 'service', label: 'Property Interest & Location', type: 'textarea', required: true, position: 3, validation: {} },
  { key: 'consent', label: 'I agree to be contacted via WhatsApp / Phone about this enquiry.', type: 'checkbox', required: true, position: 4, validation: {} },
]

export const funnelCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  headline: z.string().trim().min(5).max(160).default('Capture every enquiry and book qualified site visits.'),
  description: z.string().trim().min(5).max(600).default('Tell us about your property preferences and our AI Receptionist will respond in seconds.'),
  fields: z.array(funnelFieldSchema).min(2).max(30).default(defaultFunnelFields),
})

// Backward-compatible status list
export const leadStatuses = ['new', 'qualified', 'unqualified', 'contacted', 'booked'] as const
export type LeadStatus = (typeof leadStatuses)[number]

// Canonical 15-stage lead lifecycle state machine
export const canonicalLeadStages = [
  'NEW',
  'CONTACTED',
  'QUALIFYING',
  'QUALIFIED',
  'DISQUALIFIED',
  'NURTURE',
  'APPOINTMENT_BOOKED',
  'REMINDED',
  'VISITED',
  'NO_SHOW',
  'RECOVERY_FOLLOW_UP',
  'RESCHEDULED',
  'WON',
  'LOST',
  'ARCHIVED'
] as const
export type CanonicalLeadStage = (typeof canonicalLeadStages)[number]

// Leakage map classification
export const leakageStatuses = [
  'Recovered',
  'At Risk',
  'Leaked',
  'No-Show',
  'Disqualified',
  'Nurture',
  'Won',
  'Lost'
] as const
export type LeakageStatus = (typeof leakageStatuses)[number]

// Recovery priority score tiers
export const recoveryPriorityTiers = ['Hot Recovery', 'Warm Recovery', 'Nurture', 'Leaked', 'Disqualified'] as const
export type RecoveryPriorityTier = (typeof recoveryPriorityTiers)[number]

// Structured AI Qualification Result (Backward compatible)
export const aiQualificationResultSchema = z.object({
  classification: z.enum(['qualified', 'unqualified', 'review']),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(1200),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().max(200)).max(10),
})
export type AIQualificationResult = z.infer<typeof aiQualificationResultSchema>

// Structured AI Response Engine Output Contract
export const structuredAIOutputSchema = z.object({
  response_text: z.string(),
  channel: z.enum(['whatsapp', 'web', 'email', 'sms', 'internal']),
  intent: z.enum(['property_enquiry', 'pricing', 'booking', 'reschedule', 'objection', 'financing', 'general', 'human_handover']),
  qualification_status: z.enum(['qualified', 'disqualified', 'needs_more_info', 'uncertain']),
  qualification_score: z.number().int().min(0).max(100),
  extracted_fields: z.object({
    budget: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    property_type: z.string().nullable().optional(),
    bhk: z.string().nullable().optional(),
    timeline: z.string().nullable().optional(),
    financing: z.string().nullable().optional(),
    buy_or_rent: z.string().nullable().optional()
  }),
  next_action: z.enum(['send_response', 'request_info', 'book_appointment', 'route_to_agent', 'nurture', 'disqualify', 'human_handover']),
  booking_intent: z.boolean(),
  requires_human: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  compliance_flags: z.array(z.string()).default([])
})
export type StructuredAIOutput = z.infer<typeof structuredAIOutputSchema>

export const aiReplyDraftSchema = z.object({
  subject: z.string().max(200),
  body: z.string().min(1).max(5000),
  reviewNotes: z.string().max(1000)
})

export const conversationMessageSchema = z.object({
  sender_type: z.enum(['lead', 'assistant', 'human', 'system']),
  content: z.string().trim().min(1).max(10000),
  review_state: z.enum(['draft', 'approved', 'sent', 'rejected']).default('approved'),
})
export type ConversationMessageInput = z.infer<typeof conversationMessageSchema>

// Configurable Workspace Qualification Rules
export const workspaceQualificationRulesSchema = z.object({
  minimum_budget: z.number().min(0).default(5000000),
  currency: z.string().default('INR'),
  accepted_property_types: z.array(z.string()).default(['apartment', 'villa', 'plot', 'commercial']),
  accepted_locations: z.array(z.string()).default(['Whitefield', 'Hebbal', 'Sarjapur', 'Miami', 'South Beach']),
  minimum_timeline_days: z.number().int().default(30),
  require_financing_status: z.boolean().default(true),
  disqualify_if_rent_below: z.number().default(25000),
  qualified_score_threshold: z.number().int().min(0).max(100).default(70),
  human_review_threshold: z.number().int().min(0).max(100).default(50),
  priority_weights: z.object({
    budget: z.number().default(30),
    timeline: z.number().default(25),
    location_match: z.number().default(20),
    financing: z.number().default(15),
    property_type_match: z.number().default(10)
  }).default({
    budget: 30,
    timeline: 25,
    location_match: 20,
    financing: 15,
    property_type_match: 10
  })
})
export type WorkspaceQualificationRules = z.infer<typeof workspaceQualificationRulesSchema>

// Routing Rules Contract
export const routingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  conditions: z.object({
    city: z.string().optional(),
    budget_min: z.number().optional(),
    property_type: z.string().optional(),
    language: z.string().optional(),
    lead_source: z.string().optional(),
    outside_business_hours: z.boolean().optional()
  }),
  assign_to: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  notify: z.boolean().default(true)
})
export type RoutingRule = z.infer<typeof routingRuleSchema>

// Appointment / Site Visit Contract
export const appointmentCreateSchema = z.object({
  lead_id: z.string(),
  agent_id: z.string().optional(),
  appointment_type: z.enum(['site_visit', 'consultation', 'virtual_meeting']).default('site_visit'),
  property_id: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  timezone: z.string().default('Asia/Kolkata'),
  location: z.string().optional(),
  notes: z.string().optional()
})
export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>

// CRM Integration & Field Mapping Contract
export const crmIntegrationSchema = z.object({
  provider: z.enum(['google_sheets', 'hubspot', 'zoho', 'webhook', 'leadsquared', 'selldo', 'salesforce']),
  status: z.enum(['connected', 'disconnected', 'error']).default('connected'),
  field_mapping: z.record(z.string(), z.string()).default({}),
  sync_triggers: z.array(z.string()).default(['lead_created', 'lead_qualified', 'appointment_booked', 'stage_changed'])
})
export type CRMIntegration = z.infer<typeof crmIntegrationSchema>

// Inventory / Property Item Contract
export const inventoryPropertySchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  location: z.string(),
  property_type: z.enum(['apartment', 'villa', 'plot', 'commercial', 'penthouse']),
  configuration: z.string().default('3 BHK'),
  price_band: z.string(),
  price_numeric: z.number().min(0),
  availability_status: z.enum(['available', 'few_units_left', 'sold_out']).default('available'),
  possession_date: z.string().default('Ready to Move'),
  amenities: z.array(z.string()).default([]),
  assigned_agent_id: z.string().optional(),
  booking_rules: z.string().default('Private walkthroughs require 24h advance notice.')
})
export type InventoryProperty = z.infer<typeof inventoryPropertySchema>

export const knowledgeEntrySchema = z.object({
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(10).max(50000),
  source_type: z.enum(['text', 'file', 'url']).default('text'),
  approved: z.boolean().default(false),
})
export type KnowledgeEntryInput = z.infer<typeof knowledgeEntrySchema>

export const changeRequestCategories = ['landing_page', 'funnel_questions', 'ai_channels', 'qualification_criteria', 'other'] as const
export type ChangeRequestCategory = (typeof changeRequestCategories)[number]

export const changeRequestStatuses = ['pending', 'in_progress', 'completed', 'declined'] as const
export type ChangeRequestStatus = (typeof changeRequestStatuses)[number]

export const changeRequestSchema = z.object({
  category: z.enum(changeRequestCategories),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(5000),
  target_funnel_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
})
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>
