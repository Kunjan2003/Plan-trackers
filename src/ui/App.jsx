import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, CloudUpload, Copy, FileImage, FileText, Headphones, House, Laptop, LogOut, Menu, Moon, MoreHorizontal, Plus, Settings as SettingsIcon, Shield, ShieldCheck, Sparkles, Sun, Trash2, Upload, UserRound, X, Zap } from 'lucide-react'

const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY) : null
const icons = { Electronics: Laptop, Appliances: Zap, Furniture: House, Vehicles: Activity, Other: PackageIcon }
function PackageIcon(props) { return <Shield {...props} /> }
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const starterItems = [
  { id:'demo-1', name:'Studio Display', brand:'Apple', store:'Apple Store', price:1599, purchase_date:daysFromNow(-326), warranty_end:daysFromNow(39), category:'Electronics', notes:'27-inch 5K Retina display', support_email:'support@apple.com', receipt_url:null },
  { id:'demo-2', name:'Brew Pro Espresso Machine', brand:'Breville', store:'Williams Sonoma', price:699, purchase_date:daysFromNow(-347), warranty_end:daysFromNow(18), category:'Appliances', notes:'Serial no. BES878', support_email:'', receipt_url:null },
  { id:'demo-3', name:'Cloud Sofa', brand:'Article', store:'Article', price:1899, purchase_date:daysFromNow(-211), warranty_end:daysFromNow(154), category:'Furniture', notes:'Charme tan leather', support_email:'', receipt_url:null },
  { id:'demo-4', name:'Air purifier 3000i', brand:'Philips', store:'Best Buy', price:329, purchase_date:daysFromNow(-385), warranty_end:daysFromNow(-20), category:'Electronics', notes:'Filter replaced in April', support_email:'', receipt_url:null },
]
const dateFormat = (d, opts={ month:'short', day:'numeric', year:'numeric' }) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US',opts) : '—'
const dayDiff = (d) => Math.ceil((new Date(`${d}T23:59:59`) - new Date()) / 86400000)
const money = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0)
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

export default function App() {
  const [items,setItems] = useState(() => { try { return JSON.parse(localStorage.getItem('wv-items')) || starterItems } catch { return starterItems } })
  const [active,setActive] = useState('Overview')
  const [selected,setSelected] = useState(null)
  const [addOpen,setAddOpen] = useState(false)
  const [dark,setDark] = useState(() => localStorage.getItem('wv-theme') === 'dark')
  const [user,setUser] = useState(null)
  const [authBusy,setAuthBusy] = useState(false)
  const [toast,setToast] = useState('')
  const [claimItem,setClaimItem] = useState(null)
  const [mobileNav,setMobileNav] = useState(false)
  const [settings,setSettings] = useState({ alerts:true, email:'', reminders:[30,7,1] })

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark':'light'; localStorage.setItem('wv-theme',dark?'dark':'light') },[dark])
  useEffect(() => { localStorage.setItem('wv-items',JSON.stringify(items)) },[items])
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({data}) => setUser(data.session?.user || null))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => setUser(session?.user || null))
    return () => subscription.unsubscribe()
  },[])
  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('items').select('*, receipts(file_url)').order('warranty_end').then(({data,error}) => {
      if (!error && data) setItems(data.map(i => ({...i,receipt_url:i.receipts?.[0]?.file_url || null})))
    })
  },[user])
  useEffect(() => {
    if (!settings.alerts || !('Notification' in window) || Notification.permission !== 'granted') return
    const sent = JSON.parse(localStorage.getItem('wv-reminders') || '{}')
    const next = {...sent}
    items.forEach(i => [30,7,1].forEach((n,index) => { const d=dayDiff(i.warranty_end); const floor=[7,1,-1][index]; const key=`${i.id}:${n}`; if(d<=n&&d>floor&&!sent[key]) { new Notification(`Warranty expires in ${n} day${n===1?'':'s'}`,{body:`${i.name} · ${dateFormat(i.warranty_end)}`}); next[key]=true } }))
    localStorage.setItem('wv-reminders',JSON.stringify(next))
  },[items,settings.alerts])
  useEffect(() => { if(!toast) return; const t=setTimeout(()=>setToast(''),3200); return ()=>clearTimeout(t) },[toast])

  const sortedItems = useMemo(() => [...items].sort((a,b)=>new Date(a.warranty_end)-new Date(b.warranty_end)),[items])
  const expiring=items.filter(i=>dayDiff(i.warranty_end)>=0&&dayDiff(i.warranty_end)<=30).length
  const total=items.reduce((s,i)=>s+Number(i.price||0),0)
  const activeCount=items.filter(i=>dayDiff(i.warranty_end)>=0).length
  const onSave = async (entry,file) => {
    let receipt_url = entry.receipt_url || null
    const row = {...entry,id:uid(),user_id:user?.id}
    if(supabase&&user) {
      const {data,error}=await supabase.from('items').insert({user_id:user.id,name:entry.name,brand:entry.brand,store:entry.store,price:Number(entry.price)||0,purchase_date:entry.purchase_date,warranty_end:entry.warranty_end,category:entry.category,notes:entry.notes,support_email:entry.support_email}).select().single()
      if(error){setToast(`Could not save: ${error.message}`);return}
      row.id=data.id
      if(file){const path=`${user.id}/${data.id}/${file.name}`;const up=await supabase.storage.from('receipts').upload(path,file,{upsert:true}); if(!up.error){await supabase.from('receipts').insert({user_id:user.id,item_id:data.id,file_url:path,file_name:file.name}); receipt_url=path}}
      await supabase.from('reminders').insert([30,7,1].map(n=>({user_id:user.id,item_id:data.id,reminder_date:new Date(new Date(`${entry.warranty_end}T12:00:00`).getTime()-n*86400000).toISOString().slice(0,10),days_before:n,status:'pending'})))
    } else if(file) receipt_url=await fileToDataUrl(file)
    row.receipt_url=receipt_url
    setItems(prev=>[...prev,row]);setAddOpen(false);setToast('Item added to your vault')
  }
  const removeItem = async (id) => { if(supabase&&user) await supabase.from('items').delete().eq('id',id);setItems(items.filter(i=>i.id!==id));setSelected(null);setToast('Item removed') }
  const signIn = async (provider) => { if(!supabase){setToast('Add Supabase keys to enable account sign-in');return} setAuthBusy(true); try { if(provider==='google') await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});else {const email=window.prompt('Enter your email address');if(email) await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});setToast('Check your email for the sign-in link')} } catch(e){setToast(e.message)} finally{setAuthBusy(false)} }
  const navTo=(x)=>{setActive(x);setMobileNav(false);setSelected(null)}

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
      <a className="brand" href="#" onClick={e=>{e.preventDefault();navTo('Overview')}}><span className="brand-mark"><ShieldCheck size={20}/></span><span>Warranty<span className="brand-light">Vault</span></span></a>
      <div className="side-label">WORKSPACE</div>
      <nav className="nav-list">
        <button className={`nav-item ${active==='Overview'?'active':''}`} onClick={()=>navTo('Overview')}><House size={18}/>Overview</button>
        <button className={`nav-item ${active==='My items'?'active':''}`} onClick={()=>navTo('My items')}><Shield size={18}/>My items<span className="nav-count">{items.length}</span></button>
      </nav>
      <div className="sidebar-spacer"/>
      <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><div><b>Need a hand?</b><small>We’re here to help.</small></div><ChevronRight size={16}/></div>
      <button className={`nav-item settings-link ${active==='Settings'?'active':''}`} onClick={()=>navTo('Settings')}><SettingsIcon size={18}/>Settings</button>
      <div className="profile-row"><div className="avatar">{user?.email?.[0]?.toUpperCase()||'K'}</div><div className="profile-copy"><b>{user?.email?.split('@')[0]||'Your vault'}</b><small>{user?'Personal account':'Demo workspace'}</small></div>{user?<button className="icon-button tiny" title="Sign out" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/></button>:<button className="icon-button tiny" title="Sign in" onClick={()=>signIn('email')}><ArrowRight size={16}/></button>}</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(!mobileNav)}><Menu size={20}/></button><span className="brand-mark"><ShieldCheck size={19}/></span><b>Warranty<span className="brand-light">Vault</span></b></div><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><b>{selected?'Item details':active}</b></div><div className="top-actions"><button className="icon-button theme-toggle" title="Toggle dark mode" onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button className="notification-button" onClick={async()=>{if(!('Notification'in window)){setToast('Notifications are not supported in this browser');return}const p=await Notification.requestPermission();setToast(p==='granted'?'Expiry alerts enabled on this device':'Notifications are blocked in browser settings')}}><Bell size={17}/><span>Alerts</span>{expiring>0&&<i/>}</button><button className="primary-button top-add" onClick={()=>setAddOpen(true)}><Plus size={17}/>Add item</button></div></header>
      <div className="content-wrap">
        {active==='Settings'?<SettingsPage settings={settings} setSettings={setSettings} dark={dark} setDark={setDark} user={user} signIn={signIn} toast={setToast}/>:selected?<DetailPage item={selected} onBack={()=>setSelected(null)} onClaim={()=>setClaimItem(selected)} onDelete={()=>removeItem(selected.id)} toast={setToast}/>:<>
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/>YOUR PERSONAL INVENTORY</div><h1>{active==='My items'?'All your items, in one place.':'Good morning, Kunjan'}<span className="wave">✦</span></h1><p>Keep every purchase protected. We’ll help you stay one step ahead.</p></div><button className="primary-button heading-add" onClick={()=>setAddOpen(true)}><Plus size={17}/>Add item</button></div>
          <section className="hero-card"><div className="hero-copy"><span className="hero-kicker"><Sparkles size={14}/> YOUR COVERAGE, AT A GLANCE</span><h2>Everything you own.<br/><em>Nothing you forget.</em></h2><p>Your warranties are in good hands. We’ll remind you before it’s time to act.</p><button className="hero-link" onClick={()=>navTo('My items')}>View your collection <ArrowRight size={15}/></button></div><div className="hero-visual"><div className="orb orb-one"/><div className="orb orb-two"/><div className="hero-ring ring-one"/><div className="hero-ring ring-two"/><div className="hero-shield"><ShieldCheck size={37}/></div><div className="floating-card float-top"><span className="float-check"><Check size={11}/></span><span>All in one place</span></div><div className="floating-card float-bottom"><span className="float-spark"><Bell size={12}/></span><span>We’ll remind you</span></div><div className="sparkle spark-a">✦</div><div className="sparkle spark-b">✧</div></div><div className="hero-index">01 <span/> 04</div></section>
          <section className="stats-grid"><StatCard icon={ShieldCheck} label="Protected items" value={items.length} foot="Across your collection" tone="mint"/><StatCard icon={Clock3} label="Expiring soon" value={expiring} foot="Next 30 days" tone="amber"/><StatCard icon={ArrowDownToLine} label="Total protected" value={money(total)} foot="Purchase value tracked" tone="violet"/><StatCard icon={CalendarDays} label="Active coverage" value={`${activeCount} / ${items.length}`} foot="Warranties in effect" tone="blue"/></section>
          <section className="items-section"><div className="section-header"><div><div className="eyebrow mini-eyebrow">YOUR COLLECTION</div><h2>{active==='My items'?'All items':'Your items'} <span className="section-count">{items.length}</span></h2></div><button className="text-button" onClick={()=>navTo('My items')}>View all <ArrowRight size={15}/></button></div>
            <div className="toolbar"><span className="sort-caption"><Clock3 size={14}/> Sorted by expiry</span></div>
            <div className="item-list">{sortedItems.length?sortedItems.map(item=><ItemRow key={item.id} item={item} open={()=>setSelected(item)} onClaim={()=>setClaimItem(item)}/>):<div className="empty-state"><span className="empty-icon"><Shield size={23}/></span><b>Your vault is ready</b><span>Add a purchase to start tracking its warranty.</span><button className="primary-button" onClick={()=>setAddOpen(true)}><Plus size={16}/>Add your first item</button></div>}</div>
          </section>
          <footer className="footnote"><ShieldCheck size={14}/> Your purchase details are private and secure <span>·</span> <button onClick={()=>navTo('Settings')}>Manage your vault</button></footer>
        </>}
      </div>
    </main>
    {addOpen&&<AddModal onClose={()=>setAddOpen(false)} onSave={onSave} toast={setToast}/>}
    {claimItem&&<ClaimModal item={claimItem} onClose={()=>setClaimItem(null)} toast={setToast}/>}
    {toast&&<div className="toast"><span><Check size={15}/></span>{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}
  </div>
}

function StatCard({icon:Icon,label,value,foot,tone}){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>}
function ItemRow({item,open,onClaim}){const d=dayDiff(item.warranty_end);const status=d<0?'expired':d<=30?'soon':'active';const label=d<0?`${Math.abs(d)} days ago`:d===0?'Expires today':d<30?`${d} days left`:`${d} days left`;const Icon=icons[item.category]||Shield;return <article className="item-row"><button className={`item-art art-${item.category?.toLowerCase()||'other'}`} onClick={open} aria-label={`Open ${item.name}`}><Icon size={22}/></button><button className="item-info" onClick={open}><strong>{item.name}</strong><span>{item.brand||'No brand'} <i>·</i> {item.store||'Purchase details'}</span></button><div className="item-price"><span>Purchase price</span><b>{money(item.price)}</b></div><div className="item-date"><span>Warranty ends</span><b>{dateFormat(item.warranty_end,{month:'short',day:'numeric',year:'numeric'})}</b></div><div className={`status-pill ${status}`}><i/>{status==='active'?'Active':status==='soon'?'Expiring':'Expired'} <span>· {label}</span></div><button className="row-more" onClick={onClaim} title="Prepare a claim"><MoreHorizontal size={19}/></button><button className="row-chevron" onClick={open}><ChevronRight size={18}/></button></article>}
function AddModal({onClose,onSave,toast}){
 const [form,setForm]=useState({name:'',brand:'',store:'',price:'',purchase_date:daysFromNow(0),warranty_end:'',category:'Electronics',notes:'',support_email:''});const [file,setFile]=useState(null);const [preview,setPreview]=useState('');const [busy,setBusy]=useState(false);const [ocr,setOcr]=useState(false);const input=useRef(null)
 const set=(k,v)=>setForm(f=>({...f,[k]:v}))
 const handleFile=async f=>{if(!f)return;setFile(f);if(f.type.startsWith('image/'))setPreview(URL.createObjectURL(f));else setPreview('');if(!f.type.startsWith('image/'))return;setOcr(true);toast('Reading receipt…');try{const T=await import('tesseract.js');const {data}=await T.recognize(f,'eng');const text=data.text||'';const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);const candidates=lines.filter(x=>x.length>4&&!/receipt|invoice|total|tax|change|cash|visa|mastercard/i.test(x));const priceMatch=text.match(/(?:total|amount)[^\d]{0,12}\$?\s?(\d{1,5}\.\d{2})/i)||text.match(/\$\s?(\d{1,5}\.\d{2})/);const dateMatch=text.match(/\b(\d{1,2}[/-]\d{1,2}[/-](?:\d{2}|\d{4}))\b/);setForm(fm=>({...fm,name:fm.name||candidates[1]||candidates[0]||'',store:fm.store||candidates[0]||'',price:fm.price||priceMatch?.[1]||'',purchase_date:fm.purchase_date===daysFromNow(0)?(dateMatch?normalizeDate(dateMatch[1]):fm.purchase_date):fm.purchase_date}));toast('Receipt scanned — review the details')}catch(e){toast('Could not read the receipt. You can enter details manually.')}finally{setOcr(false)}}
 const submit=async e=>{e.preventDefault();if(!form.name||!form.warranty_end){toast('Add an item name and warranty end date');return}setBusy(true);await onSave(form,file);setBusy(false)}
 return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal add-modal"><header className="modal-header"><div><span className="eyebrow mini-eyebrow">ADD TO YOUR VAULT</span><h2>Protect a new purchase</h2><p>Save the details now. You can edit them any time.</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></header><form onSubmit={submit}><div className="upload-zone" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0])}}>{preview?<img src={preview} className="receipt-preview"/>:<div className="upload-icon"><CloudUpload size={22}/></div>}<div className="upload-copy"><b>{file?file.name:'Upload a receipt'}</b><span>{ocr?'Reading receipt with OCR…':'Drop a file here, or browse · JPG, PNG, PDF'}</span></div><button type="button" className="browse-button" onClick={e=>{e.stopPropagation();input.current?.click()}}>{ocr?'Scanning…':<><Upload size={14}/>Browse</>}</button><input ref={input} type="file" accept="image/*,.pdf" capture="environment" hidden onChange={e=>handleFile(e.target.files?.[0])}/></div><div className="form-grid"><label className="field full">Product name <em>*</em><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Studio Display" required/></label><label className="field">Brand<input value={form.brand} onChange={e=>set('brand',e.target.value)} placeholder="e.g. Apple"/></label><label className="field">Store<input value={form.store} onChange={e=>set('store',e.target.value)} placeholder="Where did you buy it?"/></label><label className="field">Purchase date<input type="date" value={form.purchase_date} onChange={e=>set('purchase_date',e.target.value)}/></label><label className="field">Price<input type="number" min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="$0.00"/></label><label className="field">Category<select value={form.category} onChange={e=>set('category',e.target.value)}>{Object.keys(icons).map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Warranty ends <em>*</em><input type="date" value={form.warranty_end} onChange={e=>set('warranty_end',e.target.value)} required/></label><label className="field full">Support email <span className="optional">for claim helper</span><input type="email" value={form.support_email} onChange={e=>set('support_email',e.target.value)} placeholder="support@brand.com"/></label><label className="field full">Notes<textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Serial number, color, or anything useful…" rows="2"/></label></div><div className="modal-footer"><span className="secure-note"><ShieldCheck size={14}/> Your data stays yours</span><div><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy||ocr}>{busy?'Saving…':<><ShieldCheck size={16}/>Save item</>}</button></div></div></form></section></div>
}
function DetailPage({item,onBack,onClaim,onDelete,toast}){const d=dayDiff(item.warranty_end);const status=d<0?'expired':d<=30?'soon':'active';return <div className="detail-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Back to your items</button><div className="detail-heading"><div><div className="eyebrow mini-eyebrow">ITEM DETAILS</div><h1>{item.name}</h1><p>{item.brand||'Brand not added'} <i>·</i> Purchased at {item.store||'store not added'}</p></div><button className="primary-button" onClick={onClaim}><Headphones size={16}/>Prepare a claim</button></div><div className="detail-grid"><div className="detail-main"><div className="detail-card"><div className="detail-card-head"><h3>Warranty status</h3><span className={`status-pill ${status}`}><i/>{status==='active'?'Active':status==='soon'?'Expiring soon':'Expired'}</span></div><div className="coverage-line"><div className="coverage-icon"><ShieldCheck size={22}/></div><div><strong>{d<0?`Expired ${Math.abs(d)} days ago`:d===0?'Expires today':`${d} days of coverage left`}</strong><span>Coverage ends {dateFormat(item.warranty_end)}</span></div></div><div className="coverage-progress"><span style={{width:`${Math.max(4,Math.min(100,((365-Math.max(0,d))/365)*100))}%`}}/></div><div className="coverage-labels"><span>Purchased {dateFormat(item.purchase_date,{month:'short',day:'numeric'})}</span><span>Warranty end</span></div></div><div className="detail-card"><h3>Purchase details</h3><div className="details-grid"><Info label="Purchase price" value={money(item.price)}/><Info label="Purchase date" value={dateFormat(item.purchase_date)}/><Info label="Store" value={item.store||'—'}/><Info label="Category" value={item.category||'Other'}/></div>{item.notes&&<div className="notes-box"><span>NOTES</span><p>{item.notes}</p></div>}</div><div className="detail-card"><div className="detail-card-head"><h3>Receipt</h3><button className="text-button" onClick={()=>item.receipt_url?openReceipt(item.receipt_url):toast('No receipt uploaded yet')}>{item.receipt_url?'View receipt':'No receipt uploaded'} <ArrowRight size={14}/></button></div>{item.receipt_url?<div className="receipt-card"><FileText size={19}/><div><b>Purchase receipt</b><span>Saved with this item</span></div><button className="icon-button" onClick={()=>openReceipt(item.receipt_url)}><ArrowDownToLine size={17}/></button></div>:<div className="no-receipt"><FileImage size={20}/><span>Keep your proof of purchase close by.</span></div>}</div></div><aside className="detail-side"><div className="tip-card"><div className="tip-icon"><Bell size={18}/></div><b>We’ll give you a heads-up.</b><p>Get reminders 30, 7, and 1 day before this warranty expires.</p><span><Check size={13}/> Expiry reminders on</span></div><div className="support-card"><span className="eyebrow mini-eyebrow">NEED TO MAKE A CLAIM?</span><h3>We’ll get the details ready.</h3><p>Build a clear message with your purchase info and receipt.</p><button className="primary-button" onClick={onClaim}>Open claim helper <ArrowRight size={15}/></button></div><button className="delete-button" onClick={()=>{if(confirm(`Remove ${item.name} from your vault?`))onDelete()}}><Trash2 size={15}/>Remove this item</button></aside></div></div>}
function Info({label,value}){return <div className="info-pair"><span>{label}</span><b>{value}</b></div>}
function ClaimModal({item,onClose,toast}){const [support,setSupport]=useState(item.support_email||'');const subject=`Warranty claim: ${item.name}`;const body=`Hello ${item.brand||'Support Team'},\n\nI would like to request warranty service for my ${item.name}.\n\nProduct: ${item.name}${item.brand?` (${item.brand})`:''}\nPurchased from: ${item.store||'—'}\nPurchase date: ${dateFormat(item.purchase_date)}\nWarranty expiry: ${dateFormat(item.warranty_end)}\n${item.notes?`\nAdditional details: ${item.notes}\n`:''}\nI have attached my proof of purchase. Please let me know the next steps.\n\nThank you.`;const copy=async()=>{await navigator.clipboard.writeText(`To: ${support}\nSubject: ${subject}\n\n${body}`);toast('Claim message copied')};const send=()=>{if(!support){toast('Add a support email first');return}window.location.href=`mailto:${encodeURIComponent(support)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;toast('Email draft opened — attach your receipt before sending')};return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal claim-modal"><header className="modal-header"><div><span className="eyebrow mini-eyebrow">CLAIM HELPER</span><h2>Let’s get this sorted.</h2><p>Your purchase details, ready to go.</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></header><label className="field">Brand support email<input type="email" value={support} onChange={e=>setSupport(e.target.value)} placeholder="Enter the brand’s support address"/></label><div className="claim-preview"><div className="claim-preview-head"><span>EMAIL PREVIEW</span><button onClick={copy}><Copy size={14}/>Copy</button></div><b>Subject: {subject}</b><p>{body}</p></div><div className="claim-receipt"><div className="receipt-mini"><FileText size={17}/></div><div><b>Proof of purchase</b><span>{item.receipt_url?'Receipt saved · attach it to your email':'No receipt on file'}</span></div>{item.receipt_url&&<button className="text-button" onClick={()=>openReceipt(item.receipt_url)}>Open</button>}</div><div className="claim-footer"><span className="secure-note"><ShieldCheck size={14}/>Review before sending</span><button className="primary-button" onClick={send}><ArrowRight size={15}/>Open email draft</button></div><p className="claim-hint">Your email app will open with the message filled in. Attach your receipt before sending.</p></section></div>}
function SettingsPage({settings,setSettings,dark,setDark,user,signIn,toast}) {
  return <div className="settings-page">
    <div className="eyebrow mini-eyebrow">PREFERENCES</div>
    <h1>Your vault, your way.</h1>
    <p className="settings-intro">Manage reminders, account access, and your data.</p>
    <div className="settings-layout">
      <div className="settings-main">
        <div className="settings-card">
          <div className="settings-card-title"><span className="settings-icon"><Bell size={18}/></span><div><b>Expiry reminders</b><small>We’ll nudge you before a warranty ends.</small></div></div>
          <Toggle value={settings.alerts} onChange={v=>setSettings({...settings,alerts:v})}/>
          <div className="reminder-chips">{[30,7,1].map(n=><span key={n}><Check size={13}/>{n} days before</span>)}</div>
          <button className="text-button settings-action" onClick={async()=>{if(!('Notification' in window)){toast('Notifications are not supported in this browser');return}const p=await Notification.requestPermission();toast(p==='granted'?'Notifications enabled':'Notifications blocked')}}>Enable browser notifications <ArrowRight size={14}/></button>
        </div>
        <div className="settings-card">
          <div className="settings-card-title"><span className="settings-icon"><UserRound size={18}/></span><div><b>Account</b><small>{user?user.email:'Use a secure link to access your vault on any device.'}</small></div></div>
          {user?<span className="connected-badge"><span/>Connected</span>:<div className="account-buttons"><button className="secondary-button" onClick={()=>signIn('email')}>Continue with email</button><button className="secondary-button" onClick={()=>signIn('google')}>Continue with Google</button></div>}
        </div>
        <div className="settings-card">
          <div className="settings-card-title"><span className="settings-icon"><Moon size={18}/></span><div><b>Appearance</b><small>Choose a theme that feels right.</small></div></div>
          <div className="theme-options"><button className={!dark?'chosen':''} onClick={()=>setDark(false)}><Sun size={16}/>Light</button><button className={dark?'chosen':''} onClick={()=>setDark(true)}><Moon size={16}/>Dark</button></div>
        </div>
      </div>
      <aside className="settings-aside">
        <div className="settings-card privacy-panel"><span className="eyebrow mini-eyebrow">YOUR DATA</span><h3>Your receipts stay private.</h3><p>Receipt images stay on this device in demo mode, or in your private Supabase storage when connected.</p></div>
        <div className="privacy-note"><ShieldCheck size={17}/><div><b>Your information is yours.</b><span>Receipts and item details are only visible to you.</span></div></div>
      </aside>
    </div>
  </div>
}
function Toggle({value,onChange}){return <button role="switch" aria-checked={value} className={`toggle ${value?'on':''}`} onClick={()=>onChange(!value)}><span/></button>}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function openReceipt(url){if(url.startsWith('data:')){const a=document.createElement('a');a.href=url;a.download='warranty-receipt';a.click()}else if(supabase){supabase.storage.from('receipts').createSignedUrl(url,60).then(({data})=>data?.signedUrl&&window.open(data.signedUrl,'_blank','noopener'))}else window.open(url,'_blank','noopener')}
function normalizeDate(raw){const p=raw.split(/[/-]/);if(p.length!==3)return daysFromNow(0);let [m,d,y]=p;if(y.length===2)y=`20${y}`;const dt=new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);return Number.isNaN(+dt)?daysFromNow(0):dt.toISOString().slice(0,10)}
