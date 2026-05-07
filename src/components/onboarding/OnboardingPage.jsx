import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyGST, completeOnboard, profileStatus } from '../../api/onboarding'
import { useAuthStore } from '../../store/authStore'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'
import { CheckCircle, Building2, Link, ChevronRight, Globe, Search, Cpu, BarChart3, ShieldCheck, Sparkles } from 'lucide-react'

const STEPS = ['gst', 'links', 'building']

const PIPELINE_STAGES = [
  { key: 'crawl',     icon: Globe,       label: 'Crawling',     desc: 'Scanning IndiaMART pages' },
  { key: 'identity',  icon: Search,      label: 'Identity',     desc: 'Extracting company info' },
  { key: 'enrich',    icon: Cpu,         label: 'Enriching',    desc: 'AI mapping product specs' },
  { key: 'normalize', icon: BarChart3,   label: 'Normalizing',  desc: 'Bucketing & scoring' },
  { key: 'validate',  icon: ShieldCheck, label: 'Validating',   desc: 'Quality checks' },
  { key: 'finalize',  icon: Sparkles,    label: 'Finalizing',   desc: 'Building your profile' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState('gst')
  const [gstin, setGstin] = useState('')
  const [gstData, setGstData] = useState(null)
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [buildStatus, setBuildStatus] = useState('building')
  const [currentStage, setCurrentStage] = useState('')
  const [stageDetail, setStageDetail] = useState('')
  const [completedStages, setCompletedStages] = useState([])
  const [linkError, setLinkError] = useState('')
  const navigate = useNavigate()
  const setOnboarded = useAuthStore(s => s.setOnboarded)
  const prevStageRef = useRef('')

  const handleVerifyGST = async () => {
    if (gstin.length < 15) { toast.error('Enter valid 15-character GSTIN'); return }
    setLoading(true)
    try {
      const res = await verifyGST(gstin.toUpperCase())
      if (res.data.valid) {
        setGstData(res.data)
        toast.success('GSTIN verified!')
      } else {
        toast.error(res.data.error || 'Invalid GSTIN')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const validateLink = (url) => {
    if (!url.trim()) return true
    return url.toLowerCase().includes('indiamart.com')
  }

  const handleComplete = async () => {
    if (link.trim() && !validateLink(link)) {
      setLinkError('Only IndiaMART links are supported')
      return
    }
    setLinkError('')
    setLoading(true)
    try {
      const validLinks = link.trim() ? [link.trim()] : []
      await completeOnboard({ gstin: gstin.toUpperCase(), links: validLinks })
      if (validLinks.length > 0) {
        setStep('building')
        pollBuildStatus()
      } else {
        setOnboarded()
        navigate('/home')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Onboarding failed')
      setLoading(false)
    }
  }

  const pollBuildStatus = async () => {
    let attempts = 0
    const poll = async () => {
      try {
        const res = await profileStatus()
        const { status, stage, stage_detail } = res.data

        if (stage && stage !== prevStageRef.current) {
          if (prevStageRef.current && prevStageRef.current !== 'complete') {
            setCompletedStages(prev => [...new Set([...prev, prevStageRef.current])])
          }
          prevStageRef.current = stage
          setCurrentStage(stage)
        }
        if (stage_detail) setStageDetail(stage_detail)

        if (status === 'complete') {
          setBuildStatus('complete')
          setCurrentStage('complete')
          setCompletedStages(PIPELINE_STAGES.map(s => s.key))
          setOnboarded()
          setTimeout(() => navigate('/home'), 2000)
        } else if (status === 'failed') {
          setBuildStatus('failed')
        } else if (attempts < 40) {
          attempts++
          setTimeout(poll, 2000)
        }
      } catch { /* ignore */ }
    }
    poll()
  }

  const getStageStatus = (stageKey) => {
    if (completedStages.includes(stageKey)) return 'done'
    if (currentStage === stageKey) return 'active'
    return 'pending'
  }

  return (
    <div className="bg-bisdom min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Logo size="md" />
          <p className="text-white/40 text-sm mt-3 font-medium">Setup your business profile</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['gst','links','building'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-blue-500 text-white' :
                STEPS.indexOf(step) > i ? 'bg-green-500/80 text-white' :
                'bg-white/10 text-white/40'
              }`}>{STEPS.indexOf(step) > i ? '✓' : i+1}</div>
              {i < 2 && <div className={`w-8 h-0.5 ${STEPS.indexOf(step) > i ? 'bg-green-500/60' : 'bg-white/15'}`}/>}
            </div>
          ))}
        </div>

        {/* GST Step */}
        {step === 'gst' && (
          <div className="glass rounded-3xl p-7 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Building2 size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">GST Verification</h2>
                <p className="text-xs text-white/40">Required for business identity</p>
              </div>
            </div>

            <input className="bisdom-input mb-4 uppercase tracking-widest font-mono"
              placeholder="29AACCG0527D1Z8"
              value={gstin}
              onChange={e => setGstin(e.target.value.toUpperCase().slice(0,15))}
              maxLength={15}
            />

            {gstData && (
              <div className="glass-dark rounded-2xl p-4 mb-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm">{gstData.trade_name || gstData.legal_name}</p>
                    <p className="text-white/50 text-xs mt-1">{gstData.business_type}</p>
                    <p className="text-white/40 text-xs">{gstData.city}, {gstData.state}</p>
                    <span className={`badge mt-2 ${gstData.gst_status === 'Active' ? 'badge-green' : 'badge-red'}`}>
                      GST {gstData.gst_status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!gstData
              ? <button className="btn-primary flex items-center justify-center gap-2" onClick={handleVerifyGST} disabled={loading}>
                  {loading && <Spinner size={16}/>} Verify GSTIN
                </button>
              : <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setStep('links')}>
                  Continue <ChevronRight size={16}/>
                </button>
            }
          </div>
        )}

        {/* Links Step */}
        {step === 'links' && (
          <div className="glass rounded-3xl p-7 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Link size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">IndiaMART Link</h2>
                <p className="text-xs text-white/40">Our AI builds your profile from this</p>
              </div>
            </div>

            <p className="text-xs text-white/30 mb-5 leading-relaxed">
              Add your IndiaMART seller URL. Our AI will extract your products, pricing, and capabilities automatically using a multi-agent pipeline.
              <span className="text-blue-400/70"> Optional — skip if not available.</span>
            </p>

            <div className="relative">
              <input
                className={`bisdom-input mb-1 ${linkError ? 'border-red-500/50' : ''}`}
                placeholder="https://www.indiamart.com/your-business/"
                value={link}
                onChange={e => { setLink(e.target.value); setLinkError('') }}
              />
              {linkError && (
                <p className="text-red-400 text-xs mb-3 ml-1">{linkError}</p>
              )}
              {!linkError && <div className="mb-3" />}
            </div>

            <div className="glass-dark rounded-xl p-3 mb-5 flex items-start gap-2">
              <Globe size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-white/40 leading-relaxed">
                Only <span className="text-blue-400/80 font-semibold">IndiaMART</span> links are supported. We'll scan your product catalog, extract pricing, MOQs, specifications, and build your AI negotiation profile.
              </p>
            </div>

            <button className="btn-primary flex items-center justify-center gap-2"
              onClick={handleComplete} disabled={loading}>
              {loading && <Spinner size={16}/>}
              {loading ? 'Setting up…' : link.trim() ? 'Build Profile with AI' : 'Complete Setup'}
            </button>

            <button className="btn-ghost w-full mt-3 text-center"
              onClick={() => { setLink(''); handleComplete() }}>
              Skip — use GST data only
            </button>
          </div>
        )}

        {/* Building Step — Pipeline Animation */}
        {step === 'building' && (
          <div className="glass rounded-3xl p-7 animate-fade-in">
            {buildStatus === 'complete' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 pipeline-pulse-green">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 text-center">Profile Ready!</h2>
                <p className="text-white/50 text-sm text-center">Taking you to Bisdom…</p>
              </>
            ) : buildStatus === 'failed' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-400 text-2xl font-bold">!</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2 text-center">Extraction Failed</h2>
                <p className="text-white/50 text-sm text-center mb-4">Could not extract data from this link.</p>
                <button className="btn-ghost w-full" onClick={() => { setStep('links'); setBuildStatus('building') }}>
                  Try another link
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold text-white mb-1">AI Pipeline Running</h2>
                  <p className="text-white/40 text-xs">Multi-agent extraction in progress</p>
                </div>

                {/* Pipeline stages */}
                <div className="flex flex-col gap-1.5">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const status = getStageStatus(stage.key)
                    const Icon = stage.icon
                    return (
                      <div
                        key={stage.key}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
                          status === 'active' ? 'glass-dark pipeline-active-glow' :
                          status === 'done' ? 'bg-green-500/8 border border-green-500/20' :
                          'bg-white/[0.02] border border-white/[0.04]'
                        }`}
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        {/* Status indicator */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                          status === 'active' ? 'bg-blue-500/20' :
                          status === 'done' ? 'bg-green-500/20' :
                          'bg-white/5'
                        }`}>
                          {status === 'done' ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : status === 'active' ? (
                            <div className="pipeline-spinner">
                              <Icon size={14} className="text-blue-400" />
                            </div>
                          ) : (
                            <Icon size={14} className="text-white/20" />
                          )}
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold transition-colors duration-300 ${
                            status === 'active' ? 'text-white' :
                            status === 'done' ? 'text-green-300/80' :
                            'text-white/30'
                          }`}>{stage.label}</p>
                          <p className={`text-[10px] truncate transition-colors duration-300 ${
                            status === 'active' ? 'text-white/50' :
                            status === 'done' ? 'text-green-400/40' :
                            'text-white/15'
                          }`}>
                            {status === 'active' && stageDetail ? stageDetail : stage.desc}
                          </p>
                        </div>

                        {/* Right indicator */}
                        {status === 'active' && (
                          <div className="pipeline-dots flex gap-1">
                            <span className="pipeline-dot" />
                            <span className="pipeline-dot" />
                            <span className="pipeline-dot" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div className="mt-5 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out pipeline-progress-glow"
                    style={{ width: `${Math.max(((completedStages.length + (currentStage ? 0.5 : 0)) / PIPELINE_STAGES.length) * 100, 8)}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/25 text-center mt-2">
                  {completedStages.length}/{PIPELINE_STAGES.length} stages complete
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
