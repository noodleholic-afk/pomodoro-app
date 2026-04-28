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

export function Settings({ settings, onSave, onBack, isLoggedIn, userEmail, onLogin, onLogout }: Props) {
  const [notionToken, setNotionToken] = useState(settings.notion_token || '')
  const [siliconflowKey, setSiliconflowKey] = useState(settings.siliconflow_api_key || '')
  const [aiModel, setAiModel] = useState(settings.ai_model || 'deepseek-ai/DeepSeek-V3.2')
  const [soundEnabled, setSoundEnabled] = useState(settings.sound_enabled ?? true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    setNotionToken(settings.notion_token || '')
    setSiliconflowKey(settings.siliconflow_api_key || '')
    setAiModel(settings.ai_model || 'kimi-k2-turbo-preview')
    setSoundEnabled(settings.sound_enabled ?? true)
  }, [settings])

  async function handleLogin() {
    const e = email.trim()
    const p = password.trim()
    if (!e || !p) {
      setLoginError('邮箱和密码都是必填的')
      return
    }
    setLoginLoading(true)
    setLoginError(null)
    try {
      await onLogin(e, p)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleSave() {
    onSave({
      notion_token: notionToken.trim() || null,
      siliconflow_api_key: siliconflowKey.trim() || null,
      ai_model: aiModel,
      sound_enabled: soundEnabled,
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 font-pixel overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-white/50 hover:text-white text-xs pixel-btn">← 返回</button>
          <h2 className="text-white text-sm tracking-widest">设置</h2>
        </div>

        {/* Auth */}
        <div className="space-y-3 border border-white/10 p-4">
          <p className="text-white/60 text-xs">账户</p>
          {isLoggedIn ? (
            <div className="flex items-center justify-between">
              <p className="text-white/70 text-xs">{userEmail}</p>
              <button onClick={onLogout} className="text-red-400/70 text-xs hover:text-red-400 pixel-btn">退出</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white/40 text-xs">邮箱和密码登录，跨设备同步番茄进度</p>
              <input
                className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel placeholder-white/30"
                placeholder="邮箱地址"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <input
                className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel placeholder-white/30"
                placeholder="密码"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              {loginError && <p className="text-red-400/70 text-xs">{loginError}</p>}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full py-2 border border-white/40 text-white/70 text-xs pixel-btn hover:text-white disabled:opacity-50"
              >
                {loginLoading ? '登录中...' : '登 录'}
              </button>
            </div>
          )}
        </div>

        {/* Notion Token */}
        <div className="space-y-3 border border-white/10 p-4">
          <p className="text-white/60 text-xs">Notion Integration Token</p>
          <p className="text-white/30 text-xs leading-relaxed">
            在 notion.so/my-integrations 创建 Internal Integration，复制 token
          </p>
          <input
            className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel placeholder-white/30"
            placeholder="secret_..."
            type="password"
            value={notionToken}
            onChange={e => setNotionToken(e.target.value)}
          />
        </div>

        {/* SiliconFlow API Key */}
        <div className="space-y-3 border border-white/10 p-4">
          <p className="text-white/60 text-xs">SiliconFlow API Key</p>
          <p className="text-white/30 text-xs leading-relaxed">
            在 siliconflow.cn 注册，免费额度可用于 AI 解析番茄记录
          </p>
          <input
            className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel placeholder-white/30"
            placeholder="sk-..."
            type="password"
            value={siliconflowKey}
            onChange={e => setSiliconflowKey(e.target.value)}
          />
          <div className="space-y-1">
            <p className="text-white/40 text-xs">AI 模型</p>
            <select
              className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel"
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              <option value="kimi-k2-turbo-preview">kimi-k2-turbo-preview</option>
              <option value="deepseek-ai/DeepSeek-V3.2">DeepSeek-V3.2</option>
              <option value="THUDM/glm-4-9b-chat">GLM-4-9B</option>
            </select>
          </div>
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between border border-white/10 p-4">
          <p className="text-white/60 text-xs">音效</p>
          <button
            onClick={() => setSoundEnabled(v => !v)}
            className={`w-12 h-6 border-2 transition-colors relative pixel-btn ${soundEnabled ? 'border-white bg-white/20' : 'border-white/30'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${soundEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-white text-gray-900 text-xs pixel-btn hover:bg-white/90"
        >
          保存设置
        </button>

        {/* Notion DB IDs info */}
        <div className="border border-white/5 p-4 space-y-1">
          <p className="text-white/30 text-xs">数据库 ID（默认值，如需修改请联系开发者）</p>
          <p className="text-white/20 text-xs">番茄战报：6894953a...</p>
          <p className="text-white/20 text-xs">好时光日志：b6f8a0ec...</p>
          <p className="text-white/20 text-xs">PARA+CODE：c3c35753...</p>
        </div>
      </div>
    </div>
  )
}
