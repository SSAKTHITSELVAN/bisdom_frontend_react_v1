import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getConvByLead, sendMessage, toggleChat, buyerDecision, supplierEscalation } from '../../api/conversations'
import { getLead, getCounterpart } from '../../api/leads'
import StatusBadge from '../ui/StatusBadge'
import Spinner from '../ui/Spinner'
import BottomNav from '../ui/BottomNav'
import toast from 'react-hot-toast'
import { Send, Bot, User, AlertTriangle, CheckCircle, RefreshCw, MessageSquare, ChevronLeft, ToggleLeft, ToggleRight, X } from 'lucide-react'

const ROLE_LABELS = {
  ai_buyer:      { label: 'AI Buyer Agent',    color: '#60a5fa', isAI: true  },
  ai_supplier:   { label: 'AI Supplier Agent', color: '#a78bfa', isAI: true  },
  human_buyer:   { label: 'Buyer',             color: '#34d399', isAI: false },
  human_supplier:{ label: 'Supplier',          color: '#fbbf24', isAI: false },
  system:        { label: 'System',            color: '#94a3b8', isAI: false },
}

function ChatBubble({ msg, isMine }) {
  const role = ROLE_LABELS[msg.role] || { label: msg.role, color: '#94a3b8', isAI: false }
  if (msg.role === 'system') {
    return <div className="bubble-system my-3 mx-auto max-w-xs animate-fade-in">{msg.content}</div>
  }
  return (
    <div className={`flex gap-2 mb-4 animate-fade-in ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: role.color+'25', border:`1.5px solid ${role.color}40` }}>
        {role.isAI ? <Bot size={14} style={{color:role.color}}/> : <User size={14} style={{color:role.color}}/>}
      </div>
      <div className={`max-w-[75%] ${isMine?'items-end':'items-start'} flex flex-col gap-1`}>
        <span className="text-[10px] font-semibold px-1" style={{color:role.color+'cc'}}>{role.label}</span>
        <div className={isMine ? 'bubble-user' : 'bubble-ai'}>
          <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{msg.content}</p>
          {msg.structured_data?.offer && (
            <div className="mt-3 glass-dark rounded-xl p-3 border border-white/10">
              <p className="text-xs font-semibold text-blue-300 mb-2">📊 Offer</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(msg.structured_data.offer).map(([k,v])=>(
                  <div key={k}>
                    <p className="text-[10px] text-white/40 capitalize">{k.replace(/_/g,' ')}</p>
                    <p className="text-xs font-bold text-white">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-[10px] text-white/25 px-1">
          {new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>
    </div>
  )
}

function ActionSheet({ lead, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [renego, setRenego] = useState('')

  const doAction = async (fn, args) => {
    setLoading(true)
    try { await fn(args); onRefresh(); onClose(); toast.success('Done') }
    catch { toast.error('Action failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="relative z-10 w-full glass-dark rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Actions</h3>
          <button onClick={onClose}><X size={20} className="text-white/50"/></button>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'accept'})} disabled={loading}
            className="flex items-center gap-3 glass rounded-2xl px-4 py-4 hover:bg-green-500/15 transition-all border border-green-500/20">
            <CheckCircle size={20} className="text-green-400"/>
            <div className="text-left"><p className="text-sm font-bold text-white">Accept Deal</p><p className="text-xs text-white/40">Confirm at current offer</p></div>
          </button>
          <div className="glass rounded-2xl px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw size={20} className="text-blue-400"/>
              <p className="text-sm font-bold text-white">Renegotiate</p>
            </div>
            <input className="bisdom-input text-sm mb-3" placeholder='e.g. "Get price below ₹170"'
              value={renego} onChange={e=>setRenego(e.target.value)}/>
            <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'renegotiate',renegotiate_target:renego})}
              disabled={!renego||loading} className="btn-primary py-2.5">Send to Agent</button>
          </div>
          <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'manual_chat'})} disabled={loading}
            className="flex items-center gap-3 glass rounded-2xl px-4 py-4 hover:bg-white/10 transition-all">
            <MessageSquare size={20} className="text-purple-400"/>
            <div className="text-left"><p className="text-sm font-bold text-white">Take Over Chat</p><p className="text-xs text-white/40">Talk directly to supplier</p></div>
          </button>
          <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'decline'})} disabled={loading}
            className="flex items-center gap-3 glass rounded-2xl px-4 py-4 hover:bg-red-500/10 transition-all border border-red-500/15">
            <X size={20} className="text-red-400"/>
            <div className="text-left"><p className="text-sm font-bold text-white">Decline</p></div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const [conv, setConv] = useState(null)
  const [lead, setLead] = useState(null)
  const [counterpart, setCounterpart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(false)
  const bottomRef = useRef(null)

  const fetchData = async () => {
    try {
      const [convRes, leadRes] = await Promise.all([getConvByLead(leadId), getLead(leadId)])
      setConv(convRes.data); setLead(leadRes.data)
      setChatEnabled(convRes.data.buyer_chat_enabled||convRes.data.supplier_chat_enabled)
      try { const r = await getCounterpart(leadId); setCounterpart(r.data) } catch {}
    } catch {}
    setLoading(false)
  }

  useEffect(()=>{ fetchData() },[leadId])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[conv?.messages])

  const handleToggle = async () => {
    try {
      await toggleChat({lead_id:parseInt(leadId),enabled:!chatEnabled})
      setChatEnabled(!chatEnabled)
      toast.success(chatEnabled ? 'AI mode' : 'Human chat enabled')
      fetchData()
    } catch { toast.error('Failed') }
  }

  const handleSend = async () => {
    if (!msg.trim()||sending||!conv) return
    setSending(true)
    try { await sendMessage({conversation_id:conv.id,content:msg}); setMsg(''); fetchData() }
    catch(err){ toast.error(err.response?.data?.detail||'Failed') }
    finally { setSending(false) }
  }

  return (
    <div className="bg-bisdom min-h-screen flex flex-col relative">
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="px-4 pt-12 pb-3 glass-dark border-b border-white/10">
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/leads')}
              className="w-8 h-8 glass rounded-full flex items-center justify-center shrink-0">
              <ChevronLeft size={16} color="white"/>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Lead #{leadId}</span>
                {lead && <StatusBadge status={lead.status}/>}
              </div>
              {counterpart && <p className="text-xs text-white/45 truncate mt-0.5">{counterpart.trade_name} · {counterpart.state}</p>}
            </div>
            <button onClick={handleToggle}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 glass rounded-full">
              {chatEnabled
                ? <><ToggleRight size={14} className="text-green-400"/><span className="text-green-400 font-semibold">Live</span></>
                : <><ToggleLeft size={14} className="text-white/40"/><span className="text-white/40">AI</span></>}
            </button>
            {lead && ['offer_ready','negotiating','agent_initiated','renegotiating'].includes(lead.status) && (
              <button onClick={()=>setShowActions(true)}
                className="w-8 h-8 glass rounded-full flex items-center justify-center">
                <AlertTriangle size={14} className="text-amber-400"/>
              </button>
            )}
          </div>
          {lead?.ai_paused_for_buyer && (
            <div className="mt-3 bg-amber-400/10 border border-amber-400/25 rounded-xl px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0"/>
              <p className="text-xs text-amber-300 font-semibold">Your decision needed</p>
              <button onClick={()=>setShowActions(true)} className="ml-auto text-xs text-amber-400 font-bold">Decide</button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && <div className="flex justify-center py-16"><Spinner size={28} color="rgba(255,255,255,0.4)"/></div>}
          {!loading&&!conv && (
            <div className="text-center py-16">
              <Bot size={40} className="text-white/20 mx-auto mb-3"/>
              <p className="text-white/40 text-sm">No conversation yet</p>
              <button onClick={fetchData} className="btn-ghost mt-4 w-auto px-6 inline-flex items-center gap-2">
                <RefreshCw size={14}/> Refresh
              </button>
            </div>
          )}
          {conv?.messages?.map((m,i) => (
            <ChatBubble key={m.id||i} msg={m}
              isMine={m.role==='human_buyer'||m.role==='ai_buyer'}/>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="px-4 pt-2" style={{paddingBottom:'calc(env(safe-area-inset-bottom) + 88px)'}}>
          {chatEnabled&&conv ? (
            <div className="glass rounded-2xl flex items-end gap-2 p-3">
              <textarea
                className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none leading-relaxed"
                style={{fontFamily:'Montserrat,sans-serif',minHeight:24,maxHeight:100}}
                placeholder="Type your message…"
                value={msg} onChange={e=>setMsg(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}}
                rows={1}
              />
              <button onClick={handleSend} disabled={!msg.trim()||sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{background:msg.trim()&&!sending?'linear-gradient(135deg,#054E94,#1A8FFF)':'rgba(255,255,255,0.1)'}}>
                {sending?<Spinner size={15}/>:<Send size={15} color="white"/>}
              </button>
            </div>
          ) : (
            <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-blue-400"/>
                <span className="text-xs text-white/50 font-medium">AI negotiating on your behalf</span>
              </div>
              <button onClick={fetchData}><RefreshCw size={14} className="text-white/30 hover:text-white transition-colors"/></button>
            </div>
          )}
        </div>
      </div>
      <BottomNav/>
      {showActions&&lead && (
        <ActionSheet lead={lead} onClose={()=>setShowActions(false)} onRefresh={fetchData}/>
      )}
    </div>
  )
}
