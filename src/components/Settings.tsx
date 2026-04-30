import { useState, useEffect } from 'react'
import type { UserSettings } from '../types'

interface Props {
  settings: Partial<UserSettings>
  onSave: (settings: Partial<UserSettings>) => void
  onBack: () => void
  isLoggedIn: boolean
  userEmail: string | null
  onLogin: (email: string, password: string) => void
  onLogout: () => void
}

const FONT = { fontFamily: 'var(--font-pixel)' }

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50 text-xs mb-1" style={FONT}>{children}</p>
}

function PixelInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      style={{ ...FONT, outline: 'none' }}
      className="w-full bg-white/5 border border-white/20 px-3 py-2.5 text-white text-xs placeholder-white/25 transition-all"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-white/10 p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
      {children}
    </div>
  )
}

export function Settings({ settings, onSave, onBack, isLoggedIn, userEmail, onLogin, onLogout }: Props) {
  const [notionToken,   setNotionToken]   = useState(settings.notion_token         || '')
  const [siliconKey,    setSiliconKey]    = useState(settings.siliconflow_api_key  || '')
  const [aiModel,       setAiModel]       = useState(settings.ai_model             || 'deepseek-ai/DeepSeek-V3.2')
  const [soundEnabled,  setSoundEnabled]  = useState(settings.sound_enabled        ?? true)

  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [loginLoading,  setLoginLoading]  = useState(false)
  const [loginError,    setLoginError]    = useState<string | null>(null)

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNotionToken(settings.notion_token        || '')
    setSiliconKey(settings.siliconflow_api_key  || '')
    setAiModel(settings.ai_model                || 'deepseek-ai/DeepSeek-V3.2')
    setSoundEnabled(settings.sound_enabled      ?? true)
  }, [settings])

  async function handleLogin() {
    const e = email.trim()
    const p = password.trim()
    if (!e || !p) { setLoginError('閭鍜屽瘑鐮佷笉鑳戒负绌?); return }
    setLoginLoading(true)
    setLoginError(null)
    try {
      await onLogin(e, p)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '鐧诲綍澶辫触锛岃閲嶈瘯')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleSave() {
    onSave({
      notion_token:       notionToken.trim() || null,
      siliconflow_api_key: siliconKey.trim() || null,
      ai_model:           aiModel,
      sound_enabled:      soundEnabled,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className="page-fade"
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a2e',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 overflow-y-auto" style={FONT}>

        {/* 鈹€鈹€鈹€ Header 鈹€鈹€鈹€ */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            style={FONT}
            className="pixel-btn text-white/40 text-xs hover:text-white"
          >
            鈫?杩斿洖
          </button>
          <h2 className="text-white text-sm tracking-widest" style={FONT}>鈿?璁剧疆</h2>
        </div>

        <hr className="section-divider" />

        {/* 鈹€鈹€鈹€ Auth 鈹€鈹€鈹€ */}
        <Card>
          <p className="text-white/60 text-xs" style={FONT}>璐︽埛</p>
          {isLoggedIn ? (
            <div className="flex items-center justify-between">
              <p className="text-green-400/80 text-xs" style={FONT}>鉁?{userEmail}</p>
              <button
                onClick={onLogout}
                style={FONT}
                className="pixel-btn text-red-400/60 text-xs hover:text-red-400"
              >
                閫€鍑?              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white/30 text-xs leading-relaxed" style={FONT}>
                鐧诲綍鍚庡彲璺ㄨ澶囧悓姝ヨ繘搴?              </p>
              <PixelInput value={email}    onChange={setEmail}    placeholder="閭鍦板潃" type="email" />
              <PixelInput value={password} onChange={setPassword} placeholder="瀵嗙爜"     type="password" />
              {loginError && (
                <p className="text-red-400/70 text-xs" style={FONT}>{loginError}</p>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={FONT}
                className="pixel-btn w-full py-3 border border-white/30 bg-white/5 text-white text-xs hover:bg-white/10 disabled:opacity-40"
              >
                {loginLoading ? '鐧诲綍涓?..' : '鐧?褰?/ 娉?鍐?}
              </button>
            </div>
          )}
        </Card>

        {/* 鈹€鈹€鈹€ Notion Token 鈹€鈹€鈹€ */}
        <Card>
          <FieldLabel>Notion Integration Token</FieldLabel>
          <p className="text-white/25 text-xs leading-relaxed" style={FONT}>
            notion.so/my-integrations 鈫?鍒涘缓 Internal Integration 鈫?澶嶅埗 secret
          </p>
          <PixelInput value={notionToken} onChange={setNotionToken} placeholder="secret_..." type="password" />
        </Card>

        {/* 鈹€鈹€鈹€ SiliconFlow 鈹€鈹€鈹€ */}
        <Card>
          <FieldLabel>SiliconFlow API Key</FieldLabel>
          <p className="text-white/25 text-xs leading-relaxed" style={FONT}>
            siliconflow.cn 娉ㄥ唽锛屽厤璐归搴﹀彲鐢ㄤ簬 AI 瑙ｆ瀽鐣寗璁板綍
          </p>
          <PixelInput value={siliconKey} onChange={setSiliconKey} placeholder="sk-..." type="password" />
          <div className="pt-1 space-y-1">
            <FieldLabel>AI 妯″瀷</FieldLabel>
            <select
              style={{ ...FONT, outline: 'none' }}
              className="w-full bg-white/5 border border-white/20 px-3 py-2.5 text-white text-xs"
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              <option value="deepseek-ai/DeepSeek-V3.2">DeepSeek-V3.2锛堟帹鑽愶級</option>
              <option value="kimi-k2-turbo-preview">Kimi K2 Turbo</option>
              <option value="THUDM/glm-4-9b-chat">GLM-4-9B</option>
            </select>
          </div>
        </Card>

        {/* 鈹€鈹€鈹€ Sound 鈹€鈹€鈹€ */}
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-xs" style={FONT}>馃攰 闊虫晥</p>
            <button
              onClick={() => setSoundEnabled(v => !v)}
              className={`pixel-btn relative w-12 h-6 border-2 transition-colors ${
                soundEnabled ? 'border-white bg-white/15' : 'border-white/25'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white transition-all duration-200 ${
                  soundEnabled ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </Card>

        {/* 鈹€鈹€鈹€ Save 鈹€鈹€鈹€ */}
        <button
          onClick={handleSave}
          style={FONT}
          className="pixel-btn w-full py-4 border-2 border-white bg-white text-gray-900 text-xs hover:bg-white/90"
        >
          {saved ? '鉁?宸蹭繚瀛? : '淇濆瓨璁剧疆'}
        </button>

        {/* 鈹€鈹€鈹€ DB info 鈹€鈹€鈹€ */}
        <div className="border border-white/5 p-4 space-y-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-white/20 text-xs mb-2" style={FONT}>鏁版嵁搴?ID锛堥粯璁ゅ€硷級</p>
          <p className="text-white/15 text-xs" style={FONT}>鐣寗鎴樻姤锛?894953a...</p>
          <p className="text-white/15 text-xs" style={FONT}>濂芥椂鍏夋棩蹇楋細b6f8a0ec...</p>
          <p className="text-white/15 text-xs" style={FONT}>PARA+CODE锛歝3c35753...</p>
        </div>
      </div>
    </div>
  )
}
