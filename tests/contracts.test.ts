import test from 'node:test'
import assert from 'node:assert/strict'
import { aiQualificationResultSchema, formSubmissionSchema, funnelCreateSchema } from '../packages/contracts/src/index.ts'

test('public form input requires valid contact details and affirmative consent', () => {
  assert.equal(formSubmissionSchema.safeParse({name:'A Person',email:'person@example.com',company:'',service:'Consulting',consent:true}).success,true)
  assert.equal(formSubmissionSchema.safeParse({name:'A Person',email:'wrong',service:'Consulting',consent:true}).success,false)
  assert.equal(formSubmissionSchema.safeParse({name:'A Person',email:'person@example.com',service:'Consulting',consent:false}).success,false)
})

test('funnel configuration supplies a validated starter form', () => {
  const parsed=funnelCreateSchema.parse({name:'Growth enquiry',slug:'growth-enquiry'})
  assert.equal(parsed.fields.some(field=>field.key==='email'&&field.required),true)
  assert.equal(parsed.fields.some(field=>field.key==='consent'&&field.required),true)
})

test('AI output rejects invalid scores and uncertain classifications remain explicit', () => {
  assert.equal(aiQualificationResultSchema.safeParse({classification:'review',score:100,summary:'Needs a human review.',confidence:0.4,reasons:['Not enough context']}).success,true)
  assert.equal(aiQualificationResultSchema.safeParse({classification:'qualified',score:120,summary:'Out of range.',confidence:0.9,reasons:[]}).success,false)
})
