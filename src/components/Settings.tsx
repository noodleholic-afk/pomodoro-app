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

const FONT = { fontFamily: 'var(--font)' }
const EM: React.CSSProperties = { fontFamily: 'system-ui, -apple-system, sans-serif' }

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ ...FONT, color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{children}</p>
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
      style={{ ...FONT, outline: 'none', width: '100%', padding: '8px 12px', fontSize: 11,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', borderRadius: 4 }}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
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
      notion_token:        notionToken.trim() || null,
      siliconflow_api_key: siliconKey.trim()  || null,
      ai_model:            aiModel,
      sound_enabled:       soundEnabled,
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
      <div style={{ ...FONT, maxWidth: 448, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{ ...FONT, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}
            className="px-btn"
          >
            ← <span className="zh" style={{ fontSize: 14 }}>返回</span>
          </button>
          <h2 style={{ ...FONT, color: '#fff', fontSize: 13, margin: 0 }}>
            <span style={EM}>⚙</span> <span className="zh" style={{ fontSize: 16 }}>设置</span>
          </h2>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        {/* Auth */}
        <Card>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.6)', fontSize: 11 }}><span className="zh" style={{ fontSize: 14 }}>账户</span></p>
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ ...FONT, color: '#4ade80', fontSize: 11 }}>
                <span style={EM}>✓</span> {userEmail}
              </p>
              <button
                onClick={onLogout}
                style={{ ...FONT, background: 'none', border: 'none', color: 'rgba(248,113,113,0.6)', fontSize: 11, cursor: 'pointer' }}
                className="px-btn"
              >
                <span className="zh" style={{ fontSize: 14 }}>退出</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ ...FONT, color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1.8 }}>
                <span className="zh">登录后可跨设备同步进度</span>
              </p>
              <PixelInput value={email}    onChange={setEmail}    placeholder="邮箱地址" type="email" />
              <PixelInput value={password} onChange={setPassword} placeholder="密码"     type="password" />
              {loginError && (
                <p style={{ ...FONT, color: 'rgba(248,113,113,0.7)', fontSize: 14 }}><span className="zh">{loginError}</span></p>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={{ ...FONT, width: '100%', padding: '12px 0', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, cursor: loginLoading ? 'not-allowed' : 'pointer', opacity: loginLoading ? 0.4 : 1, borderRadius: 4 }}
                className="px-btn"
              >
                <span className="zh">{loginLoading ? '登录中...' : '登录 / 注册'}</span>
              </button>
            </div>
          )}
        </Card>

        {/* Notion Token */}
        <Card>
          <FieldLabel>Notion Integration Token</FieldLabel>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 1.8 }}>
            <span className="zh">notion.so/my-integrations → 创建 Internal Integration → 复制 secret</span>
          </p>
          <PixelInput value={notionToken} onChange={setNotionToken} placeholder="secret_..." type="password" />
        </Card>

        {/* SiliconFlow */}
        <Card>
          <FieldLabel>SiliconFlow API Key</FieldLabel>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 1.8 }}>
            <span className="zh">siliconflow.cn 注册，免费额度可用于 AI 解析番茄记录</span>
          </p>
          <PixelInput value={siliconKey} onChange={setSiliconKey} placeholder="sk-..." type="password" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <FieldLabel>AI <span className="zh" style={{ fontSize: 14 }}>模型</span></FieldLabel>
            <select
              style={{ ...FONT, outline: 'none', width: '100%', padding: '8px 12px', fontSize: 11,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 4 }}
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              <option value="deepseek-ai/DeepSeek-V3.2">DeepSeek-V3.2 (推荐)</option>
              <option value="kimi-k2-turbo-preview">Kimi K2 Turbo</option>
              <option value="THUDM/glm-4-9b-chat">GLM-4-9B</option>
            </select>
          </div>
        </Card>

        {/* Sound */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ ...FONT, color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
              <span style={EM}>🔊</span> <span className="zh" style={{ fontSize: 14 }}>音效</span>
            </p>
            <button
              onClick={() => setSoundEnabled(v => !v)}
              className="px-btn"
              style={{
                position: 'relative', width: 48, height: 24,
                border: `2px solid ${soundEnabled ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                background: soundEnabled ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderRadius: 0, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, width: 16, height: 16, background: '#fff',
                transition: 'left 0.2s',
                left: soundEnabled ? 24 : 2,
              }} />
            </button>
          </div>
        </Card>

        {/* Save */}
        <button
          onClick={handleSave}
          style={{ ...FONT, width: '100%', padding: 16, border: '2px solid #fff', background: '#fff', color: '#111', fontSize: 14, cursor: 'pointer', borderRadius: 4 }}
          className="px-btn"
        >
          <span className="zh">{saved ? '✓ 已保存' : '保存设置'}</span>
        </button>

        {/* DB info */}
        <div style={{ border: '1px solid rgba(255,255,255,0.05)', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.2)', fontSize: 14, marginBottom: 8 }}><span className="zh">数据库 ID（默认值）</span></p>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.15)', fontSize: 14 }}><span className="zh">番茄战报：894953a...</span></p>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.15)', fontSize: 14 }}><span className="zh">好时光日志：b6f8a0ec...</span></p>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.15)', fontSize: 14 }}><span className="zh">PARA+CODE：c3c35753...</span></p>
        </div>
      </div>
    </div>
  )
}
