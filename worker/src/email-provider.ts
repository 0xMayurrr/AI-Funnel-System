export interface EmailMessage { from: string; to: string; subject: string; text: string; html: string; idempotencyKey: string }
export interface EmailDeliveryResult { provider: string; providerReference: string }
export interface EmailProvider { readonly code: string; send(message: EmailMessage): Promise<EmailDeliveryResult> }

export class ResendEmailProvider implements EmailProvider {
  readonly code='resend'
  constructor(private readonly apiKey:string,private readonly from:string){}
  async send(message:EmailMessage):Promise<EmailDeliveryResult>{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json','Idempotency-Key':message.idempotencyKey},body:JSON.stringify({from:this.from,to:[message.to],subject:message.subject,text:message.text,html:message.html})})
    const payload=await response.json().catch(()=>({})) as {id?:string;message?:string}
    if(!response.ok) throw Object.assign(new Error(payload.message??`Email provider failed (${response.status}).`),{status:response.status,transient:response.status===429||response.status>=500})
    if(!payload.id) throw Object.assign(new Error('Email provider returned no delivery reference.'),{transient:true})
    return {provider:this.code,providerReference:payload.id}
  }
}
