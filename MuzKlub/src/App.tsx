import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from './api';
import type { Choice, User } from './api';

const fallbackChoices: Choice[] = [
  { value: 'vocals', label: 'Вокал' }, { value: 'guitar', label: 'Гитара' },
  { value: 'bass', label: 'Бас-гитара' }, { value: 'drums', label: 'Ударные' },
  { value: 'keys', label: 'Клавишные' }, { value: 'other', label: 'Другое' },
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [editing, setEditing] = useState(false);
  const [choices, setChoices] = useState<Choice[]>(fallbackChoices);
  const [loading, setLoading] = useState('Загружаем пространство...');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.specializations().then(setChoices).catch(() => undefined);
    api.profile().then(setUser).catch((error: unknown) => {
      if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) setMessage('Не удалось загрузить профиль. Попробуйте ещё раз.');
    }).finally(() => setLoading(''));
  }, []);

  function showError(error: unknown) {
    if (error instanceof ApiError && error.status === 401 && user) {
      setUser(null); setEditing(false); setMode('login'); setMessage('Сессия закончилась. Войдите снова.'); return;
    }
    setMessage(error instanceof Error ? error.message : 'Произошла ошибка.');
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (loading) return;
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username')).trim();
    const password = String(form.get('password'));
    if (mode === 'register' && password !== form.get('password_confirmation')) { setMessage('Пароли не совпадают.'); return; }
    setLoading(mode === 'login' ? 'Входим...' : 'Создаём аккаунт...'); setMessage('');
    try {
      if (mode === 'register') await api.register(username, password); else await api.login(username, password);
      setUser(await api.profile()); setEditing(mode === 'register'); setMessage(mode === 'register' ? 'Аккаунт создан.' : 'Вы вошли в аккаунт.');
    } catch (error) { showError(error); } finally { setLoading(''); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (loading) return;
    const form = new FormData(event.currentTarget); setLoading('Сохраняем изменения...'); setMessage('');
    try {
      await api.updateProfile({ first_name: String(form.get('first_name')).trim(), specialization: String(form.get('specialization')), bio: String(form.get('bio')).trim(), fee: String(form.get('fee')) });
      setUser(await api.profile()); setEditing(false); setMessage('Изменения сохранены.');
    } catch (error) { showError(error); } finally { setLoading(''); }
  }

  async function logout() {
    if (loading) return; setLoading('Выходим...'); setMessage('');
    try { await api.logout(); setUser(null); setEditing(false); setMode('login'); setMessage('Вы вышли из аккаунта.'); }
    catch (error) { showError(error); } finally { setLoading(''); }
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#home" aria-label="MuzKlub — на главную"><span className="brand-mark">M<span>♫</span></span><span>MUZ<span className="brand-light">KLUB</span></span></a>
      <div className="topbar-note"><span className="live-dot" /> СООБЩЕСТВО МУЗЫКАНТОВ</div>
      <a className="top-link" href="https://inai-col3.fishrungames.com/api/docs/" target="_blank" rel="noreferrer">О проекте <span>↗</span></a>
    </header>

    <section className="stage" id="home">
      <div className="stage-copy">
        <p className="eyebrow">ТВОЙ ЗВУК. ТВОИ ЛЮДИ.</p>
        <h1>Музыка<br />начинается <em>здесь.</em></h1>
        <p className="intro">Находи музыкантов, делись опытом и собирай группу, о которой давно мечтал.</p>
        <div className="stage-meta"><span className="waveform" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span><span>ЗВУЧИ ВМЕСТЕ</span></div>
        <div className="stage-index"><span>01</span><span className="index-line"/><span>ТВОЯ СЦЕНА</span></div>
      </div>

      <section className="auth-card" aria-labelledby="card-title">
        <div className="card-top"><span className="card-kicker">ЛИЧНЫЙ КАБИНЕТ</span><span className="card-star">✳</span></div>
        {loading && <div className="status loading" role="status"><span className="spinner"/>{loading}</div>}
        {message && <div className="status" role="status">{message}</div>}
        {!user ? <>
          <h2 id="card-title">{mode === 'login' ? <>С возвращением<span className="accent">.</span></> : <>Вступай в клуб<span className="accent">.</span></>}</h2>
          <p className="card-subtitle">{mode === 'login' ? 'Войди, чтобы продолжить свой путь.' : 'Создай аккаунт — и найди свой ритм.'}</p>
          <div className="tabs" role="tablist" aria-label="Вход или регистрация">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} disabled={!!loading} onClick={() => { setMode('login'); setMessage(''); }}>Войти</button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} disabled={!!loading} onClick={() => { setMode('register'); setMessage(''); }}>Регистрация</button>
          </div>
          <form key={mode} onSubmit={authenticate}>
            <fieldset disabled={!!loading}>
              <label htmlFor="username">ЛОГИН</label><input id="username" name="username" required maxLength={150} autoComplete="username" placeholder="Твоё имя в клубе" />
              <label htmlFor="password">ПАРОЛЬ</label><input id="password" name="password" type="password" required minLength={mode === 'register' ? 6 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Не менее 6 символов" />
              {mode === 'register' && <><label htmlFor="password_confirmation">ПОВТОРИ ПАРОЛЬ</label><input id="password_confirmation" name="password_confirmation" type="password" required minLength={6} autoComplete="new-password" placeholder="Ещё раз для проверки" /></>}
              <button className="primary-button" type="submit">{mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'} <span>↗</span></button>
            </fieldset>
          </form>
          <p className="terms">Продолжая, ты принимаешь правила сообщества.</p>
        </> : <>
          <h2 id="card-title">{editing ? <>Твоя анкета<span className="accent">.</span></> : <>Привет, {user.profile.first_name || user.username}<span className="accent">.</span></>}</h2>
          <p className="card-subtitle">{editing ? 'Расскажи сообществу, как ты звучишь.' : 'Твой профиль в музыкальном сообществе.'}</p>
          <div className="profile-handle"><span className="avatar">{(user.profile.first_name || user.username).slice(0, 1).toUpperCase()}</span><div><strong>{user.username}</strong><small>УЧАСТНИК MUZKLUB</small></div></div>
          {editing ? <form onSubmit={saveProfile}><fieldset disabled={!!loading}>
            <label htmlFor="first_name">ИМЯ</label><input id="first_name" name="first_name" defaultValue={user.profile.first_name} maxLength={100} placeholder="Как к тебе обращаться" />
            <label htmlFor="specialization">ТВОЙ ИНСТРУМЕНТ</label><select id="specialization" name="specialization" defaultValue={user.profile.specialization || 'other'}>{choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select>
            <label htmlFor="bio">О СЕБЕ</label><textarea id="bio" name="bio" rows={3} defaultValue={user.profile.bio} placeholder="Стиль, опыт, кого ищешь..." />
            <label htmlFor="fee">ГОНОРАР</label><input id="fee" name="fee" type="number" min="0" max="99999999.99" step="0.01" required defaultValue={user.profile.fee || '0.00'} />
            <button className="primary-button" type="submit">Сохранить профиль <span>↗</span></button>
            <button className="text-button" type="button" onClick={() => { setEditing(false); setMessage(''); }}>Отменить</button>
          </fieldset></form> : <div className="profile-summary">
            <div><span>ИНСТРУМЕНТ</span><strong>{user.profile.specialization_display || 'Не указан'}</strong></div>
            <div><span>О СЕБЕ</span><strong>{user.profile.bio || 'Профиль пока пустой'}</strong></div>
            <div><span>ГОНОРАР</span><strong>{user.profile.fee}</strong></div>
            <button className="primary-button" disabled={!!loading} onClick={() => { setEditing(true); setMessage(''); }}>Редактировать профиль <span>↗</span></button>
            <button className="text-button" disabled={!!loading} onClick={logout}>Выйти из аккаунта</button>
          </div>}
        </>}
      </section>
    </section>
    <footer className="footer"><span>© 2026 MUZKLUB</span><span>СОЗДАНО ДЛЯ ТЕХ, КТО ЖИВЁТ МУЗЫКОЙ</span><span>НАЙДИ СВОЙ РИТМ <b>↗</b></span></footer>
  </main>;
}

export default App;
