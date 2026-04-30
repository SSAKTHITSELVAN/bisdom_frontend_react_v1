import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyGST, completeOnboard, profileStatus } from '../../api/onboarding'
import { useAuthStore } from '../../store/authStore'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'
import { CheckCircle, Building2, Link, ChevronRight } from 'lucide-react'

const STEPS = ['gst', 'links', 'building']

export default function OnboardingPage() {
  const [step, setStep] = useState('gst')
  const [gstin, setGstin] = useState('')
  const [gstData, setGstData] = useState(null)
  const [links, setLinks] = useState(['', '', ''])
  const [loading, setLoading] = useState(false)
  const [buildStatus, setBuildStatus] = useState('building')
  const navigate = useNavigate()
  const setOnboarded = useAuthStore(s => s.setOnboarded)

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

  const handleComplete = async () => {
    setLoading(true)
    try {
      const validLinks = links.filter(l => l.trim())
      await completeOnboard({ gstin: gstin.toUpperCase(), links: validLinks })
      setStep('building')
      pollBuildStatus()
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
        if (res.data.status === 'complete') {
          setBuildStatus('complete')
          setOnboarded()
          setTimeout(() => navigate('/home'), 1500)
        } else if (res.data.status === 'failed') {
          setBuildStatus('failed')
        } else if (attempts < 20) {
          attempts++
          setTimeout(poll, 3000)
        }
      } catch { /* ignore */ }
    }
    poll()
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
                <h2 className="text-lg font-bold text-white">Business Links</h2>
                <p className="text-xs text-white/40">Our AI builds your profile from these</p>
              </div>
            </div>

            <p className="text-xs text-white/30 mb-5 leading-relaxed">
              Add your IndiaMART, Alibaba, or LinkedIn URLs. Our AI will extract your products, pricing, and capabilities automatically.
              <span className="text-blue-400/70"> Optional — skip if not available.</span>
            </p>

            {['IndiaMART URL', 'Alibaba / Trade URL', 'LinkedIn Page'].map((ph, i) => (
              <input key={i} className="bisdom-input mb-3" placeholder={ph}
                value={links[i]}
                onChange={e => { const n=[...links]; n[i]=e.target.value; setLinks(n) }}
              />
            ))}

            <button className="btn-primary flex items-center justify-center gap-2 mt-2"
              onClick={handleComplete} disabled={loading}>
              {loading && <Spinner size={16}/>}
              {loading ? 'Setting up…' : 'Complete Setup'}
            </button>

            <button className="btn-ghost w-full mt-3 text-center"
              onClick={() => { setLinks(['','','']); handleComplete() }}>
              Skip — use GST data only
            </button>
          </div>
        )}

        {/* Building Step */}
        {step === 'building' && (
          <div className="glass rounded-3xl p-7 text-center animate-fade-in">
            {buildStatus === 'complete'
              ? <>
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Profile Ready!</h2>
                  <p className="text-white/50 text-sm">Taking you to Bisdom…</p>
                </>
              : <>
                  <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
                    <Spinner size={32} color="#60a5fa" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Building Your Profile</h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Our AI is analyzing your business links and building your agentic profile. This takes 30–60 seconds.
                  </p>
                  <div className="flex flex-col gap-2 mt-6 text-left">
                    {['Extracting product catalog…','Mapping pricing bands…','Configuring your AI agent…'].map((t,i) => (
                      <div key={i} className="flex items-center gap-3 glass-dark rounded-xl px-4 py-3"
                        style={{animationDelay:`${i*0.5}s`}}>
                        <Spinner size={14} color="rgba(96,165,250,0.8)" />
                        <span className="text-xs text-white/60 font-medium">{t}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        )}
      </div>
    </div>
  )
}
