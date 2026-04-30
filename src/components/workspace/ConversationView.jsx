import { useState, useEffect, useRef } from 'react'
import { getConvByLead, sendMessage, toggleChat, buyerDecision, supplierEscalation } from '@/api/conversations'
import { getLead, getCounterpart } from '@/api/leads'
import { useWorkspaceStore } from '@/store/workspaceStore'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Send, Bot, User, AlertTriangle, CheckCircle,
  RefreshCw, ChevronLeft, ToggleLeft, ToggleRight, X,
  Sparkles, MessageSquare
} from 'lucide-react'

const ROLES = {
  ai_buyer:      { label:'AI Buyer Agent',    color:'#60a5fa', isAI:true  },
  ai_supplier:   { label:'AI Supplier Agent', color:'#a78bfa', isAI:true  },
  human_buyer:   { label:'You',               color:'#34d399', isAI:false },
  human_supplier:{ label:'Seller',            color:'#fbbf24', isAI:false },
  system:        { label:'System',            color:'#94a3b8', isAI:false },
}

function Bubble({ msg }) {
  const role = ROLES[msg.role] || { label:msg.role, color:'#94a3b8', isAI:false }
  const isMine = msg.role === 'human_buyer' || msg.role === 'ai_buyer'

  if (msg.role === 'system') return (
    <div style={{ display:'flex', justifyContent:'center', margin:'10px 0' }}>
      <div className="bubble-system">{msg.content}</div>
    </div>
  )

  return (
    <div style={{ display:'flex', gap:8, marginBottom:14, flexDirection: isMine ? 'row-reverse' : 'row' }} className="fade-in">
      <div style={{
        width:28, height:28, borderRadius:'50%', flexShrink:0,
        background: role.color+'20', border:`1.5px solid ${role.color}40`,
        display:'flex', alignItems:'center', justifyContent:'center', marginTop:2
      }}>
        {role.isAI ? <Bot size={12} style={{color:role.color}}/> : <User size={12} style={{color:role.color}}/>}
      </div>
      <div style={{ maxWidth:'72%', display:'flex', flexDirection:'column', gap:3, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        <span style={{ fontSize:9, fontWeight:700, color:role.color+'bb', paddingLeft:2 }}>{role.label}</span>
        <div className={isMine ? 'bubble-user' : 'bubble-ai'}>
          <p style={{ fontSize:13, lineHeight:1.6, color:'rgba(255,255,255,0.92)', whiteSpace:'pre-wrap' }}>
            {msg.content}
          </p>
          {msg.structured_data?.offer && Object.keys(msg.structured_data.offer).length > 0 && (
            <div style={{ marginTop:10, background:'rgba(0,0,0,0.2)', borderRadius:8, padding:10 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#60a5fa', marginBottom:6 }}>📊 Offer Details</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {Object.entries(msg.structured_data.offer).map(([k,v]) => (
                  <div key={k}>
                    <p style={{ fontSize:9, color:'rgba(255,255,255,0.4)', textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</p>
                    <p style={{ fontSize:11, fontWeight:700, color:'#fff' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', paddingLeft:2 }}>
          {new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>
    </div>
  )
}

function ActionPanel({ lead, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [renego, setRenego]   = useState('')

  const act = async (fn, args) => {
    setLoading(true)
    try { await fn(args); onRefresh(); onClose(); toast.success('Done') }
    catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      width:280, borderLeft:'1px solid rgba(255,255,255,0.07)',
      background:'#0d1f3c', display:'flex', flexDirection:'column', overflow:'hidden'
    }}>
      <div style={{ padding:'18px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Actions</span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}>
          <X size={14} color="rgba(255,255,255,0.5)" />
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
        {/* Accept */}
        <button disabled={loading}
          onClick={() => act(buyerDecision,{lead_id:lead.id,action:'accept'})}
          style={{
            display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
            background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)',
            borderRadius:10, cursor:'pointer', fontFamily:'Montserrat,sans-serif'
          }}>
          <CheckCircle size={16} color="#4ade80"/>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>Accept Deal</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Confirm at current offer</div>
          </div>
        </button>

        {/* Renegotiate */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:8 }}>Renegotiate</div>
          <input className="bisdom-input" style={{ fontSize:12, marginBottom:8 }}
            placeholder='e.g. "Get below ₹170"'
            value={renego} onChange={e=>setRenego(e.target.value)}
          />
          <button disabled={!renego||loading}
            onClick={() => act(buyerDecision,{lead_id:lead.id,action:'renegotiate',renegotiate_target:renego})}
            className="btn-primary" style={{ fontSize:12, padding:'9px 16px' }}>
            Send to AI Agent
          </button>
        </div>

        {/* Manual chat */}
        <button disabled={loading}
          onClick={() => act(buyerDecision,{lead_id:lead.id,action:'manual_chat'})}
          style={{
            display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
            background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)',
            borderRadius:10, cursor:'pointer', fontFamily:'Montserrat,sans-serif'
          }}>
          <MessageSquare size={16} color="#a78bfa"/>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>Take Over Chat</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Talk directly to seller</div>
          </div>
        </button>

        {/* Decline */}
        <button disabled={loading}
          onClick={() => act(buyerDecision,{lead_id:lead.id,action:'decline'})}
          style={{
            display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
            background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)',
            borderRadius:10, cursor:'pointer', fontFamily:'Montserrat,sans-serif'
          }}>
          <X size={16} color="#f87171"/>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#f87171' }}>Decline</div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default function ConversationView({ leadId }) {
  const [conv, setConv]         = useState(null)
  const [lead, setLead]         = useState(null)
  const [counterpart, setCP]    = useState(null)
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState('')
  const [sending, setSending]   = useState(false)
  const [chatOn, setChatOn]     = useState(false)
  const [showActions, setShowActions] = useState(false)
  const bottomRef = useRef(null)
  const { route, goRequirement, goWelcome } = useWorkspaceStore()

  const fetch = async () => {
    try {
      const [cRes, lRes] = await Promise.all([getConvByLead(leadId), getLead(leadId)])
      setConv(cRes.data); setLead(lRes.data)
      setChatOn(cRes.data.buyer_chat_enabled || cRes.data.supplier_chat_enabled)
      try { const r = await getCounterpart(leadId); setCP(r.data) } catch {}
    } catch {}
    setLoading(false)
  }

  useEffect(() => { setLoading(true); setConv(null); setLead(null); fetch() }, [leadId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [conv?.messages])

  const handleToggle = async () => {
    try {
      await toggleChat({ lead_id:parseInt(leadId), enabled:!chatOn })
      setChatOn(!chatOn); fetch()
    } catch { toast.error('Failed') }
  }

  const handleSend = async () => {
    if (!msg.trim()||sending||!conv) return
    setSending(true)
    try { await sendMessage({conversation_id:conv.id, content:msg}); setMsg(''); fetch() }
    catch(e){ toast.error(e.response?.data?.detail||'Failed') }
    finally { setSending(false) }
  }

  const canAct = lead && ['offer_ready','negotiating','agent_initiated','renegotiating'].includes(lead.status)

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      {/* Main chat column */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1628', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => route.reqId ? goRequirement(route.reqId) : goWelcome()}
            style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.07)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={15} color="rgba(255,255,255,0.7)"/>
          </button>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>
                {counterpart?.trade_name || `Seller #${lead?.supplier_id || leadId}`}
              </span>
              {lead && <StatusBadge status={lead.status}/>}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:1 }}>
              {counterpart?.state && `${counterpart.city || ''} ${counterpart.state} · `}
              Round {lead?.negotiation_round||0}/{lead?.max_negotiation_rounds||5}
              {lead?.current_offer_price && ` · Best ₹${lead.current_offer_price.toLocaleString()}/unit`}
            </div>
          </div>

          {/* Chat toggle */}
          <button onClick={handleToggle}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:8, cursor:'pointer', fontFamily:'Montserrat,sans-serif'
            }}>
            {chatOn
              ? <><ToggleRight size={15} color="#4ade80"/><span style={{fontSize:11,fontWeight:700,color:'#4ade80'}}>Live</span></>
              : <><ToggleLeft size={15} color="rgba(255,255,255,0.4)"/><span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>AI Mode</span></>
            }
          </button>

          {canAct && (
            <button onClick={() => setShowActions(p => !p)}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                background: showActions ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.1)',
                border:'1px solid rgba(251,191,36,0.25)',
                borderRadius:8, cursor:'pointer', fontFamily:'Montserrat,sans-serif'
              }}>
              <AlertTriangle size={14} color="#fbbf24"/>
              <span style={{ fontSize:11, fontWeight:700, color:'#fbbf24' }}>Actions</span>
            </button>
          )}

          <button onClick={fetch} style={{ background:'none', border:'none', cursor:'pointer' }}>
            <RefreshCw size={14} color="rgba(255,255,255,0.3)"/>
          </button>
        </div>

        {/* AI paused banner */}
        {lead?.ai_paused_for_buyer && (
          <div style={{
            margin:'8px 24px 0', padding:'10px 14px',
            background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)',
            borderRadius:10, display:'flex', alignItems:'center', gap:8
          }}>
            <AlertTriangle size={14} color="#fbbf24"/>
            <span style={{ fontSize:12, color:'#fbbf24', fontWeight:600 }}>
              AI paused — your decision needed
            </span>
            <button onClick={() => setShowActions(true)}
              style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'#fbbf24', background:'none', border:'none', cursor:'pointer' }}>
              Decide →
            </button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>
          {loading && (
            <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
              <Spinner size={24} color="rgba(255,255,255,0.3)"/>
            </div>
          )}
          {!loading && !conv && (
            <div style={{ textAlign:'center', padding:'64px 0', color:'rgba(255,255,255,0.3)' }}>
              <Bot size={36} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
              <p style={{ fontSize:13 }}>No conversation yet</p>
              <button onClick={fetch} style={{ marginTop:12, fontSize:12, color:'#60a5fa', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, margin:'12px auto 0' }}>
                <RefreshCw size={13}/> Refresh
              </button>
            </div>
          )}
          {conv?.messages?.map((m,i) => (
            <Bubble key={m.id||i} msg={m}/>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:'12px 24px 20px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          {chatOn && conv ? (
            <div style={{
              display:'flex', alignItems:'flex-end', gap:10,
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:12, padding:'10px 12px'
            }}>
              <textarea
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  color:'#fff', fontSize:13, fontFamily:'Montserrat,sans-serif',
                  resize:'none', lineHeight:1.5, minHeight:22, maxHeight:120
                }}
                placeholder="Type your message to the seller…"
                value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }}
                rows={1}
              />
              <button onClick={handleSend} disabled={!msg.trim()||sending}
                style={{
                  width:34, height:34, borderRadius:9, border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  background: msg.trim()&&!sending ? 'linear-gradient(135deg,#054E94,#1A8FFF)' : 'rgba(255,255,255,0.08)',
                }}>
                {sending ? <Spinner size={14}/> : <Send size={14} color="white"/>}
              </button>
            </div>
          ) : (
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, padding:'12px 16px'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Bot size={15} color="#60a5fa"/>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:500 }}>
                  AI is negotiating — toggle to join the conversation
                </span>
              </div>
              <button onClick={fetch}>
                <RefreshCw size={13} color="rgba(255,255,255,0.3)"/>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions panel */}
      {showActions && lead && (
        <ActionPanel lead={lead} onClose={() => setShowActions(false)} onRefresh={fetch}/>
      )}
    </div>
  )
}
