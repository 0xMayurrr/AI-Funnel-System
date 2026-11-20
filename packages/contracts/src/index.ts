import { z } from 'zod'

export const moduleCodes = ['ai_funnel', 'lead_concierge', 'growth_engine'] as const
export type ModuleCode = (typeof moduleCodes)[number]

export const modules = [
  { code: 'ai_funnel', name: 'AI Funnel System', description: 'Capture, qualify and follow up with every enquiry.', state: 'available' },
  { code: 'lead_concierge', name: 'AI Lead Concierge', description: 'Conversations across your approved channels.', state: 'planned' },
  { code: 'growth_engine', name: 'Complete AI Growth Engine', description: 'Connected pipelines and business workflows.', state: 'planned' },
] as const satisfies readonly { code: ModuleCode; name: string; description: string; state: 'available' | 'planned' }[]

export const formSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  company: z.string().trim().max(160).optional().default(''),
  service: z.string().trim().min(1).max(300),
  consent: z.literal(true),
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
  { key: 'name', label: 'Your name', type: 'text', required: true, position: 0, validation: {} },
  { key: 'email', label: 'Work email', type: 'email', required: true, position: 1, validation: {} },
  { key: 'company', label: 'Company', type: 'text', required: false, position: 2, validation: {} },
  { key: 'service', label: 'What would you like help with?', type: 'textarea', required: true, position: 3, validation: {} },
  { key: 'consent', label: 'I agree to be contacted about this enquiry.', type: 'checkbox', required: true, position: 4, validation: {} },
]
export const funnelCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  headline: z.string().trim().min(5).max(160).default('Let’s turn more enquiries into booked conversations.'),
  description: z.string().trim().min(5).max(600).default('Tell us about your business and we will get back to you.'),
  fields: z.array(funnelFieldSchema).min(2).max(30).default(defaultFunnelFields),
})

export const leadStatuses = ['new', 'qualified', 'unqualified', 'contacted', 'booked'] as const
export type LeadStatus = (typeof leadStatuses)[number]

export const aiQualificationResultSchema = z.object({
  classification: z.enum(['qualified', 'unqualified', 'review']),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(1200),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().max(200)).max(10),
})
export type AIQualificationResult = z.infer<typeof aiQualificationResultSchema>
export const aiReplyDraftSchema = z.object({subject:z.string().max(200),body:z.string().min(1).max(5000),reviewNotes:z.string().max(1000)})

export const conversationMessageSchema = z.object({
  sender_type: z.enum(['lead', 'assistant', 'human', 'system']),
  content: z.string().trim().min(1).max(10000),
  review_state: z.enum(['draft', 'approved', 'sent', 'rejected']).default('approved'),
})
export type ConversationMessageInput = z.infer<typeof conversationMessageSchema>

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


