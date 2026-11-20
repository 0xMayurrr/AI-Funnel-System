import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../worker/src/app.ts'

const env={DEMO_MODE:'true',APP_ORIGIN:'http://localhost:5173'}
const request=(path:string,init?:RequestInit)=>app.request(`/api/v1${path}`,init,env)

test('funnel creation, publish and public lead intake work end to end',async()=>{
  const slug=`api-check-${crypto.randomUUID().slice(0,8)}`
  const created=await request('/funnels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'API check funnel',slug})})
  assert.equal(created.status,201)
  const funnel=(await created.json() as {data:{id:string}}).data
  const published=await request(`/funnels/${funnel.id}/publish`,{method:'POST'})
  assert.equal(published.status,200)
  const publicPage=await request(`/public/funnels/${slug}`)
  assert.equal(publicPage.status,200)
  const email=`${slug}@example.com`
  const submission=await request(`/public/funnels/${slug}/submissions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:{name:'Test Person',email,company:'Example Co',service:'Improve enquiry conversion',consent:true},consent:true})})
  assert.equal(submission.status,201)
  const leads=await request(`/leads?q=${encodeURIComponent(email)}`)
  assert.equal(leads.status,200)
  const leadRows=(await leads.json() as {data:Array<{id:string;email:string}>}).data
  const records=leadRows
  assert.equal(records.length,1)
  assert.equal(records[0].email,email)
  const detail=await request(`/leads/${leadRows[0].id}`)
  assert.equal(detail.status,200)
  assert.equal((await detail.json() as {data:{name:string}}).data.name,'Test Person')
  const analytics=await request('/analytics/overview')
  assert.equal(analytics.status,200)
  assert.ok((await analytics.json() as {data:{sources:Array<{source:string}>}}).data.sources.some(source=>source.source===slug))
})

test('public submissions reject invalid consent and malformed required fields',async()=>{
  const denied=await request('/public/funnels/growth-consultation/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test Person',email:'test@example.com',service:'Help',consent:false})})
  assert.equal(denied.status,422)
  const invalid=await request('/public/funnels/growth-consultation/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'X',email:'not-an-email',service:'',consent:true})})
  assert.equal(invalid.status,422)
})

test('demo funnel can be edited into a draft and deactivated',async()=>{
  const slug=`edit-check-${crypto.randomUUID().slice(0,8)}`
  const created=await request('/funnels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Editable funnel',slug})})
  const funnel=(await created.json() as {data:{id:string}}).data
  const config=await request(`/funnels/${funnel.id}/config`)
  assert.equal(config.status,200)
  const original=(await config.json() as {data:{fields:Array<unknown>}}).data
  const saved=await request(`/funnels/${funnel.id}/config`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Updated funnel',slug,headline:'A better enquiry headline',description:'Tell us what you need.',fields:original.fields})})
  assert.equal(saved.status,200)
  assert.equal((await saved.json() as {data:{status:string;name:string}}).data.status,'draft')
  await request(`/funnels/${funnel.id}/publish`,{method:'POST'})
  const stopped=await request(`/funnels/${funnel.id}/deactivate`,{method:'POST'})
  assert.equal((await stopped.json() as {data:{status:string}}).data.status,'inactive')
  assert.equal((await request(`/public/funnels/${slug}`)).status,404)
})

test('funnel page views and visitor conversion rates are tracked and calculated', async () => {
  const slug = `view-check-${crypto.randomUUID().slice(0, 8)}`
  const created = await request('/funnels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'View Check Funnel', slug }) })
  const funnel = (await created.json() as { data: { id: string } }).data
  await request(`/funnels/${funnel.id}/publish`, { method: 'POST' })

  // Record 4 page views
  await request(`/public/funnels/${slug}/views`, { method: 'POST' })
  await request(`/public/funnels/${slug}/views`, { method: 'POST' })
  await request(`/public/funnels/${slug}/views`, { method: 'POST' })
  await request(`/public/funnels/${slug}/views`, { method: 'POST' })

  // Submit 1 lead (25% conversion rate)
  await request(`/public/funnels/${slug}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: { name: 'Visitor One', email: `${slug}@example.com`, company: 'Growth Co', service: 'Automate sales funnel', consent: true }, consent: true })
  })

  const analytics = await request('/analytics/funnels')
  assert.equal(analytics.status, 200)
  const data = (await analytics.json() as { data: Array<{ slug: string; views: number; submissions: number; conversionRate: number }> }).data
  const report = data.find(item => item.slug === slug)
  assert.ok(report, 'Report should contain funnel')
  assert.equal(report.submissions, 1)
  assert.ok(report.views >= 4, `Expected at least 4 views, got ${report.views}`)
  assert.ok(report.conversionRate > 0, `Expected positive conversion rate, got ${report.conversionRate}`)
})

test('knowledge base supports creation, file ingestion, editing and deletion', async () => {
  // 1. Create text knowledge
  const createRes = await request('/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Pricing and Terms', content: 'Minimum engagement is $3,000 per month. Payment due on the first of each month.', approved: true })
  })
  assert.equal(createRes.status, 201)
  const doc = (await createRes.json() as { data: { id: string; title: string; approved: boolean } }).data
  assert.equal(doc.title, 'Pricing and Terms')
  assert.equal(doc.approved, true)

  // 2. Upload / ingest document
  const uploadRes = await request('/knowledge/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Client Onboarding Guide', content: 'Steps to onboard: 1. Discovery call, 2. Technical integration, 3. Review launch.', filename: 'onboarding.md', source_type: 'file', approved: false })
  })
  assert.equal(uploadRes.status, 201)
  const uploaded = (await uploadRes.json() as { data: { id: string; title: string } }).data
  assert.equal(uploaded.title, 'Client Onboarding Guide')

  // 3. Edit knowledge
  const editRes = await request(`/knowledge/${doc.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated Pricing and Terms', content: 'Minimum engagement is $5,000 per month. Retainers billed upfront.', approved: true })
  })
  assert.equal(editRes.status, 200)
  assert.equal((await editRes.json() as { data: { title: string } }).data.title, 'Updated Pricing and Terms')

  // 4. Delete knowledge
  const deleteRes = await request(`/knowledge/${uploaded.id}`, { method: 'DELETE' })
  assert.equal(deleteRes.status, 200)
  assert.equal((await deleteRes.json() as { data: { deleted: boolean } }).data.deleted, true)
})

test('lead qualification conversation flow persists messages and AI drafts', async () => {
  // Submit a lead first
  const email = `convo-lead-${crypto.randomUUID().slice(0, 6)}@example.com`
  await request('/public/funnels/growth-consultation/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: { name: 'Conversation Prospect', email, company: 'Scale Inc', service: 'Need high-converting funnel', consent: true }, consent: true })
  })

  const leadsRes = await request(`/leads?q=${encodeURIComponent(email)}`)
  const leadId = (await leadsRes.json() as { data: Array<{ id: string }> }).data[0].id

  // 1. Get or create conversation
  const convRes = await request(`/leads/${leadId}/conversation`)
  assert.equal(convRes.status, 200)
  const convData = (await convRes.json() as { data: { conversation: { id: string }; messages: Array<{ content: string; sender_type: string }> } }).data
  assert.ok(convData.conversation.id)
  assert.ok(convData.messages.length >= 1)

  // 2. Human sends a message
  const msgRes = await request(`/leads/${leadId}/conversation/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_type: 'human', content: 'Hello! Thanks for your enquiry. We would love to learn more.', review_state: 'approved' })
  })
  assert.equal(msgRes.status, 201)

  // 3. Trigger AI reply generation (drafted for human review)
  const aiDraftRes = await request(`/leads/${leadId}/conversation/ai-reply`, { method: 'POST' })
  assert.equal(aiDraftRes.status, 201)
  const draft = (await aiDraftRes.json() as { data: { id: string; review_state: string; content: string } }).data
  assert.equal(draft.review_state, 'draft')
  assert.ok(draft.content.length > 10)

  // 4. Human reviews and approves the draft
  const approveRes = await request(`/conversations/messages/${draft.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_state: 'approved' })
  })
  assert.equal(approveRes.status, 200)
  assert.equal((await approveRes.json() as { data: { review_state: string } }).data.review_state, 'approved')
})

test('back office operations overview and service package assignment work', async () => {
  // 1. Overview metrics
  const overviewRes = await request('/admin/overview')
  assert.equal(overviewRes.status, 200)
  const overview = (await overviewRes.json() as { data: { workspaces: number; leads: number } }).data
  assert.ok(overview.workspaces >= 1)

  // 2. Service packages list
  const pkgRes = await request('/admin/service-packages')
  assert.equal(pkgRes.status, 200)
  const pkgs = (await pkgRes.json() as { data: Array<{ code: string }> }).data
  assert.ok(pkgs.some(p => p.code === 'starter'))
  assert.ok(pkgs.some(p => p.code === 'growth'))

  // 3. Assign package
  const setPkgRes = await request('/admin/workspaces/00000000-0000-4000-8000-000000000001/package', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'growth' })
  })
  assert.equal(setPkgRes.status, 200)
  assert.equal((await setPkgRes.json() as { data: { package_code: string } }).data.package_code, 'growth')
})

test('client change requests and agency DFY queue work end to end', async () => {
  // 1. Client creates a change request for landing page customization
  const createRes = await request('/change-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'landing_page',
      title: 'Update landing page headline to enterprise positioning',
      description: 'Please change our headline to: "High-Volume B2B Lead Engine" and emphasize our 24/7 qualification.',
      priority: 'high'
    })
  })
  assert.equal(createRes.status, 201)
  const reqData = (await createRes.json() as { data: { id: string; status: string; category: string } }).data
  assert.equal(reqData.status, 'pending')
  assert.equal(reqData.category, 'landing_page')

  // 2. Client retrieves their change requests
  const listRes = await request('/change-requests')
  assert.equal(listRes.status, 200)
  const list = (await listRes.json() as { data: Array<{ id: string }> }).data
  assert.ok(list.some(r => r.id === reqData.id))

  // 3. Admin Back Office reviews and starts work on the request
  const inProgressRes = await request(`/admin/change-requests/${reqData.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress', admin_notes: 'Designer working on copy updates.' })
  })
  assert.equal(inProgressRes.status, 200)
  assert.equal((await inProgressRes.json() as { data: { status: string } }).data.status, 'in_progress')

  // 4. Admin marks changes live and completed
  const completedRes = await request(`/admin/change-requests/${reqData.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed', admin_notes: 'Headline deployed to live funnel.' })
  })
  assert.equal(completedRes.status, 200)
  const completedData = (await completedRes.json() as { data: { status: string; resolved_at?: string } }).data
  assert.equal(completedData.status, 'completed')
  assert.ok(Boolean(completedData.resolved_at))
})

