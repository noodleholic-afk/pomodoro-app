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
            ← 返回
          </button>
          <h2 style={{ ...FONT, color: '#fff', fontSize: 13, margin: 0 }}>
            <span style={EM}>⚙</span> 设置
          </h2>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        {/* Auth */}
        <Card>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>账户</p>
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
                退出
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ ...FONT, color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.8 }}>
                登录后可跨设备同步进度
              </p>
              <PixelInput value={email}    onChange={setEmail}    placeholder="邮箱地址" type="email" />
              <PixelInput value={password} onChange={setPassword} placeholder="密码"     type="password" />
              {loginError && (
                <p style={{ ...FONT, color: 'rgba(248,113,113,0.7)', fontSize: 11 }}>{loginError}</p>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={{ ...FONT, width: '100%', padding: '12px 0', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 11, cursor: loginLoading ? 'not-allowed' : 'pointer', opacity: loginLoading ? 0.4 : 1, borderRadius: 4 }}
                className="px-btn"
              >
                {loginLoading ? '登录中...' : '登录 / 注册'}
              </button>
            </div>
          )}
        </Card>

        {/* Notion Token */}
        <Card>
          <FieldLabel>Notion Integration Token</FieldLabel>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.25)', fontSize: 11, lineHeight: 1.8 }}>
            notion.so/my-integrations → 创建 Internal Integration → 复制 secret
          </p>
          <PixelInput value={notionToken} onChange={setNotionToken} placeholder="secret_..." type="password" />
        </Card>

        {/* SiliconFlow */}
        <Card>
          <FieldLabel>SiliconFlow API Key</FieldLabel>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.25)', fontSize: 11, lineHeight: 1.8 }}>
            siliconflow.cn 注册，免费额度可用于 AI 解析番茄记录
          </p>
          <PixelInput value={siliconKey} onChange={setSiliconKey} placeholder="sk-..." type="password" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <FieldLabel>AI 模型</FieldLabel>
            <select
              style={{ ...FONT, outline: 'none', width: '100%', padding: '8px 12px', fontSize: 11,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 4 }}
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              <option value="deepseek-ai/DeepSeek-V3.2">DeepSeek-V3.2（推荐）</option>
              <option value="kimi-k2-turbo-preview">Kimi K2 Turbo</option>
              <option value="THUDM/glm-4-9b-chat">GLM-4-9B</option>
            </select>
          </div>
        </Card>

        {/* Sound */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ ...FONT, color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
              <span style={EM}>🔊</span> 音效
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
          style={{ ...FONT, width: '100%', padding: 16, border: '2px solid #fff', background: '#fff', color: '#111', fontSize: 11, cursor: 'pointer', borderRadius: 4 }}
          className="px-btn"
        >
          {saved ? '✓ 已保存' : '保存设置'}
        </button>

        {/* DB info */}
        <div style={{ border: '1px solid rgba(255,255,255,0.05)', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.2)', fontSize: 11, marginBottom: 8 }}>数据库 ID（默认值）</p>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>番茄战报：894953a...</p>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>好时光日志：b6f8a0ec...</p>
          <p style={{ ...FONT, color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>PARA+CODE：c3c35753...</p>
        </div>
      </div>
    </div>
  )
}
