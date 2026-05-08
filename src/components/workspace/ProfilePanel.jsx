import { useState, useEffect, useRef } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import { buildFromLink, profileStatus } from '@/api/onboarding'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { Save, Edit3, Eye, Globe, Link2, CheckCircle } from 'lucide-react'

export default function ProfilePanel() {
  const [profileMd, setProfileMd] = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [draft, setDraft]         = useState('')
  const [showLinkBuilder, setShowLinkBuilder] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [building, setBuilding]   = useState(false)
  const [buildStage, setBuildStage] = useState('')
  const [buildDetail, setBuildDetail] = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    loadConfig()
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  const loadConfig = () => {
    getConfig()
      .then(r => { setProfileMd(r.data.profile_md); setDraft(r.data.profile_md) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleBuildFromLink = async () => {
    if (!linkInput.trim() || !linkInput.toLowerCase().includes('indiamart.com')) {
      toast.error('Enter a valid IndiaMART URL')
      return
    }
    setBuilding(true)
    setBuildStage('')
    setBuildDetail('')
    try {
      await buildFromLink(linkInput.trim())
      toast.success('Profile build started!')
      pollBuild()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Build failed')
      setBuilding(false)
    }
  }

  const pollBuild = () => {
    let attempts = 0
    const poll = async () => {
      try {
        const res = await profileStatus()
        const { status, stage, stage_detail } = res.data
        if (stage) setBuildStage(stage)
        if (stage_detail) setBuildDetail(stage_detail)
        if (status === 'complete') {
          setBuilding(false)
          setShowLinkBuilder(false)
          setLinkInput('')
          toast.success('Profile built successfully!')
          loadConfig()
        } else if (status === 'failed') {
          setBuilding(false)
          toast.error('Build failed — try a different link')
        } else if (attempts < 60) {
          attempts++
          pollRef.current = setTimeout(poll, 2000)
        } else {
          setBuilding(false)
        }
      } catch { /* ignore */ }
    }
    poll()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig({ profile_md: draft })
      setProfileMd(draft)
      setEditMode(false)
      toast.success('Profile saved — AI agents will use this in next negotiation')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  // Simple markdown renderer
  const renderMd = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# '))  return <h1 key={i} style={{ fontSize:18, fontWeight:800, color:'#fff', margin:'16px 0 8px' }}>{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize:14, fontWeight:700, color:'#93c5fd', margin:'14px 0 6px', borderBottom:'1px solid rgba(255,255,255,0.08)', paddingBottom:4 }}>{line.slice(3)}</h2>
      if (line.startsWith('### '))return <h3 key={i} style={{ fontSize:13, fontWeight:700, color:'#cbd5e1', margin:'10px 0 4px' }}>{line.slice(4)}</h3>
      if (line.startsWith('- '))  return <div key={i} style={{ fontSize:13, color:'rgba(255,255,255,0.75)', padding:'2px 0 2px 12px', display:'flex', gap:8 }}><span style={{color:'#60a5fa',flexShrink:0}}>·</span>{line.slice(2).replace(/\*\*(.*?)\*\*/g, (_,t) => t)}</div>
      if (line.startsWith('---')) return <hr key={i} style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.08)', margin:'12px 0' }}/>
      if (line.trim() === '')     return <div key={i} style={{ height:6 }}/>
      if (line.startsWith('*'))   return <p key={i} style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>{line.replace(/\*/g,'')}</p>
      return <p key={i} style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.6 }}>{line}</p>
    })
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1628', overflow:'hidden' }}>
      <div style={{ padding:'20px 28px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:800, color:'#fff' }}>Business Profile</h2>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
            AI agents read this before every negotiation — keep it accurate
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {!editMode && !building && (
            <button onClick={() => setShowLinkBuilder(!showLinkBuilder)} className="btn-ghost"
              style={{ fontSize:11, padding:'7px 14px', display:'flex', alignItems:'center', gap:6 }}>
              <Link2 size={13}/> Build from Link
            </button>
          )}
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="btn-ghost" style={{ fontSize:11, padding:'7px 14px' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary"
                style={{ width:'auto', fontSize:11, padding:'7px 16px', display:'flex', alignItems:'center', gap:6 }}>
                {saving ? <Spinner size={13}/> : <Save size={13}/>} Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-ghost"
              style={{ fontSize:11, padding:'7px 14px', display:'flex', alignItems:'center', gap:6 }}>
              <Edit3 size={13}/> Edit
            </button>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={24} color="rgba(255,255,255,0.3)"/></div>}

        {/* Build from Link panel */}
        {(showLinkBuilder || building) && !loading && (
          <div style={{ maxWidth:680, marginBottom:20, background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:12, padding:16 }}>
            {building ? (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <Spinner size={16} />
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#fff' }}>
                    {buildStage ? `${buildStage.charAt(0).toUpperCase() + buildStage.slice(1)}...` : 'Starting pipeline...'}
                  </p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{buildDetail || 'Multi-agent extraction in progress'}</p>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <Globe size={14} className="text-blue-400" />
                  <p style={{ fontSize:12, fontWeight:700, color:'#fff' }}>Build Profile from IndiaMART</p>
                </div>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:10 }}>
                  Paste your IndiaMART seller URL. AI will extract products, pricing, and capabilities automatically.
                </p>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    value={linkInput}
                    onChange={e => setLinkInput(e.target.value)}
                    placeholder="https://www.indiamart.com/your-business/"
                    style={{
                      flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',
                      borderRadius:8, color:'#fff', fontSize:12, padding:'8px 12px', outline:'none'
                    }}
                  />
                  <button onClick={handleBuildFromLink} className="btn-primary"
                    style={{ width:'auto', fontSize:11, padding:'8px 16px', whiteSpace:'nowrap' }}>
                    Build
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!loading && (
          <div style={{ maxWidth:680 }}>
            {editMode ? (
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <Edit3 size={11}/> Editing profile — supports Markdown formatting
                </div>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  style={{
                    width:'100%', minHeight:500, background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.12)', borderRadius:12,
                    color:'rgba(255,255,255,0.85)', fontSize:13, fontFamily:'monospace',
                    lineHeight:1.7, padding:'16px', outline:'none', resize:'vertical'
                  }}
                />
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:8 }}>
                  This text is passed verbatim to both your Buyer AI and Seller AI as company context.
                </p>
              </div>
            ) : (
              <div className="fade-in">
                {profileMd
                  ? <div>{renderMd(profileMd)}</div>
                  : <div style={{ textAlign:'center', padding:'48px 0' }}>
                      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>No profile yet.</p>
                      <p style={{ color:'rgba(255,255,255,0.2)', fontSize:11, marginTop:6 }}>
                        Build your profile from IndiaMART or write it manually.
                      </p>
                      <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:16 }}>
                        <button onClick={() => setShowLinkBuilder(true)} className="btn-primary" style={{ width:'auto', padding:'10px 24px', display:'flex', alignItems:'center', gap:6 }}>
                          <Globe size={14}/> Build from IndiaMART
                        </button>
                        <button onClick={() => setEditMode(true)} className="btn-ghost" style={{ padding:'10px 24px' }}>
                          + Write Manually
                        </button>
                      </div>
                    </div>
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
