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
    if (!e || !p) { setLoginError('邮箱和密码不能为空'); return }
    setLoginLoading(true)
    setLoginError(null)
    try {
      await onLogin(e, p)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '登录失败，请重试')
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
    <div className="min-h-screen page-fade overflow-y-auto" style={{ background: '#1a1a2e' }}>
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 font-pixel" style={FONT}>

        {/* ─── Header ─── */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            style={FONT}
            className="pixel-btn text-white/40 text-xs hover:text-white"
          >
            ← 返回
          </button>
          <h2 className="text-white text-sm tracking-widest" style={FONT}>⚙ 设置</h2>
        </div>

        <hr className="section-divider" />

        {/* ─── Auth ─── */}
        <Card>
          <p className="text-white/60 text-xs" style={FONT}>账户</p>
          {isLoggedIn ? (
            <div className="flex items-center justify-between">
              <p className="text-green-400/80 text-xs" style={FONT}>✓ {userEmail}</p>
              <button
                onClick={onLogout}
                style={FONT}
                className="pixel-btn text-red-400/60 text-xs hover:text-red-400"
              >
                退出
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white/30 text-xs leading-relaxed" style={FONT}>
                登录后可跨设备同步进度
              </p>
              <PixelInput value={email}    onChange={setEmail}    placeholder="邮箱地址" type="email" />
              <PixelInput value={password} onChange={setPassword} placeholder="密码"     type="password" />
              {loginError && (
                <p className="text-red-400/70 text-xs" style={FONT}>{loginError}</p>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={FONT}
                className="pixel-btn w-full py-3 border border-white/30 bg-white/5 text-white text-xs hover:bg-white/10 disabled:opacity-40"
              >
                {loginLoading ? '登录中...' : '登 录 / 注 册'}
              </button>
            </div>
          )}
        </Card>

        {/* ─── Notion Token ─── */}
        <Card>
          <FieldLabel>Notion Integration Token</FieldLabel>
          <p className="text-white/25 text-xs leading-relaxed" style={FONT}>
            notion.so/my-integrations → 创建 Internal Integration → 复制 secret
          </p>
          <PixelInput value={notionToken} onChange={setNotionToken} placeholder="secret_..." type="password" />
        </Card>

        {/* ─── SiliconFlow ─── */}
        <Card>
          <FieldLabel>SiliconFlow API Key</FieldLabel>
          <p className="text-white/25 text-xs leading-relaxed" style={FONT}>
            siliconflow.cn 注册，免费额度可用于 AI 解析番茄记录
          </p>
          <PixelInput value={siliconKey} onChange={setSiliconKey} placeholder="sk-..." type="password" />
          <div className="pt-1 space-y-1">
            <FieldLabel>AI 模型</FieldLabel>
            <select
              style={{ ...FONT, outline: 'none' }}
              className="w-full bg-white/5 border border-white/20 px-3 py-2.5 text-white text-xs"
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              <option value="deepseek-ai/DeepSeek-V3.2">DeepSeek-V3.2（推荐）</option>
              <option value="kimi-k2-turbo-preview">Kimi K2 Turbo</option>
              <option value="THUDM/glm-4-9b-chat">GLM-4-9B</option>
            </select>
          </div>
        </Card>

        {/* ─── Sound ─── */}
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-xs" style={FONT}>🔊 音效</p>
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

        {/* ─── Save ─── */}
        <button
          onClick={handleSave}
          style={FONT}
          className="pixel-btn w-full py-4 border-2 border-white bg-white text-gray-900 text-xs hover:bg-white/90"
        >
          {saved ? '✓ 已保存' : '保存设置'}
        </button>

        {/* ─── DB info ─── */}
        <div className="border border-white/5 p-4 space-y-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-white/20 text-xs mb-2" style={FONT}>数据库 ID（默认值）</p>
          <p className="text-white/15 text-xs" style={FONT}>番茄战报：6894953a...</p>
          <p className="text-white/15 text-xs" style={FONT}>好时光日志：b6f8a0ec...</p>
          <p className="text-white/15 text-xs" style={FONT}>PARA+CODE：c3c35753...</p>
        </div>
      </div>
    </div>
  )
}
