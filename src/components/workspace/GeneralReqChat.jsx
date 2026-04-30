import { useState, useEffect, useRef } from 'react'
import { sendReqChat, getReqChat } from '@/api/reqchat'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { Send, Bot, Sparkles } from 'lucide-react'

const QUICK_ASKS = [
  'Summarize all seller negotiations so far',
  'Which seller has the best offer right now?',
  'Compare all sellers on price and lead time',
  'Which seller should I accept and why?',
  'Are there any red flags I should know about?',
  'What is the total savings vs my budget?',
]

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', gap:8, marginBottom:12, flexDirection: isUser ? 'row-reverse' : 'row' }} className="fade-in">
      {!isUser && (
        <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(96,165,250,0.2)', border:'1px solid rgba(96,165,250,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
          <Bot size={13} color="#60a5fa"/>
        </div>
      )}
      <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', gap:2, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
          <p style={{ fontSize:13, lineHeight:1.6, color:'rgba(255,255,255,0.92)', whiteSpace:'pre-wrap' }}>{msg.content}</p>
        </div>
      </div>
    </div>
  )
}

export default function GeneralReqChat({ req, leads = [] }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    if (!req) return
    getReqChat(req.id)
      .then(r => setMessages(r.data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [req?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, sending])

  const send = async (text) => {
    if (!text.trim() || sending || !req) return
    const userMsg = { role:'user', content: text }
    setMessages(p => [...p, userMsg])
    setInput(''); setSending(true)
    try {
      const res = await sendReqChat({ requirement_id: req.id, message: text })
      setMessages(res.data.messages || [])
    } catch { toast.error('Failed to get response') }
    finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 80) }
  }

  if (!req) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#0a1628' }}>
      <p style={{ color:'rgba(255,255,255,0.3)' }}>Select a requirement first</p>
    </div>
  )

  const active = leads.filter(l => ['agent_initiated','negotiating','renegotiating'].includes(l.status)).length
  const closed = leads.filter(l => l.status === 'deal_closed').length

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1628', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'18px 28px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bot size={16} color="#60a5fa"/>
          </div>
          <div>
            <h2 style={{ fontSize:14, fontWeight:800, color:'#fff' }}>
              AI Assistant — {req.product}
            </h2>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:1 }}>
              {leads.length} sellers · {active} negotiating · {closed} closed · Ask anything about this requirement
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 28px' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner size={22} color="rgba(255,255,255,0.3)"/></div>}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0' }} className="fade-in">
            <div style={{ width:48, height:48, borderRadius:14, background:'rgba(96,165,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Sparkles size={22} color="#60a5fa"/>
            </div>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:20 }}>
              Ask me anything about your {req.product} requirement and its {leads.length} seller negotiations.
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:520, margin:'0 auto' }}>
              {QUICK_ASKS.map((q, i) => (
                <button key={i} onClick={() => send(q)}
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'7px 14px', color:'rgba(255,255,255,0.65)', fontSize:12, cursor:'pointer', fontFamily:'Montserrat,sans-serif', transition:'all 0.15s' }}
                  onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.05)'}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => <Bubble key={i} msg={m}/>)}

        {sending && (
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(96,165,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Bot size={13} color="#60a5fa"/>
            </div>
            <div className="bubble-ai" style={{ display:'flex', gap:5, alignItems:'center', padding:'12px 14px' }}>
              <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'10px 28px 18px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'10px 12px' }}>
          <textarea ref={inputRef}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#fff', fontSize:13, fontFamily:'Montserrat,sans-serif', resize:'none', lineHeight:1.5, minHeight:22, maxHeight:100 }}
            placeholder="Ask about your sellers, best offers, recommendations…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)} }}
            rows={1}
          />
          <button onClick={() => send(input)} disabled={!input.trim()||sending}
            style={{ width:34, height:34, borderRadius:9, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background: input.trim()&&!sending ? 'linear-gradient(135deg,#054E94,#1A8FFF)' : 'rgba(255,255,255,0.08)' }}>
            {sending ? <Spinner size={14}/> : <Send size={14} color="white"/>}
          </button>
        </div>
      </div>
    </div>
  )
}
