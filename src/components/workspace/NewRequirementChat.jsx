import { useState, useRef, useEffect } from 'react'
import { chatRequirement, confirmRequirement } from '@/api/requirements'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Send, Sparkles, CheckCircle, X } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'I need 500kg mild steel angle bars delivered to Chennai within 2 weeks, budget ₹85,000',
  '200 cotton t-shirts, 100% cotton 180GSM, black, sizes S-XL, Tirupur, under ₹200/piece',
  '50 industrial electric motors, 2HP 3-phase, Coimbatore, delivery in 10 days',
]

function Bubble({ msg }) {
  const isUser   = msg.role === 'user'
  const isSystem = msg.role === 'system'
  if (isSystem) return (
    <div style={{ display:'flex', justifyContent:'center', margin:'8px 0' }}>
      <div className="bubble-system">{msg.content}</div>
    </div>
  )
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }} className="fade-in">
      {!isUser && (
        <div style={{
          width:30, height:30, borderRadius:'50%', flexShrink:0,
          background:'rgba(96,165,250,0.2)', border:'1px solid rgba(96,165,250,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center', marginRight:8, marginTop:2
        }}>
          <Sparkles size={13} color="#60a5fa" />
        </div>
      )}
      <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
        <p style={{ fontSize:13, lineHeight:1.6, color:'rgba(255,255,255,0.92)', whiteSpace:'pre-wrap' }}>
          {msg.content}
        </p>
      </div>
    </div>
  )
}

export default function NewRequirementChat() {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [reqId, setReqId]         = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed]   = useState(false)
  const [started, setStarted]       = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const { goWelcome, goRequirement, triggerRefresh } = useWorkspaceStore()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  const send = async (text) => {
    if (!text.trim() || loading) return
    setMessages(p => [...p, { role:'user', content:text }])
    setInput(''); setStarted(true); setLoading(true)
    try {
      const payload = { message: text }
      if (reqId) payload.requirement_id = reqId
      const res = await chatRequirement(payload)
      const { requirement_id, ai_response, is_complete, requirement_summary } = res.data
      setReqId(requirement_id)
      setIsComplete(is_complete)
      setMessages(p => [...p, { role:'ai', content: ai_response }])
      if (is_complete && requirement_summary) {
        setMessages(p => [...p, {
          role:'system',
          content:`📋 ${requirement_summary.product} · ${requirement_summary.quantity} ${requirement_summary.quantity_unit||'units'} · ₹${requirement_summary.budget_max} max`
        }])
      }
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false); setTimeout(() => inputRef.current?.focus(), 80) }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await confirmRequirement(reqId)
      setConfirmed(true)
      setMessages(p => [...p, { role:'system', content:'🤖 AI agents are now matching suppliers and starting negotiations. Check the sidebar for updates.' }])
      triggerRefresh()
      setTimeout(() => {
        goWelcome()
        setSelectedRequirement(reqId)
      }, 2000)
    } catch { toast.error('Failed to confirm') }
    finally { setConfirming(false) }
  }

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      background:'#0a1628', height:'100vh', overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding:'20px 28px 16px',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#fff' }}>New Requirement</h2>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
            Describe what you need — AI will gather details and find suppliers
          </p>
        </div>
        <button onClick={() => goWelcome()}
          style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.07)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={14} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>
        {!started && (
          <div style={{ maxWidth: 580 }} className="fade-in">
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16, lineHeight:1.6 }}>
              Just describe your requirement naturally. Examples:
            </p>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                style={{
                  display:'block', width:'100%', textAlign:'left',
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:10, padding:'11px 14px', marginBottom:8,
                  color:'rgba(255,255,255,0.65)', fontSize:13, cursor:'pointer',
                  fontFamily:'Montserrat,sans-serif', lineHeight:1.5,
                  transition:'all 0.15s'
                }}
                onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.04)'}
              >
                <span style={{ color:'#60a5fa', marginRight:8 }}>→</span>{s}
              </button>
            ))}
          </div>
        )}

        <div style={{ maxWidth: 680 }}>
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(96,165,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Sparkles size={13} color="#60a5fa" />
              </div>
              <div className="bubble-ai" style={{ display:'flex', gap:5, alignItems:'center', padding:'12px 16px' }}>
                <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
              </div>
            </div>
          )}

          {isComplete && !confirmed && (
            <div style={{ marginTop:16 }} className="slide-up">
              <button onClick={handleConfirm} disabled={confirming}
                className="btn-primary"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'auto', padding:'12px 28px' }}>
                {confirming ? <Spinner size={15}/> : <CheckCircle size={15}/>}
                {confirming ? 'Confirming…' : 'Confirm & Find Suppliers'}
              </button>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:8 }}>
                AI agents will simultaneously negotiate with all matched suppliers
              </p>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'12px 28px 20px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          display:'flex', alignItems:'flex-end', gap:10,
          background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:12, padding:'10px 12px'
        }}>
          <textarea ref={inputRef}
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              color:'#fff', fontSize:13, fontFamily:'Montserrat,sans-serif',
              resize:'none', lineHeight:1.5, minHeight:22, maxHeight:120,
              placeholder:'rgba(255,255,255,0.3)'
            }}
            placeholder="Describe your procurement requirement…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)} }}
            rows={1}
          />
          <button onClick={() => send(input)} disabled={!input.trim()||loading}
            style={{
              width:34, height:34, borderRadius:9, border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              background: input.trim()&&!loading ? 'linear-gradient(135deg,#054E94,#1A8FFF)' : 'rgba(255,255,255,0.08)',
              transition:'background 0.2s'
            }}>
            {loading ? <Spinner size={14}/> : <Send size={14} color="white"/>}
          </button>
        </div>
        <p style={{ fontSize:10, color:'rgba(255,255,255,0.2)', textAlign:'center', marginTop:8 }}>
          Bisdom AI · Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
