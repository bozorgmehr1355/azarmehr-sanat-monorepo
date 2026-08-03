// ─── components.jsx ───
// کامپوننت‌های UI مشترک که در همه ماژول‌ها استفاده می‌شن

const USER_IDENTITIES = require('../constants/user-identities');


function Av({user,size=36}) {
  if (!user) return <div style={{width:size,height:size,borderRadius:"50%",background:C.surfaceAlt,flexShrink:0}}/>;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},#A66B0A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:700,color:"#fff",flexShrink:0,position:"relative"}}>
      {user.av || user.avatar}
      {user.online!==undefined && <div style={{position:"absolute",bottom:1,right:1,width:size*0.27,height:size*0.27,borderRadius:"50%",background:user.online?C.online:C.textDim,border:`2px solid ${C.bg}`}}/>}
    </div>
  );
}

function Badge({status}) {
  const map = {
    pending:["در انتظار",C.warning],approved:["تأیید شد",C.success],rejected:["رد شد",C.danger],
    inprogress:["در جریان",C.teal],done:["تکمیل",C.success],
    high:["مهم",C.danger],medium:["متوسط",C.warning],low:["عادی",C.textMuted],
  };
  const [lbl,col] = map[status]||[status,C.textMuted];
  return <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:col+"22",color:col,fontWeight:600}}>{lbl}</span>;
}

// نشان وضعیت استاندارد فاز ۱ (My Tasks — وضعیت‌های معتبر بک‌اند)
function TaskStatusBadge({status}) {
  const map = {
    PENDING_ACK:    ["در انتظار تأیید",C.warning],
    ACKNOWLEDGED:   ["تأیید شد",C.info],
    IN_PROGRESS:    ["در حال انجام",C.teal],
    PENDING_REVIEW: ["در انتظار بررسی",C.purple],
    APPROVED:       ["تأیید نهایی",C.success],
    REJECTED:       ["رد شده",C.danger],
    BLOCKED:        ["مسدود",C.danger],
  };
  const [lbl,col] = map[status]||[status,C.textMuted];
  return <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:col+"22",color:col,fontWeight:600}}>{lbl}</span>;
}

function Progress({tasks}) {
  const done = tasks.filter(t=>t.status==="done").length;
  const pct  = tasks.length ? Math.round(done/tasks.length*100) : 0;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textMuted,marginBottom:4}}><span>{done}/{tasks.length}</span><span>{pct}%</span></div>
      <div style={{height:3,background:C.border,borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:pct===100?C.success:C.teal,transition:"width 0.3s"}}/>
      </div>
    </div>
  );
}

function ConfirmDlg({cfg,onClose}) {
  if (!cfg) return null;
  const cols = {danger:C.danger,warning:C.warning,success:C.success};
  const col  = cols[cfg.type]||C.teal;
  return (
    <div style={{position:"fixed",inset:0,background:"#000C",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"24px 20px 28px",width:"100%",maxWidth:480,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>{cfg.title}</div>
        <div style={{fontSize:13,color:C.textMuted,lineHeight:1.7,marginBottom:24}}>{cfg.message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>انصراف</button>
          <button onClick={()=>{cfg.onConfirm();onClose();}} style={{flex:1,padding:"13px",borderRadius:10,border:"none",background:col,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{cfg.confirmLabel||"تأیید"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───




// ─── Excel Export ───
function exportToCSV(filename, headers, rows) {
  const BOM = "\uFEFF";
  const headerRow = headers.join(",");
  const dataRows = rows.map(r => r.map(cell => {
    const s = String(cell || "").replace(/"/g, '""');
    return s.includes(",") || s.includes("\n") ? `"${s}"` : s;
  }).join(","));
  const csv = BOM + [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename + ".csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}


// ─── Drawer Components ───
function DrawerSection({title, children}) {
  return (
    <div style={{borderTop:"1px solid #303030"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#4A4A4A",padding:"10px 16px 4px",letterSpacing:1}}>{title}</div>
      {children}
    </div>
  );
}

function DrawerCollapsible({title, count, children, defaultOpen=false}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{borderTop:"1px solid #303030"}}>
      <div onClick={()=>setOpen(p=>!p)}
        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px 4px",cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#4A4A4A",letterSpacing:1,flex:1}}>{title}</div>
        <div style={{fontSize:11,color:"#4A4A4A"}}>{open?"▲":"▼"} {count}</div>
      </div>
      {open && children}
    </div>
  );
}

function DrawerItem({icon, label, sub, badge, active, online, danger, onClick}) {
  const C2 = {teal:"#D4880E",tealDim:"#D4880E22",text:"#D1D3D4",textDim:"#4A4A4A",danger:"#C94B3F",surfaceAlt:"#252525"};
  return (
    <div onClick={onClick}
      style={{display:"flex",alignItems:"center",gap:12,padding:"9px 16px",cursor:"pointer",WebkitTapHighlightColor:"transparent",background:active?C2.tealDim:"transparent",color:danger?C2.danger:C2.text}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:typeof icon==="string"?C2.surfaceAlt:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:typeof icon==="string"?18:0,flexShrink:0,position:"relative"}}>
        {typeof icon==="string" ? icon : icon}
        {online&&<div style={{position:"absolute",bottom:1,right:1,width:9,height:9,borderRadius:"50%",background:"#8DB33A",border:"2px solid #131313"}}/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:active?600:400,color:danger?C2.danger:active?C2.teal:C2.text}}>{label}</div>
        {sub&&<div style={{fontSize:11,color:C2.textDim,marginTop:1}}>{sub}</div>}
      </div>
      {badge>0&&<div style={{background:C2.teal,borderRadius:12,minWidth:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",padding:"0 6px",flexShrink:0}}>{faN(badge)}</div>}
    </div>
  );
}


// ─── Workflow Timeline Component ───
function WorkflowTimeline({workflow, users}) {
  if (!workflow || !workflow.length) return null;
  const C2 = {teal:"#D4880E",success:"#8DB33A",warning:"#C8960A",danger:"#C94B3F",surface:"#1C1C1C",border:"#303030",text:"#D1D3D4",textMuted:"#888888",textDim:"#4A4A4A"};
  const actionColor = {submitted:"#3B82F6",sent:"#3B82F6",received:C2.teal,approved:C2.success,rejected:C2.danger,pending:C2.warning};
  const actionLabel = {submitted:"ثبت شد",sent:"ارسال شد",received:"دریافت شد",approved:"تأیید شد",rejected:"رد شد",pending:"در انتظار"};
  const currentStep = workflow.filter(w=>w.done).length;

  return (
    <div style={{marginTop:16}}>
      <div style={{fontSize:12,fontWeight:700,color:C2.textMuted,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
        <span>مسیر گردش کار</span>
        <span style={{fontSize:11,color:C2.teal}}>({faN(currentStep)}/{faN(workflow.length)} مرحله)</span>
      </div>
      {workflow.map((step,i)=>{
        const user = users.find(u=>u.id===step.userId);
        const isLast = i === workflow.length-1;
        const col = step.done ? actionColor[step.action]||C2.success : C2.border;
        return (
          <div key={i} style={{display:"flex",gap:0,position:"relative"}}>
            {/* Line */}
            {!isLast && <div style={{position:"absolute",right:15,top:28,width:2,height:"calc(100% - 4px)",background:step.done?C2.success:C2.border,zIndex:0}}/>}
            {/* Dot */}
            <div style={{width:30,height:30,borderRadius:"50%",background:step.done?col:"transparent",border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,marginLeft:12}}>
              {step.done && step.action!=="pending" && <div style={{width:10,height:10,borderRadius:"50%",background:"#fff"}}/>}
              {!step.done && <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>}
            </div>
            {/* Content */}
            <div style={{flex:1,paddingBottom:isLast?0:16,paddingRight:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}}>
                <span style={{fontSize:13,fontWeight:600,color:step.done?C2.text:C2.textDim}}>{step.title}</span>
                {step.done && <span style={{fontSize:10,background:col+"22",color:col,padding:"1px 7px",borderRadius:10,fontWeight:600,flexShrink:0,marginRight:6}}>{actionLabel[step.action]}</span>}
              </div>
              {user && <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg,${C2.teal},#005C4B)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{user.av}</div>
                <span style={{fontSize:11,color:C2.textMuted}}>{user.name}</span>
              </div>}
              {step.note && <div style={{fontSize:11,color:C2.textMuted,fontStyle:"italic",marginBottom:2}}>"{step.note}"</div>}
              {step.time && <div style={{fontSize:10,color:C2.textDim}}>{step.time}</div>}
              {!step.done && <div style={{fontSize:11,color:C2.warning}}>در انتظار اقدام</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── سازگار با سپیدار ───
// خروجی CSV با ستون‌های استاندارد سپیدار:
// کد طرف حساب، شرح، مبلغ بدهکار، مبلغ بستانکار، شماره سند، تاریخ



const PAYMENT_TYPES = [
  "پرداخت به تامین‌کننده","پرداخت حقوق و دستمزد","پرداخت اجاره",
  "هزینه عملیاتی","هزینه تعمیر و نگهداری","مساعده پرسنلی",
  "پرداخت مالیات","هزینه حمل و نقل","سایر",
];

// Permission groups for Admin UI
const PERMISSION_GROUPS = [
  { name: 'چارت سازمانی', permissions: ['org_chart:view', 'org_chart:edit'] },
  { name: 'پنل مدیریت', permissions: ['admin_panel:view'] },
  { name: 'مدیریت کاربران', permissions: ['users:manage'] },
  { name: 'تنظیمات', permissions: ['settings:manage'] },
  { name: 'مدیریت دسترسی‌ها', permissions: ['permissions:manage'] },
  { name: 'چت', permissions: ['chat:view'] },
  { name: 'پرداخت‌ها', permissions: ['payments:view'] },
  { name: 'CRM', permissions: ['crm:view'] },
];

// گردش کار پرداخت
function makeWorkflow(requesterId) {
  return [
    {step:1, title:"ثبت درخواست",        assignedTo:requesterId, role:"requester", status:"done",    note:"",time:""},
    {step:2, title:"تأیید مدیر فروش",    assignedTo:4,           role:"sales",     status:"pending", note:"",time:""},
    {step:3, title:"تأیید مدیر مالی",    assignedTo:3,           role:"finance",   status:"pending", note:"",time:""},
    {step:4, title:"تأیید مدیر عامل",    assignedTo:2,           role:"ceo",       status:"pending", note:"",time:""},
    {step:5, title:"دستور پرداخت",       assignedTo:3,           role:"finance2",  status:"pending", note:"",time:""},
    {step:6, title:"پرداخت توسط خزانه",  assignedTo:12,          role:"treasury",  status:"pending", note:"",time:""},
  ];
}

const SAMPLE_PAYMENTS = [
  {
    id:1, code:"PAY-1401", type:"پرداخت به تامین‌کننده",
    requesterId:6, requesterName:"مجتبی قاسم‌بیک",
    amount:48500000, desc:"خرید قطعات یدکی خط تولید", ref:"INV-2024-089",
    beneficiary:"شرکت صنایع ماشین‌آلات اصفهان", bankAccount:"IR120570028080010957856003",
    date:"۱۴۰۴/۰۳/۱۸", status:"step3", attachments:[],
    workflow:[
      {step:1,title:"ثبت درخواست",assignedTo:6,role:"requester",status:"done",note:"فاکتور شماره INV-2024-089 پیوست است",time:"۱۴۰۴/۰۳/۱۸ · ۰۹:۰۰"},
      {step:2,title:"تأیید مدیر فروش",assignedTo:4,role:"sales",status:"done",note:"تأیید می‌شود",time:"۱۴۰۴/۰۳/۱۸ · ۱۱:۳۰"},
      {step:3,title:"تأیید مدیر مالی",assignedTo:3,role:"finance",status:"pending",note:"",time:""},
      {step:4,title:"تأیید مدیر عامل",assignedTo:2,role:"ceo",status:"pending",note:"",time:""},
      {step:5,title:"دستور پرداخت",assignedTo:3,role:"finance2",status:"pending",note:"",time:""},
      {step:6,title:"پرداخت توسط خزانه",assignedTo:12,role:"treasury",status:"pending",note:"",time:""},
    ],
  },
  {
    id:2, code:"PAY-1402", type:"مساعده پرسنلی",
    requesterId:10, requesterName:"حسین مرادی",
    amount:5000000, desc:"مساعده تیرماه ۱۴۰۴", ref:"",
    beneficiary:"حسین مرادی", bankAccount:"IR890570028080010957856011",
    date:"۱۴۰۴/۰۳/۲۰", status:"paid",
    workflow:[
      {step:1,title:"ثبت درخواست",assignedTo:10,role:"requester",status:"done",note:"",time:"۱۴۰۴/۰۳/۲۰ · ۰۸:۰۰"},
      {step:2,title:"تأیید مدیر فروش",assignedTo:4,role:"sales",status:"done",note:"تأیید",time:"۱۴۰۴/۰۳/۲۰ · ۱۰:۰۰"},
      {step:3,title:"تأیید مدیر مالی",assignedTo:3,role:"finance",status:"done",note:"مبلغ صحیح است",time:"۱۴۰۴/۰۳/۲۰ · ۱۲:۰۰"},
      {step:4,title:"تأیید مدیر عامل",assignedTo:2,role:"ceo",status:"done",note:"موافقت شد",time:"۱۴۰۴/۰۳/۲۰ · ۱۴:۰۰"},
      {step:5,title:"دستور پرداخت",assignedTo:3,role:"finance2",status:"done",note:"دستور پرداخت صادر شد",time:"۱۴۰۴/۰۳/۲۰ · ۱۵:۰۰"},
      {step:6,title:"پرداخت توسط خزانه",assignedTo:12,role:"treasury",status:"done",note:"پرداخت انجام شد — کد پیگیری: ۱۲۳۴۵۶",time:"۱۴۰۴/۰۳/۲۰ · ۱۶:۳۰"},
    ],
  },
];

// ─── Helpers ───
function fmt(n) {
  return Number(n).toLocaleString("fa-IR");
}

function statusLabel(s) {
  const map = {
    step1:"در انتظار تأیید فروش", step2:"در انتظار تأیید فروش",
    step3:"در انتظار تأیید مالی", step4:"در انتظار تأیید مدیر عامل",
    step5:"در انتظار دستور پرداخت", step6:"در انتظار پرداخت",
    paid:"پرداخت شده", rejected:"رد شده",
  };
  return map[s] || s;
}

function statusColor(s) {
  if (s==="paid") return C.success;
  if (s==="rejected") return C.danger;
  return C.warning;
}

function exportSepidaar(payments) {
  const BOM = "\uFEFF";
  // Sepidaar compatible columns
  const headers = ["شماره سند","تاریخ","نوع","شرح","طرف حساب","شماره حساب بانکی","مبلغ (ریال)","وضعیت","درخواست‌کننده","تأیید فروش","تأیید مالی","تأیید مدیر عامل","تاریخ پرداخت","کد پیگیری"];
  const rows = payments.map(p => {
    const salesStep    = p.workflow.find(w=>w.role==="sales");
    const financeStep  = p.workflow.find(w=>w.role==="finance");
    const ceoStep      = p.workflow.find(w=>w.role==="ceo");
    const payStep      = p.workflow.find(w=>w.role==="treasury");
    return [
      p.code, p.date, p.type, p.desc, p.beneficiary,
      p.bankAccount, p.amount * 10, // تبدیل به ریال
      statusLabel(p.status),
      USERS.find(u=>u.id===p.requesterId)?.name || "",
      salesStep?.status==="done" ? "✓" : "",
      financeStep?.status==="done" ? "✓" : "",
      ceoStep?.status==="done" ? "✓" : "",
      payStep?.time || "",
      payStep?.note || "",
    ];
  });
  const csv = BOM + [headers, ...rows].map(r =>
    r.map(c => { const s=String(c||"").replace(/"/g,'""'); return s.includes(",")||s.includes("\n")?`"${s}"`:s; }).join(",")
  ).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "پرداخت‌ها-سپیدار.csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}


function StepBadge({status}) {
  const map = {done:["تأیید",C.success], pending:["در انتظار",C.warning], rejected:["رد شد",C.danger]};
  const [l,col] = map[status]||["—",C.textDim];
  return <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:col+"22",color:col,fontWeight:600}}>{l}</span>;
}

// ─── Payment Detail ───
function PaymentDetail({payment, me, onBack, onAction, isAdmin}) {
  const [note, setNote] = useState("");
  const myStep = payment.workflow.find(w => w.assignedTo===me.id && w.status==="pending");
  const currentStepNum = payment.workflow.filter(w=>w.status==="done").length + 1;

  return (
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:24,lineHeight:1,padding:0}}>‹</button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700}}>{payment.code}</div>
          <div style={{fontSize:11,color:statusColor(payment.status)}}>{statusLabel(payment.status)}</div>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:C.teal}}>{fmt(payment.amount)} تومان</div>
      </div>

      {/* Info Card */}
      <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[
            ["نوع",payment.type],["تاریخ",payment.date],
            ["شرح",payment.desc],["شماره مرجع",payment.ref||"—"],
          ].map(([k,v],i)=>(
            <div key={i} style={{gridColumn:i===2||i===3?"1/-1":"auto"}}>
              <div style={{fontSize:10,color:C.textDim,marginBottom:3}}>{k}</div>
              <div style={{fontSize:13,color:C.text,fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
          <div style={{fontSize:10,color:C.textDim,marginBottom:3}}>ذینفع / گیرنده</div>
          <div style={{fontSize:13,fontWeight:600}}>{payment.beneficiary}</div>
          {payment.bankAccount && (
            <div style={{fontSize:11,color:C.textMuted,marginTop:3,direction:"ltr",textAlign:"right"}}>{payment.bankAccount}</div>
          )}
        </div>
      </div>

      {/* Workflow Timeline */}
      <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:C.textMuted}}>مسیر تأیید</div>
        {payment.workflow.map((step,i)=>{
          const user = USERS.find(u=>u.id===step.assignedTo);
          const isLast = i===payment.workflow.length-1;
          const isCurrent = step.status==="pending" && (i===0 || payment.workflow[i-1].status==="done");
          const dotColor = step.status==="done"?C.success:step.status==="rejected"?C.danger:isCurrent?C.warning:C.border;
          return (
            <div key={i} style={{display:"flex",gap:12,position:"relative",paddingBottom:isLast?0:4}}>
              {!isLast && <div style={{position:"absolute",right:11,top:28,width:2,bottom:0,background:step.status==="done"?C.success:C.border}}/>}
              <div style={{width:24,height:24,borderRadius:"50%",background:step.status==="done"?dotColor:"transparent",border:`2px solid ${dotColor}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,marginTop:2}}>
                {step.status==="done" && <span style={{fontSize:10,color:"#fff",fontWeight:700}}>✓</span>}
                {isCurrent && <div style={{width:8,height:8,borderRadius:"50%",background:C.warning}}/>}
              </div>
              <div style={{flex:1,paddingBottom:isLast?0:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:600,color:step.status==="done"?C.text:isCurrent?C.warning:C.textDim}}>{step.title}</span>
                  <StepBadge status={step.status}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:step.note?4:0}}>
                  <Av user={user} size={18}/>
                  <span style={{fontSize:11,color:C.textMuted}}>{user?.name}</span>
                </div>
                {step.note && <div style={{fontSize:11,color:C.textMuted,background:C.surfaceAlt,borderRadius:6,padding:"5px 8px",marginTop:4,fontStyle:"italic"}}>"{step.note}"</div>}
                {step.time && <div style={{fontSize:10,color:C.textDim,marginTop:3}}>{step.time}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Area - only show to the person whose turn it is */}
      {myStep && (
        <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.warning}44`,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.warning,marginBottom:10}}>نوبت اقدام شماست</div>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>{myStep.title}</div>
          <textarea
            style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14,outline:"none",direction:"rtl",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit",lineHeight:1.7,resize:"none",height:80}}
            placeholder="یادداشت (اختیاری)..."
            value={note} onChange={e=>setNote(e.target.value)}
          />
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{onAction(payment.id,"rejected",myStep.step,note);onBack();}}
              style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:C.danger+"33",color:C.danger,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
              رد درخواست
            </button>
            <button onClick={()=>{onAction(payment.id,"approved",myStep.step,note);onBack();}}
              style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:C.success,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>
              {myStep.role==="treasury"?"ثبت پرداخت ✓":"تأیید می‌کنم ✓"}
            </button>
          </div>
        </div>
      )}

      {/* Treasury special - payment details */}
      {payment.status==="paid" && (
        <div style={{background:C.success+"11",borderRadius:12,padding:14,border:`1px solid ${C.success}33`,textAlign:"center"}}>
          <div style={{fontSize:20,marginBottom:6}}>✓</div>
          <div style={{fontSize:14,fontWeight:700,color:C.success}}>پرداخت انجام شده</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:4}}>
            {payment.workflow.find(w=>w.role==="treasury")?.note}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Payment Form ───
function NewPaymentForm({me, onSave, onClose}) {
  const [form, setForm] = useState({
    type:"پرداخت به تامین‌کننده", desc:"", amount:"", ref:"",
    beneficiary:"", bankAccount:"",
  });
  const [err, setErr] = useState("");

  function submit() {
    if (!form.desc.trim())        { setErr("شرح پرداخت را وارد کنید"); return; }
    if (!form.amount || isNaN(Number(form.amount.replace(/,/g,"")))) { setErr("مبلغ را به درستی وارد کنید"); return; }
    if (!form.beneficiary.trim()) { setErr("نام ذینفع را وارد کنید"); return; }
    const newP = {
      id: Date.now(),
      code: "PAY-" + String(Date.now()).slice(-4),
      type: form.type,
      requesterId: me.id,
      requesterName: me.name,
      amount: Number(form.amount.replace(/,/g,"")),
      desc: form.desc,
      ref: form.ref,
      beneficiary: form.beneficiary,
      bankAccount: form.bankAccount,
      date: "امروز",
      status: "step2",
      attachments: [],
      workflow: makeWorkflow(me.id).map((w,i) => i===0 ? {...w, status:"done", time:nowShamsi(), note:"ثبت شد"} : w),
    };
    onSave(newP);
    onClose();
  }

  const fi = {width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit",WebkitAppearance:"none"};

  return (
    <div style={{position:"fixed",inset:0,background:"#000A",display:"flex",alignItems:"flex-end",zIndex:99}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"20px 20px calc(24px + env(safe-area-inset-bottom))",width:"100%",maxWidth:520,margin:"0 auto",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>درخواست پرداخت جدید</div>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>نوع پرداخت</div>
        <select style={fi} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
          {PAYMENT_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>شرح پرداخت</div>
        <textarea style={{...fi,height:80,resize:"none",lineHeight:1.7}} placeholder="توضیح کامل پرداخت..." defaultValue={form.desc} onBlur={e=>setForm(p=>({...p,desc:e.target.value}))}></textarea>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>مبلغ (تومان)</div>
            <input style={{...fi}} placeholder="مثلاً: ۵۰۰۰۰۰۰" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} type="tel"/>
          </div>
          <div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>شماره مرجع / فاکتور</div>
            <input style={{...fi}} placeholder="اختیاری" value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))}/>
          </div>
        </div>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>ذینفع / گیرنده</div>
        <input style={fi} placeholder="نام شرکت یا شخص" value={form.beneficiary} onChange={e=>setForm(p=>({...p,beneficiary:e.target.value}))}/>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>شماره حساب / شبا (اختیاری)</div>
        <input style={{...fi,direction:"ltr",textAlign:"left"}} placeholder="IR..." value={form.bankAccount} onChange={e=>setForm(p=>({...p,bankAccount:e.target.value}))}/>

        {/* Workflow preview */}
        <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:11,color:C.textDim,marginBottom:8}}>مسیر تأیید این درخواست:</div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",gap:6}}>
            {["شما","اردستانی","سراج‌الدینی","کریم‌لو","سراج‌الدینی","اعرابی"].map((n,i,arr)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:11,background:C.surface,borderRadius:20,padding:"3px 10px",color:C.textMuted}}>{n}</span>
                {i<arr.length-1 && <span style={{color:C.textDim,fontSize:12}}>←</span>}
              </div>
            ))}
          </div>
        </div>

        {err && <div style={{background:C.danger+"22",borderRadius:8,padding:"9px 12px",fontSize:13,color:C.danger,marginBottom:10,textAlign:"center"}}>{err}</div>}

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>انصراف</button>
          <button onClick={submit} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:C.teal,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>ارسال برای تأیید</button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Components (end) ───

function LoginScreen({onLogin}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) { 
      setError("نام کاربری و رمز عبور را وارد کنید"); 
      return; 
    }
    if (loading) return;
    
    setLoading(true); 
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || "نام کاربری یا رمز عبور اشتباه است (یا خطا در ارتباط)");
      }
      
      if (data.user && data.user.id) {
        // پاس دادن توکن و آبجکت کاربر به جای فقط ID
        onLogin(data.user.id, data.token, data.user);
      } else {
        throw new Error("پاسخ سرور نامعتبر است");
      }
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "خطا در اتصال به سرور (بک‌اند در دسترس نیست)" : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f5f5f5", fontFamily: "Tahoma, sans-serif" }}>
      <form onSubmit={handleLogin} style={{ background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "320px", textAlign: "center", direction: "rtl" }}>
        <div style={{ background: "#D4880E", width: "60px", height: "60px", borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "24px", fontWeight: "bold" }}>
          AS
        </div>
        <h2 style={{ margin: "0 0 20px", color: "#333", fontSize: "20px" }}>ورود به سیستم</h2>
        
        {error && <div style={{ background: "#FDECEA", color: "#C94B3F", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "14px" }}>{error}</div>}
        
        <input 
          type="text" 
          placeholder="نام کاربری" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "8px", boxSizing: "border-box", direction: "ltr", outline: "none" }}
        />
        <input 
          type="password" 
          placeholder="رمز عبور" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ccc", borderRadius: "8px", boxSizing: "border-box", direction: "ltr", outline: "none" }}
        />
        
        <button type="submit" disabled={loading} style={{ width: "100%", background: "#D4880E", color: "#fff", padding: "12px", border: "none", borderRadius: "8px", fontSize: "16px", cursor: loading ? "not-allowed" : "pointer", fontWeight: "bold" }}>
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>
    </div>
  );
}


// ─── Sheet Component (bottom-sheet modal) ───
const Sheet = ({title,onClose,children})=>(
  <div style={{position:"fixed",inset:0,background:"#000A",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"20px 20px calc(20px + env(safe-area-inset-bottom))",width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
      <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>{title}</div>
      {children}
    </div>
  </div>
);

export default function App() {
  // ─── AUTH STATE ───
  const [authLoading, setAuthLoading] = useState(true);
  const [creds, setCreds]         = useState(USER_IDENTITIES);
  const [loggedIn, setLoggedIn]   = useState(false);
  // حذف Number() برای پشتیبانی از UUID (رشته)
  const [meId, setMeId]           = useState(null);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [changePinStep, setChangePinStep] = useState("old");
  const [changePinVal, setChangePinVal]   = useState({old:"",new1:"",new2:""});
  const [pinChangeMsg, setPinChangeMsg]   = useState("");

  // Load auth from localStorage and validate
  useEffect(() => {
    const initAuth = () => {
      try {
        // Check for cached session tokens
        const savedToken = localStorage.getItem("az_token");
        const savedUser = localStorage.getItem("az_user");
        const savedMeId = localStorage.getItem("meId");

        // If no tokens found, user is not authenticated
        if (!savedToken || !savedUser) {
          setLoggedIn(false);
          setMeId(null);
          setAuthLoading(false);
          return;
        }

        // Validate user exists in the system
        let parsedUser = null;
        try {
          parsedUser = JSON.parse(savedUser);
        } catch {
          console.error("Invalid user data in localStorage");
          localStorage.removeItem("az_token");
          localStorage.removeItem("az_user");
          setLoggedIn(false);
          setMeId(null);
          setAuthLoading(false);
          return;
        }

        // Verify user exists in USERS list
        const users = Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES : [];
        const matchedUser = users.find(u => u.username === parsedUser.username);
        
        if (matchedUser || parsedUser.id) {
          // User is authenticated - set state
          setLoggedIn(true);
          if (savedMeId) {
            setMeId(savedMeId);
          }
        } else {
          // Invalid user data
          localStorage.removeItem("az_token");
          localStorage.removeItem("az_user");
          setLoggedIn(false);
          setMeId(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoggedIn(false);
        setMeId(null);
      } finally {
        // Ensure loading is always set to false when done
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  // کنسروود کردن رندر تا زمانی که بررسی اولیه Session را انجام ندیم و refresh نکرده باشیم
  if (authLoading) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#131313",color:"#fff",fontFamily:"Tahoma, sans-serif"}}>
        <div style={{fontSize:"18px",marginTop:"16px"}}>در حال بارگذاری...</div>
      </div>
    );
  }

  // خواندن اطلاعات کاربر از API به جای تکیه مطلق بر آرایه استاتیک
  const savedUser = loadLS("az_user", null);
  const matchedUser = savedUser?.username
    ? Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES.find(u => u.username === savedUser.username) : null
    : null;
  const me = matchedUser || savedUser || (meId ? Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES.find(u => String(u.id) === String(meId)) : null : null) || (Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES[0] : null);

  // RBAC Permission Check
  const hasPermission = (key) => {
    // Fallback: اگر هنوز داده‌های نقش و دسترسی از بک‌اند دریافت نشده است (me.permissions وجود ندارد)
    if (!me?.permissions) {
      const isAdmin = [1, 2, 3].includes(me?.id);
      if (key === 'org_chart:view') return true; // همه می‌توانند چارت را ببینند
      if (key === 'org_chart:edit' || key === 'admin_panel:view' || key === 'chat:view' || key === 'payments:view' || key === 'crm:view') return isAdmin; // admin fallback
      return isAdmin;
    }
    // منطق اصلی RBAC پس از اتصال کامل به بک‌اند
    return me?.permissions?.includes(key) || me?.role === 'super_admin';
  };

  // Groups State (4 Default Groups)
  const [groups, setGroups] = useState([
    { id: 'g1', name: 'گروه عمومی', members: [] },
    { id: 'g2', name: 'گروه فروش', members: [] },
    { id: 'g3', name: 'گروه پشتیبانی', members: [] },
    { id: 'g4', name: 'گروه مدیریت', members: [] }
  ]);

  // Contacts State (synced from OrgMembers)
  const [contacts, setContacts] = useState([]);

  // Sync OrgMembers to Contacts
  useEffect(() => {
    if (orgMembers && orgMembers.length > 0) {
      const activeContacts = orgMembers
        .filter(m => m.isActive !== false)
        .map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          avatar: m.avatar || '/default-avatar.png'
        }));
      setContacts(activeContacts);
    }
  }, [orgMembers]);

  const canSeePayment = (p) =>
    [1,2,3].includes(me.id) || // legacy admin check
    p.requesterId === me.id ||
    p.workflow.some(w => w.assignedTo === me.id);

  function saveCreds(newCreds) { setCreds(newCreds); }

  function handleLogout() {
    setLoggedIn(false);
    setMeId(null);
    try { localStorage.clear(); } catch{} // پاک کردن تمام داده‌ها، توکن‌ها و کش‌ها
    window.location.reload(); // ریست کامل stateهای React در حافظه
  }


  // ─── Get manager from org chart ───
  function getManagerId(userId) {
    const member = orgMembers.find(m => m.id === userId && m.active);
    return member?.mgr || null;
  }

  function canApproveRequest(req) {
    // Admins can always approve (legacy: users 1,2,3 or has admin_panel:view permission)
    if ([1, 2, 3].includes(me.id) || hasPermission('admin_panel:view')) return true;
    // Requester cannot approve their own request
    if (req.fromId === me.id) return false;
    // Check if me is in the workflow steps assigned to me
    const myStep = req.workflow?.find(w =>
      w.assignedTo === me.id &&
      w.status === "pending" &&
      (w.step === 1 || req.workflow[w.step-2]?.status === "done")
    );
    return !!myStep;
  }

  // تغییر PIN: غیرفعال — فقط راهنمای تماس با ادمین (بدون ذخیره password در فرانت‌اند)
  function handleChangePIN() {
    setPinChangeMsg("برای تغییر رمز عبور با مدیر سیستم تماس بگیرید");
  }

  // state
  const [tab,setTab]                     = useState("notifs");
  const [channel,setChannel]             = useState("general");
  const [dm,setDm]                       = useState(null);
  const [msgs,setMsgs]                   = useState(()=>loadLS("msgs", INIT_MSGS));
  const [dmMsgs,setDmMsgs]               = useState(()=>loadLS("dmMsgs", {}));
  const [input,setInput]                 = useState("");
  const [pendingFile,setPendingFile]     = useState(null); // فایل آپلود شده در انتظار ارسال
  const [reqs,setReqs]                   = useState(()=>loadLS("reqs", INIT_REQS));
  const [projs,setProjs]                 = useState(()=>loadLS("projs", INIT_PROJECTS));
  const [notifs,setNotifs]               = useState(()=>loadLS("notifs", INIT_NOTIFS));
  const [activeProj,setActiveProj]       = useState(null);
  const [activeTask,setActiveTask]       = useState(null);
  const [sidebar,setSidebar]             = useState(false);
  const [confirm,setConfirm]             = useState(null);
  const [showReqForm,setShowReqForm]     = useState(false);
  const [showProjForm,setShowProjForm]   = useState(false);
  const [showTaskForm,setShowTaskForm]   = useState(false);

  // ─── My Tasks (فاز ۱ — از بک‌اند) ───
  const [apiTasks,setApiTasks]           = useState([]);
  const [apiTasksLoading,setApiTasksLoading] = useState(false);
  const [apiTasksErr,setApiTasksErr]     = useState("");
  const [openApiTask,setOpenApiTask]     = useState(null);   // جزئیات تسک بازشده
  const [apiTaskEv,setApiTaskEv]         = useState([]);     // شواهد تسک بازشده
  const [apiDetailLoading,setApiDetailLoading] = useState(false);
  const [evFormOpen,setEvFormOpen]       = useState(false);  // فرم ثبت شاهد
  const [evForm,setEvForm]               = useState({evidenceType:"TEXT",notes:"",contentUrl:""});
  const [evBusy,setEvBusy]               = useState(false);
  const [evErr,setEvErr]                 = useState("");
  const [blockerOpen,setBlockerOpen]     = useState(false);  // فرم گزارش مانع
  const [blockerDesc,setBlockerDesc]     = useState("");
  const [statusBusy,setStatusBusy]       = useState("");     // id|status در حال تغییر
  const [newReq,setNewReq]               = useState({type:"مرخصی استحقاقی",note:""});
  const [newProj,setNewProj]             = useState({title:"",manager:2,members:[],endDate:"",priority:"medium"});
  const [newTask,setNewTask]             = useState({title:"",desc:"",assignedTo:1,due:"",priority:"medium"});

  // org chart state
  const [orgMembers,setOrgMembers]       = useState(()=>{
    const saved = loadLS("orgMembers", null);
    if (saved) {
      // Sync names and roles from USERS (single source of truth)
      return saved.map(om => {
        const u = USERS.find(x=>x.id===om.id);
        return u ? {...om, name:u.name, role:u.role, av:u.av} : om;
      });
    }
    return ORG_DATA.map(m=>({...m,active:true}));
  });
  const [orgOpen,setOrgOpen]             = useState(new Set([1,2,3,4]));
  const [orgMode,setOrgMode]             = useState("list");
  const [orgCur,setOrgCur]               = useState(null);
  const [orgForm,setOrgForm]             = useState({name:"",role:"",mgr:"1",av:""});

  // payment states
  const [payments, setPayments]         = useState(()=>loadLS("payments", SAMPLE_PAYMENTS));
  const [openPayment, setOpenPayment]   = useState(null);
  const [showPayForm, setShowPayForm]   = useState(false);
  const [payFilter, setPayFilter]       = useState("all");
  const [paySearch, setPaySearch]       = useState("");

  // crm states
  const [customers, setCustomers]       = useState(()=>loadLS("customers", INIT_CUSTOMERS));
  const [crmOrders, setCrmOrders]       = useState(()=>loadLS("crmOrders", INIT_CRM_ORDERS));
  const [activeCust, setActiveCust]     = useState(null);
  const [crmTab, setCrmTab]             = useState("customers");
  const [showCustForm, setShowCustForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [newCust, setNewCust]           = useState({name:"",type:"کارخانه",city:"",phone:"",contact:"",grade:"معمولی",av:""});
  const [newCrmOrder, setNewCrmOrder]   = useState({customerId:"",product:"",qty:"",unit:"تن",amount:"",status:"ثبت",desc:""});
  const [crmSearch, setCrmSearch]       = useState("");
  const [msgSearch, setMsgSearch]         = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  // search & detail states
  const [searchQ, setSearchQ]           = useState("");
  const [openRequest, setOpenRequest]   = useState(null);
  const [openLetterDetail, setOpenLetterDetail] = useState(null);
  const [reqNote, setReqNote]           = useState("");

  // inbox state
  const [letters,setLetters]             = useState(()=>loadLS("letters", INIT_LETTERS));
  const [docs,setDocs]                   = useState(()=>loadLS("docs", INIT_DOCS));
  const [inboxSub,setInboxSub]           = useState("letters"); // letters | docs
  const [openLetter,setOpenLetter]       = useState(null);
  const [showCompose,setShowCompose]     = useState(false);
  const [letterTab,setLetterTab]         = useState("inbox"); // inbox | sent
  const [compose,setCompose]             = useState({to:[],subject:"",body:"",priority:"normal",attachments:[]});
  const [docFilter,setDocFilter]         = useState("همه");

  // ─── Admin CRUD State ───
  const [adminTab,setAdminTab]           = useState("users");
  const [adminUsers,setAdminUsers]       = useState([]);
  const [adminUsersLoading,setAdminUsersLoading] = useState(false);
  const [adminRoles,setAdminRoles]       = useState([]);
  const [adminRolesLoading,setAdminRolesLoading] = useState(false);
  const [adminPermissionsLoading,setAdminPermissionsLoading] = useState(false);
  const [adminGroups,setAdminGroups]     = useState([]);
  const [adminGroupsLoading,setAdminGroupsLoading] = useState(false);

  // Admin Modals
  const [adminUserModal,setAdminUserModal]   = useState(null);
  const [adminUserForm,setAdminUserForm]     = useState({full_name:"",username:"",password:"",role:"",system_role:"user",avatar:""});
  const [adminUserSaving,setAdminUserSaving] = useState(false);
  const [adminUserDeleting,setAdminUserDeleting] = useState(false);

  const [adminRoleModal,setAdminRoleModal]   = useState(null);
  const [adminRoleForm,setAdminRoleForm]     = useState({key:"",title:"",level:10});
  const [adminRoleSaving,setAdminRoleSaving] = useState(false);
  const [adminRoleDeleting,setAdminRoleDeleting] = useState(false);

  const [adminRolePermModal,setAdminRolePermModal] = useState(null);
  const [adminRolePermForm,setAdminRolePermForm]   = useState([]);
  const [adminRolePermSaving,setAdminRolePermSaving] = useState(false);

  const [adminAssignRoleModal,setAdminAssignRoleModal] = useState(null);
  const [adminAssignRoleSaving,setAdminAssignRoleSaving] = useState(false);

  const [adminGroupModal,setAdminGroupModal]   = useState(null);
  const [adminGroupForm,setAdminGroupForm]     = useState({name:"",description:""});
  const [adminGroupSaving,setAdminGroupSaving] = useState(false);
  const [adminGroupDeleting,setAdminGroupDeleting] = useState(false);

  const [adminGroupMembersModal,setAdminGroupMembersModal] = useState(null);

  const [confirmDeleteUser,setConfirmDeleteUser]   = useState(null);
  const [confirmDeleteRole,setConfirmDeleteRole]   = useState(null);
  const [confirmDeleteGroup,setConfirmDeleteGroup] = useState(null);

  const msgEnd = useRef(null);

  // ─── Derived from state (after all useState) ───
  const visiblePayments   = payments.filter(canSeePayment);

  // ─── Persist to localStorage ───
  useEffect(()=>{ saveLS("msgs",       msgs);       }, [msgs]);

  // ─── Browser Notification Permission ───
  useEffect(()=>{
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g  = ctx.createGain();
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.frequency.setValueAtTime(880, ctx.currentTime);
    o1.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    o2.frequency.setValueAtTime(660, ctx.currentTime);
    o2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.4);
    o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.4);
  } catch {}
}

function showBrowserNotif(title, body, icon) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body, icon: icon||'', dir:'rtl', lang:'fa' });
    }
  }

  // ─── Supabase Realtime for messages ───
  useEffect(()=>{
    const ws = supaListen('messages', (payload) => {
      // =========================================
      // لاگ دیباگ — بررسی دریافت رویداد Realtime
      // =========================================
      console.log('>>> REALTIME PAYLOAD:', JSON.stringify(payload, null, 2));
      console.log('>>> eventType:', payload.eventType, '| me.id:', me.id, '| typeof me.id:', typeof me.id);

      // حذف
      if (payload.eventType === 'DELETE') {
        const oldId = payload.old?.id;
        if (oldId) {
          setMsgs(prev => { const r = {}; Object.keys(prev).forEach(k => { r[k] = prev[k].filter(m => m.id !== oldId); }); return r; });
          setDmMsgs(prev => { const r = {}; Object.keys(prev).forEach(k => { r[k] = prev[k].filter(m => m.id !== oldId); }); return r; });
        }
        return;
      }

      const record = payload.new || payload.old;
      if (!record) {
        console.warn('>>> No record in payload');
        return;
      }

      // رد پیام‌های خودی — پیام ارسال‌شده از sendMsg یک بار اضافه می‌شود
      // و Realtime هم دوباره آن را برمی‌گرداند، از duplicate جلوگیری می‌کند
      if (String(record.from_id) === String(me.id)) return;

      if (record.type === 'channel' && record.channel) {
        const newMsg = {
          id: record.id,
          userId: record.from_id,
          text: record.text,
          time: record.created_at ? new Date(record.created_at).toLocaleString('fa-IR') : nowShamsi(),
          fromName: record.from_name,
          file_url: record.file_url || null,
          file_name: record.file_name || null,
          file_type: record.file_type || null,
          file_size: record.file_size || null,
        };
        setMsgs(prev => {
          const ch = record.channel;
          const existing = (prev[ch]||[]);
          if (existing.find(m=>m.id===record.id)) return prev;
          playNotifSound();
          showBrowserNotif(
            `پیام جدید در #${ch}`,
            `${record.from_name}: ${record.text}`,
          );
          setNotifs(prev => [{
            id: Date.now(),
            type:'msg',
            title:`پیام جدید در #${ch}`,
            body:`${record.from_name}: ${record.text}`,
            read:false,
            time:nowShamsi(),
          }, ...prev.slice(0,49)]);
          return {...prev, [ch]: [...existing, newMsg]};
        });
      }

      // مقایسه با String() برای جلوگیری از عدم تطابق number/UUID
      if (record.type === 'dm' && (String(record.from_id) === String(me.id) || String(record.to_id) === String(me.id))) {
        const newMsg = {
          id: record.id,
          userId: record.from_id,
          text: record.text,
          time: record.created_at ? new Date(record.created_at).toLocaleString('fa-IR') : nowShamsi(),
          file_url: record.file_url || null,
          file_name: record.file_name || null,
          file_type: record.file_type || null,
          file_size: record.file_size || null,
        };
        setDmMsgs(prev => {
          const key = String(record.from_id) === String(me.id) ? record.to_id : record.from_id;
          const existing = (prev[key]||[]);
          if (existing.find(m=>m.id===record.id)) return prev;
          playNotifSound();
          showBrowserNotif(
            `پیام از ${record.from_name}`,
            record.text,
          );
          setNotifs(prev => [{
            id: Date.now(),
            type:'dm',
            title:`پیام از ${record.from_name}`,
            body:record.text,
            read:false,
            time:nowShamsi(),
            refId:record.from_id,
          }, ...prev.slice(0,49)]);
          return {...prev, [key]: [...existing, newMsg]};
        });
      }
    });
    return () => ws.close();
  }, [me.id]);
  useEffect(()=>{ saveLS("dmMsgs",     dmMsgs);     }, [dmMsgs]);
  useEffect(()=>{ saveLS("reqs", reqs); }, [reqs]);

  // ─── Load from Supabase on startup ───
  useEffect(()=>{
    // Load requests
    supa('GET','requests','?order=created_at.desc&limit=100').then(data=>{
      if(data&&data.length>0){
        const mapped=data.map(r=>({
          id:r.id, type:r.type, from:r.from_name, fromId:r.from_id,
          detail:r.detail, status:r.status,
          workflow:typeof r.workflow==='string'?JSON.parse(r.workflow):r.workflow||[],
          time:r.created_at?new Date(r.created_at).toLocaleDateString('fa-IR'):nowShamsi(),
        }));
        setReqs(mapped);
      }
    }).catch(()=>{});

    // Load payments
    supa('GET','payments','?order=created_at.desc&limit=100').then(data=>{
      if(data&&data.length>0){
        const mapped=data.map(p=>({
          id:p.id, code:p.code, type:p.type,
          requesterId:p.requester_id, requesterName:p.requester_name,
          amount:p.amount, desc:p.description,
          beneficiary:p.beneficiary, bankAccount:p.bank_account,
          status:p.status,
          workflow:typeof p.workflow==='string'?JSON.parse(p.workflow):p.workflow||[],
          date:p.created_at?new Date(p.created_at).toLocaleDateString('fa-IR'):nowShamsi(),
        }));
        setPayments(mapped);
      }
    }).catch(()=>{});

    // Load CRM customers
    supa('GET','crm_customers','?order=created_at.desc').then(data=>{
      if(data&&data.length>0) setCustomers(data);
    }).catch(()=>{});

    // Load CRM orders
    supa('GET','crm_orders','?order=created_at.desc').then(data=>{
      if(data&&data.length>0) setCrmOrders(data);
    }).catch(()=>{});

  }, []);
  useEffect(()=>{ saveLS("projs",      projs);      }, [projs]);
  useEffect(()=>{ saveLS("notifs",     notifs);     }, [notifs]);
  useEffect(()=>{ saveLS("payments",   payments);   }, [payments]);
  useEffect(()=>{ saveLS("letters",    letters);    }, [letters]);
  useEffect(()=>{ saveLS("docs",       docs);       }, [docs]);
  useEffect(()=>{ saveLS("orgMembers", orgMembers); }, [orgMembers]);
  useEffect(()=>{ saveLS("customers", customers); }, [customers]);
  useEffect(()=>{ saveLS("crmOrders", crmOrders); }, [crmOrders]);
  useEffect(()=>{ try{ if(loggedIn&&meId){ localStorage.setItem("loggedIn","1"); localStorage.setItem("meId",String(meId)); } }catch{} }, [loggedIn,meId]);

  useEffect(()=>{msgEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs,dmMsgs,channel,dm]);

  const unread    = notifs.filter(n=>!n.read).length;
  const pending   = reqs.filter(r=>r.status==="pending").length;
  const myTasks   = me.id ? projs.flatMap(p=>p.tasks).filter(t=>t.assignedTo===me.id&&t.status!=="done") : [];
  const curMsgs   = dm?(dmMsgs[dm]||[]):(msgs[channel]||[]);
  const proj      = activeProj?projs.find(p=>p.id===activeProj)||null:null;
  const taskDet   = (activeTask&&activeTask.pid&&activeTask.tid)?(()=>{try{const p=projs.find(p=>p.id===activeTask.pid);const t=p?.tasks.find(t=>t.id===activeTask.tid);return t?{task:t,project:p}:null;}catch(e){return null;}})():null;
  const orgActive     = orgMembers.filter(m=>m.active);
  const orgInact      = orgMembers.filter(m=>!m.active);
  const activeUserIds = new Set(orgActive.map(m=>m.id));
  let orgRows = []; try { orgRows = buildOrgRows(orgMembers,orgOpen); } catch(e) { orgRows = []; }

  // ─── handlers ───
  function sendMsg() {
    if (!input.trim() && !pendingFile) return;
    const text = input.trim() || (pendingFile ? `📎 ${pendingFile.name}` : '');
    const m = {
      id: Date.now(),
      userId: me.id,
      text: text,
      time: nowShamsi(),
      file_url: pendingFile?.url || null,
      file_name: pendingFile?.name || null,
      file_type: pendingFile?.type || null,
      file_size: pendingFile?.size || null,
    };
    if (dm) setDmMsgs(p=>({...p,[dm]:[...(p[dm]||[]),m]}));
    else setMsgs(p=>({...p,[channel]:[...(p[channel]||[]),m]}));
    // Sync to Supabase realtime — شامل اطلاعات فایل
    supa('POST','messages',{
      type: dm ? 'dm' : 'channel',
      channel: dm ? null : channel,
      from_id: me.id,
      to_id: dm || null,
      from_name: me.name,
      from_avatar: me.avatar,
      text: text,
      file_url: pendingFile?.url || null,
      file_name: pendingFile?.name || null,
      file_type: pendingFile?.type || null,
      file_size: pendingFile?.size || null,
    }).catch(()=>{});
    setInput("");
    setPendingFile(null);
  }

  function approveReq(id,action) {
    const r = reqs.find(x=>x.id===id);
    if (!canApproveRequest(r)) return;
    setConfirm({
      type:action==="approved"?"success":"danger",
      title:action==="approved"?"تأیید درخواست":"رد درخواست",
      message:`درخواست «${r?.type}» از ${r?.from} ${action==="approved"?"تأیید":"رد"} شود؟`,
      confirmLabel:action==="approved"?"بله، تأیید":"بله، رد",
      onConfirm:()=>{
        // Sync to Supabase
        const req = reqs.find(x=>x.id===id);
        if(req) {
          const newWf = (req.workflow||[]).map(w=>w.assignedTo===me.id&&w.status==='pending'?{...w,status:action==='approved'?'done':'rejected',time:nowShamsi()}:w);
          const allDone=newWf.every(w=>w.status==='done');
          const anyRej=newWf.some(w=>w.status==='rejected');
          const newStatus=anyRej?'rejected':allDone?'approved':'pending';
          supa('PATCH','requests',{status:newStatus,workflow:JSON.stringify(newWf)},'?id=eq.'+id).catch(()=>{});
        }
        setReqs(p=>p.map(x=>x.id===id?{...x,status:action,
        workflow:x.workflow?.map(w=>w.assignedTo===me.id&&w.status==="pending"?{...w,status:action==="approved"?"done":"rejected",time:nowShamsi()}:w)
        }:x));
      },
    });
  }

  function updateTask(pid,tid,ns) {
    const p=projs.find(x=>x.id===pid); const t=p?.tasks.find(x=>x.id===tid);
    const lbl={pending:"در انتظار",inprogress:"در جریان",done:"تکمیل"};
    setConfirm({
      type:ns==="done"?"success":"warning",
      title:`تغییر به «${lbl[ns]}»`,
      message:`وظیفه «${t?.title}» به «${lbl[ns]}» تغییر کند؟`,
      confirmLabel:"بله",
      onConfirm:()=>setProjs(ps=>ps.map(p=>p.id!==pid?p:{...p,tasks:p.tasks.map(t=>t.id!==tid?t:{...t,status:ns}),log:[{userId:me.id,text:`"${t?.title}" → ${lbl[ns]}`,time:nowShamsi()},...p.log]})),
    });
  }

  function handlePaymentAction(paymentId, action, stepNum, note) {
    setPayments(ps => ps.map(p => {
      if (p.id !== paymentId) return p;
      const newWf = p.workflow.map(w =>
        w.step !== stepNum ? w : {...w, status:action==="approved"?"done":"rejected", note, time:nowShamsi()}
      );
      const allDone = newWf.every(w=>w.status==="done");
      const anyRej  = newWf.some(w=>w.status==="rejected");
      const cur     = newWf.filter(w=>w.status==="done").length + 1;
      return {...p, workflow:newWf, status:anyRej?"rejected":allDone?"paid":`step${cur}`};
    }));
  }

  // ─── Admin CRUD Functions ───

  // Admin Fetch Functions
  async function adminFetchUsers() {
    setAdminUsersLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('خطا در بارگذاری کاربران');
      const data = await res.json();
      setAdminUsers(data.users || []);
    } catch (e) { console.error(e); alert(e.message); }
    finally { setAdminUsersLoading(false); }
  }

  async function adminFetchRoles() {
    setAdminRolesLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/roles`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('خطا در بارگذاری نقش‌ها');
      const data = await res.json();
      setAdminRoles(data.roles || []);
    } catch (e) { console.error(e); alert(e.message); }
    finally { setAdminRolesLoading(false); }
  }

  async function adminFetchGroups() {
    setAdminGroupsLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('خطا در بارگذاری گروه‌ها');
      const data = await res.json();
      setAdminGroups(data.groups || []);
    } catch (e) { console.error(e); alert(e.message); }
    finally { setAdminGroupsLoading(false); }
  }

  // --- Admin User CRUD ---
  function openUserModal(user) {
    if (user) {
      setAdminUserModal(user);
      setAdminUserForm({
        full_name: user.full_name || '',
        username: user.username || '',
        password: '',
        role: user.role || '',
        system_role: user.system_role || 'user',
        avatar: user.avatar || ''
      });
    } else {
      setAdminUserModal({ id: null });
      setAdminUserForm({ full_name: '', username: '', password: '', role: '', system_role: 'user', avatar: '' });
    }
  }

  async function saveAdminUser() {
    setAdminUserSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const isEdit = !!adminUserModal.id;
      const url = isEdit ? `${API_BASE}/api/users` : `${API_BASE}/api/users`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const body = { ...adminUserForm };
      if (isEdit) body.id = adminUserModal.id;
      if (!body.password) delete body.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ذخیره');
      }
      await adminFetchUsers();
      setAdminUserModal(null);
    } catch (e) { alert(e.message); }
    finally { setAdminUserSaving(false); }
  }

  async function deleteUser() {
    setAdminUserDeleting(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: confirmDeleteUser.id })
      });
      if (!res.ok) throw new Error('خطا در حذف');
      await adminFetchUsers();
      setConfirmDeleteUser(null);
    } catch (e) { alert(e.message); }
    finally { setAdminUserDeleting(false); }
  }

  // --- Admin Role CRUD ---
  function openRoleModal(role) {
    if (role) {
      setAdminRoleModal(role);
      setAdminRoleForm({ key: role.key, title: role.title, level: role.level });
    } else {
      setAdminRoleModal({ id: null });
      setAdminRoleForm({ key: '', title: '', level: 10 });
    }
  }

  async function saveAdminRole() {
    setAdminRoleSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const isEdit = !!adminRoleModal.id;
      const url = isEdit ? `${API_BASE}/api/roles/${adminRoleModal.id}` : `${API_BASE}/api/roles`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(adminRoleForm)
      });
      if (!res.ok) throw new Error('خطا در ذخیره نقش');
      await adminFetchRoles();
      setAdminRoleModal(null);
    } catch (e) { alert(e.message); }
    finally { setAdminRoleSaving(false); }
  }

  async function deleteRole() {
    setAdminRoleDeleting(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/roles/${confirmDeleteRole.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('خطا در حذف');
      await adminFetchRoles();
      setConfirmDeleteRole(null);
    } catch (e) { alert(e.message); }
    finally { setAdminRoleDeleting(false); }
  }

  // --- Role Permissions ---
  async function openRolePermissions(role) {
    setAdminRolePermModal(role);
    setAdminPermissionsLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/role-permissions/role/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAdminRolePermForm(data.permissions?.map(p => p.permission_key) || []);
    } catch (e) { console.error(e); }
    finally { setAdminPermissionsLoading(false); }
  }

  async function togglePermission(roleId, permKey, currentlyHas) {
    const token = localStorage.getItem('az_token');
    const url = `${API_BASE}/api/role-permissions${currentlyHas ? `/role/${roleId}/${permKey}` : ''}`;
    const method = currentlyHas ? 'DELETE' : 'POST';
    const body = currentlyHas ? null : { role_id: roleId, permission_key: permKey };
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) throw new Error('خطا در تغییر دسترسی');
    
    // Update matrix table state (adminRoles) for instant visual feedback
    setAdminRoles(prev => prev.map(role =>
      role.id === roleId
        ? { ...role, permissions: currentlyHas
            ? (role.permissions||[]).filter(p => p !== permKey)
            : [...(role.permissions||[]), permKey]
          }
        : role
    ));
    // Update modal state if open
    setAdminRolePermForm(f => currentlyHas ? f.filter(p => p !== permKey) : [...f, permKey]);
  }

  // --- Save Role Permissions (modal) ---
  async function saveRolePermissions() {
    if (!adminRolePermModal) return;
    setAdminRolePermSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const roleId = adminRolePermModal.id;
      const currentRole = adminRoles.find(r => r.id === roleId);
      const currentPerms = currentRole?.permissions || [];
      const desiredPerms = adminRolePermForm;

      const toAdd = desiredPerms.filter(p => !currentPerms.includes(p));
      const toRemove = currentPerms.filter(p => !desiredPerms.includes(p));

      for (const pk of toRemove) {
        const r = await fetch(`${API_BASE}/api/role-permissions/role/${roleId}/${pk}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!r.ok) throw new Error('خطا در حذف دسترسی');
      }
      for (const pk of toAdd) {
        const r = await fetch(`${API_BASE}/api/role-permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role_id: roleId, permission_key: pk })
        });
        if (!r.ok) throw new Error('خطا در افزودن دسترسی');
      }

      // Update matrix state
      setAdminRoles(prev => prev.map(role =>
        role.id === roleId ? { ...role, permissions: desiredPerms } : role
      ));
      setAdminRolePermModal(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setAdminRolePermSaving(false);
    }
  }

  // --- Assign Roles to User ---
  async function openAssignRoleModal(user) {
    setAdminAssignRoleModal({
      id: user.id,
      name: user.full_name || user.name,
      assignedRoles: []
    });
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/users/${user.id}/roles`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAdminAssignRoleModal(f => ({ ...f, assignedRoles: data.roles?.map(r => r.role_id) || [] }));
    } catch (e) { console.error(e); }
  }

  async function saveUserRoles() {
    setAdminAssignRoleSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      // Remove all current roles
      await fetch(`${API_BASE}/api/users/${adminAssignRoleModal.id}/roles`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Add new roles
      for (const roleId of adminAssignRoleModal.assignedRoles) {
        await fetch(`${API_BASE}/api/users/${adminAssignRoleModal.id}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role_id: roleId })
        });
      }
      await adminFetchUsers();
      setAdminAssignRoleModal(null);
    } catch (e) { alert(e.message); }
    finally { setAdminAssignRoleSaving(false); }
  }

  // --- Group CRUD ---
  function openGroupModal(group) {
    if (group) {
      setAdminGroupModal(group);
      setAdminGroupForm({ name: group.name, description: group.description || '' });
    } else {
      setAdminGroupModal({ id: null });
      setAdminGroupForm({ name: '', description: '' });
    }
  }

  async function saveAdminGroup() {
    setAdminGroupSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const isEdit = !!adminGroupModal.id;
      const url = isEdit ? `${API_BASE}/api/groups/${adminGroupModal.id}` : `${API_BASE}/api/groups`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(adminGroupForm)
      });
      if (!res.ok) throw new Error('خطا در ذخیره گروه');
      await adminFetchGroups();
      setAdminGroupModal(null);
      setAdminGroupForm({ name: '', description: '' });
    } catch (e) { alert(e.message); }
    finally { setAdminGroupSaving(false); }
  }

  async function deleteGroup() {
    setAdminGroupDeleting(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/groups/${confirmDeleteGroup.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('خطا در حذف');
      await adminFetchGroups();
      setConfirmDeleteGroup(null);
    } catch (e) { alert(e.message); }
    finally { setAdminGroupDeleting(false); }
  }

  async function openGroupMembers(group) {
    setAdminGroupMembersModal({
      id: group.id,
      name: group.name,
      members: group.members || [],
      available: adminUsers.filter(u => !group.members?.some(m => m.id === u.id)) || []
    });
  }

  async function addGroupMember(userId) {
    setAdminGroupMembersModal(f => {
      const user = adminUsers.find(u => u.id === userId);
      if (!user || f.members.some(m => m.id === userId)) return f;
      return { ...f, members: [...f.members, user], available: f.available.filter(u => u.id !== userId) };
    });
  }

  async function removeGroupMember(userId) {
    setAdminGroupMembersModal(f => {
      const user = f.members.find(m => m.id === userId);
      return { ...f, members: f.members.filter(m => m.id !== userId), available: [...f.available, user] };
    });
  }

  // Handle admin tab change
  function handleAdminTabChange(tab) {
    setAdminTab(tab);
    if (tab === 'users') adminFetchUsers();
    else if (tab === 'roles') adminFetchRoles();
    else if (tab === 'permissions') adminFetchRoles();
    else if (tab === 'groups') adminFetchGroups();
  }

  function addNotif(uid,type,pid,tid,title,desc) {
    setNotifs(ns=>[{id:Date.now(),type,projectId:pid,taskId:tid,title,desc,time:nowShamsi(),read:false},...ns]);
  }

  function submitReq() {
    // Sync to Supabase
    supa('POST','requests',{type:newReq.type,from_id:me.id,from_name:me.name,detail:newReq.note,status:'pending',workflow:JSON.stringify([])}).catch(()=>{});
    // Save to Supabase
    supa('POST','requests',{
      type:newReq.type, from_id:me.id, from_name:me.name,
      detail:newReq.note, status:'pending', workflow:JSON.stringify(wf||[])
    }).catch(()=>{});
    setReqs(p=>[{id:Date.now(),type:newReq.type,from:me.name,fromId:me.id,detail:newReq.note,status:"pending",time:nowShamsi(),workflow:wf},...p]);
    setShowReqForm(false); setNewReq({type:"مرخصی استحقاقی",note:""});
  }

  function submitProj() {
    if (!newProj.title.trim()) return;
    const p={id:Date.now(),title:newProj.title,manager:Number(newProj.manager),startDate:"امروز",endDate:newProj.endDate||"نامشخص",status:"pending",priority:newProj.priority,members:newProj.members.map(Number),tasks:[],log:[{userId:me.id,text:"پروژه ایجاد شد",time:nowShamsi()}]};
    setProjs(ps=>[p,...ps]);
    setShowProjForm(false); setNewProj({title:"",manager:2,members:[],endDate:"",priority:"medium"});
  }

  function submitTask() {
    if (!newTask.title.trim()||!showTaskForm) return;
    const pid=showTaskForm; const p=projs.find(x=>x.id===pid);
    const t={id:Date.now(),title:newTask.title,desc:newTask.desc,assignedTo:Number(newTask.assignedTo),due:newTask.due||"نامشخص",status:"pending",priority:newTask.priority};
    setProjs(ps=>ps.map(x=>x.id!==pid?x:{...x,tasks:[...x.tasks,t],log:[{userId:me.id,text:`وظیفه "${newTask.title}" به ${USERS.find(u=>u.id===Number(newTask.assignedTo))?.lastName} سپرده شد`,time:nowShamsi()},...x.log]}));
    addNotif(Number(newTask.assignedTo),"task",pid,t.id,`وظیفه جدید: ${newTask.title}`,`پروژه: ${p?.title}`);
    setShowTaskForm(false); setNewTask({title:"",desc:"",assignedTo:1,due:"",priority:"medium"});
  }

  // ─── My Tasks: دریافت و اقدام روی تسک‌های بک‌اند (فاز ۱) ───
  async function loadMyApiTasks(){
    const uid=me?.id||meId; const token=localStorage.getItem("az_token");
    if(!uid||!token||!loggedIn) return;
    setApiTasksLoading(true); setApiTasksErr("");
    try{
      const res=await fetch(`${API_BASE}/api/tasks?assigneeId=${encodeURIComponent(uid)}`,{headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      const data=await res.json();
      setApiTasks(Array.isArray(data)?data:[]);
    }catch(e){ setApiTasksErr(e.message||"خطا در دریافت تسک‌ها"); }
    finally{ setApiTasksLoading(false); }
  }
  useEffect(()=>{ loadMyApiTasks(); },[loggedIn,meId,me?.id]);

  async function openApiTaskDetail(id){
    const token=localStorage.getItem("az_token"); if(!token) return;
    setOpenApiTask({id}); setApiTaskEv([]); setApiDetailLoading(true);
    try{
      const res=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      const d=await res.json();
      setOpenApiTask(d.task||d); setApiTaskEv(Array.isArray(d.evidences)?d.evidences:[]);
    }catch(e){ alert(e.message||"خطا در دریافت جزئیات تسک"); setOpenApiTask(null); }
    finally{ setApiDetailLoading(false); }
  }
  async function setApiTaskStatus(id,newStatus){
    if(statusBusy) return;
    const token=localStorage.getItem("az_token"); if(!token) return;
    setStatusBusy(`${id}|${newStatus}`);
    try{
      const res=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({newStatus,actorId:me?.id||meId})});
      if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      if(openApiTask?.id===id) openApiTaskDetail(id);
      loadMyApiTasks();
    }catch(e){ alert(e.message||"خطا در تغییر وضعیت"); }
    finally{ setStatusBusy(""); }
  }
  async function submitEvidence(){
    if(evBusy||!openApiTask?.id) return;
    if(!evForm.notes.trim()&&!evForm.contentUrl.trim()){ setEvErr("توضیحات یا لینک شاهد را وارد کنید"); return; }
    const token=localStorage.getItem("az_token"); if(!token) return;
    const id=openApiTask.id; setEvBusy(true); setEvErr("");
    try{
      const body={evidenceType:evForm.evidenceType,notes:evForm.notes.trim()||undefined,contentUrl:evForm.contentUrl.trim()||undefined,submittedBy:me?.id||meId};
      const r1=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/evidence`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
      if(!r1.ok){ const e=await r1.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r1.status}`); }
      // انتقال خودکار به PENDING_REVIEW (بک‌اند فقط با وجود شاهد می‌پذیرد)
      const r2=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({newStatus:"PENDING_REVIEW",actorId:me?.id||meId})});
      if(!r2.ok){ const e=await r2.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r2.status}`); }
      setEvFormOpen(false); setEvForm({evidenceType:"TEXT",notes:"",contentUrl:""});
      openApiTaskDetail(id); loadMyApiTasks();
    }catch(e){ setEvErr(e.message||"خطا در ثبت شاهد"); }
    finally{ setEvBusy(false); }
  }
  async function submitBlocker(){
    if(evBusy||!openApiTask?.id) return;
    if(!blockerDesc.trim()){ setEvErr("شرح مانع را وارد کنید"); return; }
    const token=localStorage.getItem("az_token"); if(!token) return;
    const id=openApiTask.id; setEvBusy(true); setEvErr("");
    try{
      const r1=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/evidence`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({evidenceType:"BLOCKER",notes:blockerDesc.trim(),submittedBy:me?.id||meId})});
      if(!r1.ok){ const e=await r1.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r1.status}`); }
      const r2=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({newStatus:"BLOCKED",actorId:me?.id||meId})});
      if(!r2.ok){ const e=await r2.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r2.status}`); }
      setBlockerOpen(false); setBlockerDesc("");
      openApiTaskDetail(id); loadMyApiTasks();
    }catch(e){ setEvErr(e.message||"خطا در ثبت مانع"); }
    finally{ setEvBusy(false); }
  }

  // org handlers
  function orgToggle(id){ setOrgOpen(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;}); }
  function orgEdit(m){ setOrgCur(m);setOrgForm({name:m.name,role:m.role,mgr:String(m.mgr??""),av:m.av});setOrgMode("edit"); }
  function orgSave(){ setOrgMembers(p=>p.map(m=>m.id!==orgCur.id?m:{...m,name:orgForm.name,role:orgForm.role,mgr:orgForm.mgr===""?null:Number(orgForm.mgr),av:orgForm.av||orgForm.name[0]||"؟"}));setOrgMode("list"); }
  function orgDeact(){ setOrgMembers(p=>p.map(m=>{if(m.id===orgCur.id)return{...m,active:false};if(m.mgr===orgCur.id)return{...m,mgr:orgCur.mgr};return m;}));setOrgMode("list"); }
  function orgReact(id){ setOrgMembers(p=>p.map(m=>m.id===id?{...m,active:true}:m)); }
  function orgAdd(){ if(!orgForm.name.trim())return;const nid=Math.max(...orgMembers.map(m=>m.id))+1;setOrgMembers(p=>[...p,{id:nid,name:orgForm.name,role:orgForm.role,mgr:Number(orgForm.mgr)||1,av:orgForm.av||orgForm.name[0]||"؟",active:true}]);setOrgOpen(p=>new Set([...p,Number(orgForm.mgr)||1]));setOrgMode("list"); }

  // ─── styles ───
  const card = {background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:8};
  const btn  = v=>({padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,WebkitTapHighlightColor:"transparent",fontFamily:"inherit",background:v==="p"?C.teal:v==="s"?C.success:v==="d"?C.danger+"33":C.surfaceAlt,color:v==="g"?C.textMuted:v==="d"?C.danger:"#fff"});
  const fi   = {width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:16,outline:"none",direction:"rtl",textAlign:"right",boxSizing:"border-box",marginBottom:12,WebkitAppearance:"none",fontFamily:"inherit",lineHeight:1.8,WebkitUserSelect:"text",userSelect:"text"};
  const lbl  = t=><div style={{fontSize:12,color:C.textMuted,marginBottom:5}}>{t}</div>;

  let topTitle="آذرمهر صنعت", onBack=null;
  if (taskDet){topTitle=taskDet.task.title;onBack=()=>setActiveTask(null);}
  else if (proj){topTitle=proj.title;onBack=()=>setActiveProj(null);}

  const TABS=[
    {id:"notifs",  Icon:Icons.Bell,   badge:unread,         label:"اعلان‌ها"},
    {id:"chat",    Icon:Icons.Chat,   badge:0,              label:"چت"},
    {id:"projects",Icon:Icons.Folder, badge:0,              label:"پروژه‌ها"},
    {id:"tasks",   Icon:Icons.Check,  badge:apiTasks.filter(t=>t.status!=="APPROVED"&&t.status!=="REJECTED").length, label:"وظایف"},
    {id:"crm",      Icon:Icons.CRM,    badge:0, label:"CRM"},
    {id:"payments", Icon:Icons.Pay,    badge:visiblePayments.filter(p=>p.workflow.some(w=>w.assignedTo===me.id&&w.status==="pending"&&(w.step===1||p.workflow[w.step-2]?.status==="done"))).length, label:"پرداخت"},
  ];

  if (!loggedIn) {
    return <LoginScreen onLogin={(id, token, userObj)=>{ setMeId(id); setLoggedIn(true); try{ localStorage.setItem("loggedIn","1"); localStorage.setItem("meId",String(id)); if (token) localStorage.setItem("az_token",token); if (userObj) localStorage.setItem("az_user",JSON.stringify(userObj)); }catch{} }}/>;
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:C.bg,color:C.text,fontFamily:"'Vazirmatn','Segoe UI',sans-serif",direction:"rtl",overflow:"hidden",paddingTop:"env(safe-area-inset-top)"}}>

      {/* Topbar */}
      <div style={{height:58,display:"flex",alignItems:"center",padding:"0 14px",background:C.surface,flexShrink:0,borderBottom:`1px solid ${C.border}`}}>

        {!onBack&&<>
          {/* همبرگر — چسبیده به لبه راست */}
          <button onClick={()=>setSidebar(p=>!p)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="5" x2="16" y2="5"/><line x1="2" y1="11" x2="16" y2="11"/><line x1="2" y1="17" x2="16" y2="17"/></svg>
          </button>

          {/* آواتار — فاصله از همبرگر با margin */}
          <div style={{marginLeft:6}}>
            <Av user={{...me,online:true}} size={36}/>
          </div>

          {/* نام و سمت */}
          <div style={{textAlign:"right",margin:"0 8px"}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3}}>{me.lastName||me.name.split(" ").pop()}</div>
            <div style={{fontSize:11,color:C.teal,lineHeight:1.3}}>{me.role}</div>
          </div>

          <div style={{flex:1}}/>

          <span style={{fontSize:15,fontWeight:700,color:C.text,marginLeft:12,fontFamily:"Arial,sans-serif",whiteSpace:"nowrap"}}>AMS-Group</span>
          <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMy4xLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAxNTk3LjA5IDEyNTYuNzMiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDE1OTcuMDkgMTI1Ni43MzsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6I0QxRDNENDt9DQoJLnN0MXtmaWxsOiNGREI5MTM7fQ0KPC9zdHlsZT4NCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zMi4xMiw4MDAuNTVjNS41MSwzNy43OCwyMy42MSw3MS43OSw1Mi4wMiwxMDEuNDJjMjQuNjMsMjUuNjgsNTcuMDIsNDguMDMsOTUuNyw2Ni41OA0KCWMxMjQuOTUsNTkuOTUsMzE1LjUzLDgwLjI3LDUyMS45OCw0NS4xYzE2MS4wMi0yNy40MSwzMDMuMTQtODMuNzIsNDA2LjE5LTE1My45M2MxNS40NS0xMC41Myw0Ljk0LTM3LjA4LTEyLjQzLTMxLjQ2DQoJYy02Ny41MSwyMS44NC0xNDIuMzYsNDAuMzEtMjIxLjcxLDUzLjgzYy0zMDIuMDEsNTEuNDUtNTYyLjMzLDEzLjIzLTYwOC40Mi04NC45MmMtMC40Mi0wLjkxLTAuODItMS44MS0xLjItMi43Mg0KCWMtMi41NS01Ljk1LTQuMzEtMTIuMTMtNS4yMy0xOC41M2MtMTYuNjUtMTEzLjY0LDIzMS42My0yNTAuMzcsNTU0LjU3LTMwNS4zNmMxMTAuMzktMTguOCwyMTUuMjEtMjUuNjIsMzA2LjA4LTIxLjg4DQoJYy0xMTEuNzQtNDMuMjgtMjQ1Ljc3LTY4LjUyLTM4OS44OC02OC41MmMtMTA0LjI1LDAtMjAzLjIyLDEzLjIxLTI5Mi4zLDM2LjkxQzE4My4wNSw0OTkuNzEsMTAuNzksNjU0Ljk0LDMyLjEyLDgwMC41NSIvPg0KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ3MS4wMiwxMTM3LjJjMTExLjcyLDQzLjI4LDI0NS43LDY4LjQ4LDM4OS43Nyw2OC40OGMxMDQuNDIsMCwyMDMuNTYtMTMuMjMsMjkyLjc0LTM3LjAyDQoJYzI1NC4yMS04Mi43LDQyNi4yMi0yMzcuODUsNDA0Ljg4LTM4My4zOGMtNS41MS0zNy43NS0yMy42MS03MS43OS01Mi4wMi0xMDEuMzhjLTI0LjYxLTI1LjY4LTU3LTQ4LjA1LTk1LjY2LTY2LjYyDQoJYy0xMjQuOTctNTkuOTUtMzE1LjUxLTgwLjI4LTUyMi00NS4xYy0xNjAuOTksMjcuNDMtMzAzLjE0LDgzLjcyLTQwNi4xNywxNTMuOTVjLTE1LjQ1LDEwLjUxLTQuOTYsMzcuMDYsMTIuNDEsMzEuNDQNCgljNjcuNTMtMjEuODQsMTQyLjM4LTQwLjI5LDIyMS43My01My44MWMzMDItNTEuNDUsNTYyLjMzLTEzLjIxLDYwOC40NCw4NC45YzAuNCwwLjkxLDAuNzgsMS44MSwxLjE4LDIuNzINCgljMi41Myw1Ljk3LDQuMywxMi4xNiw1LjIzLDE4LjUzYzE2LjY1LDExMy42NC0yMzEuNjMsMjUwLjM3LTU1NC41NywzMDUuMzhDNjY2LjYzLDExMzQuMSw1NjEuODMsMTE0MC45MSw0NzEuMDIsMTEzNy4yIi8+DQo8cGF0aCBjbGFzcz0ic3QxIiBkPSJNOTU4LjUyLDE4MC4zMWMwLDc4LjEtNjMuMzMsMTQxLjQzLTE0MS40MywxNDEuNDNzLTE0MS40My02My4zMy0xNDEuNDMtMTQxLjQzUzczOC45OSwzOC44OCw4MTcuMDksMzguODgNCglDODk1LjE5LDM4Ljg4LDk1OC41MiwxMDIuMjEsOTU4LjUyLDE4MC4zMSIvPg0KPC9zdmc+DQo=" alt="" style={{height:35,objectFit:"contain",flexShrink:0,marginLeft:14}}/>
        </>}

        {onBack&&<>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}>
            <Icons.Back/>
          </button>
          {taskDet&&<Av user={USERS.find(u=>u.id===taskDet.task.assignedTo)} size={34}/>}
          {proj&&!taskDet&&<Av user={USERS.find(u=>u.id===proj.manager)} size={34}/>}
          <div style={{flex:1,overflow:"hidden",marginRight:8}}>
            <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topTitle}</div>
            {proj&&!taskDet&&<div style={{fontSize:11,color:C.textDim}}>{proj.tasks.filter(t=>t.status==="done").length}/{proj.tasks.length} تکمیل</div>}
          </div>
          {taskDet&&<Badge status={taskDet.task.status}/>}
        </>}

      </div>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative"}}>

        {/* Drawer Overlay */}
        <div onClick={()=>setSidebar(false)} style={{display:sidebar?"block":"none",position:"absolute",inset:0,background:"#000A",zIndex:10}}/>

        {/* Drawer */}
        <div style={{position:"absolute",top:0,right:0,bottom:0,width:280,background:C.surface,overflowY:"auto",WebkitOverflowScrolling:"touch",zIndex:20,transform:sidebar?"translateX(0)":"translateX(100%)",transition:"transform 0.25s ease",zIndex:11,display:"flex",flexDirection:"column"}}>

          {/* Profile */}
          <div style={{background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)",padding:"36px 20px 20px",flexShrink:0}}>
            <img src={LOGO_ICON} alt="" style={{height:50,objectFit:"contain",marginBottom:12,filter:"brightness(1.2)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:"rgba(253,185,19,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",border:"2px solid rgba(253,185,19,0.4)",flexShrink:0}}>
                {me.av}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{me.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:1}}>{me.role}</div>
              </div>
            </div>
          </div>

          {/* Section: Channels */}
          <DrawerSection title="کانال‌ها">
            {CHANNELS.map(ch=>(
              <DrawerItem key={ch.id}
                icon={<div style={{width:34,height:34,borderRadius:"50%",background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.textDim}}>#</div>}
                label={ch.name}
                active={tab==="chat"&&!dm&&channel===ch.id}
                onClick={()=>{setTab("chat");setDm(null);setChannel(ch.id);setSidebar(false);}}
              />
            ))}
          </DrawerSection>

          {/* Section: Direct Messages - collapsed by default */}
          <DrawerCollapsible title="پیام مستقیم" defaultOpen={true} count={USERS.length-1}>
            {USERS.filter(u=>u.id!==me.id&&activeUserIds.has(u.id)).map(u=>(
              <DrawerItem key={u.id}
                icon={<Av user={u} size={34}/>}
                label={u.name.split(' ').pop()}
                sub={u.role}
                active={tab==="chat"&&dm===u.id}
                online={u.online}
                onClick={()=>{setTab("chat");setDm(u.id);setSidebar(false);}}
              />
            ))}
          </DrawerCollapsible>

          {/* Section: Tools */}
          <DrawerSection title="ابزارها">
            <DrawerItem icon="📋" label="درخواست‌ها" badge={pending} onClick={()=>{setTab("requests");setSidebar(false);}}/>
            <DrawerItem icon="📬" label="کارتابل" badge={letters.filter(l=>l.status==="inbox"&&!l.read).length} onClick={()=>{setTab("inbox");setSidebar(false);}}/>
            {hasPermission('org_chart:view') && (
              <DrawerItem icon="🏢" label="چارت سازمانی" onClick={()=>{setTab("org");setSidebar(false);}}/>
            )}
            {hasPermission('admin_panel:view') && (
              <DrawerItem icon="📊" label="پنل مدیریت" onClick={()=>{setTab("admin");setSidebar(false);}}/>
            )}
            {hasPermission('payments:view') && (
              <DrawerItem icon="💳" label="تنخواه‌یار" sub="مدیریت تنخواه‌ها و هزینه‌ها" active={tab === "tankhah"} onClick={()=>{setTab("tankhah");setSidebar(false);}}/>
            )}
          </DrawerSection>

          {/* Section: Account */}
          <DrawerSection title="حساب کاربری">
            <DrawerItem icon="🔑" label="تغییر رمز عبور" onClick={()=>{setSidebar(false);setShowChangePIN(true);}}/>
            <DrawerItem icon="🚪" label="خروج" danger onClick={handleLogout}/>
          </DrawerSection>

          <div style={{height:"env(safe-area-inset-bottom)",minHeight:16}}/>
        </div>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",width:"100%"}}>

          {/* ─── TASK DETAIL ─── */}
          {taskDet?(
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16}}>
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}><Badge status={taskDet.task.priority}/><Badge status={taskDet.task.status}/><span style={{fontSize:11,color:C.textDim,alignSelf:"center"}}>پروژه: {taskDet.project.title}</span></div>
              <div style={{...card,display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <Av user={USERS.find(u=>u.id===taskDet.task.assignedTo)} size={42}/>
                <div><div style={{fontSize:11,color:C.textDim}}>مسئول اجرا</div><div style={{fontSize:15,fontWeight:700}}>{USERS.find(u=>u.id===taskDet.task.assignedTo)?.name}</div><div style={{fontSize:12,color:C.textMuted}}>{USERS.find(u=>u.id===taskDet.task.assignedTo)?.role}</div></div>
              </div>
              <div style={{...card,marginBottom:16}}>
                <div style={{fontSize:12,color:C.teal,fontWeight:700,marginBottom:8,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>شرح وظیفه</div>
                <div style={{fontSize:14,lineHeight:1.9}}>{taskDet.task.desc||"توضیحاتی ثبت نشده."}</div>
              </div>
              {taskDet.task.status!=="done"?(
                <div style={{display:"flex",gap:10}}>
                  {taskDet.task.status==="pending"&&<button style={{...btn("g"),flex:1,padding:"13px",border:`1px solid ${C.border}`}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"inprogress")}>شروع</button>}
                  {taskDet.task.status==="inprogress"&&<><button style={{...btn("g"),flex:1,padding:"13px",border:`1px solid ${C.warning+"55"}`,color:C.warning}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"pending")}>بازگشت</button><button style={{...btn("s"),flex:2,padding:"13px"}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"done")}>تکمیل</button></>}
                </div>
              ):(
                <div style={{textAlign:"center"}}>
                  <div style={{color:C.success,fontSize:14,fontWeight:600,marginBottom:10}}>تکمیل شده</div>
                  <button style={{...btn("g"),fontSize:12,color:C.warning,border:`1px solid ${C.warning+"44"}`}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"inprogress")}>بازگشت به «در جریان»</button>
                </div>
              )}
            </div>

          /* ─── PROJECT DETAIL ─── */
          ):proj?(
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14}}>
              <div style={{...card,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><Av user={USERS.find(u=>u.id===proj.manager)} size={30}/><div><div style={{fontSize:11,color:C.textDim}}>مدیر</div><div style={{fontSize:13,fontWeight:600}}>{USERS.find(u=>u.id===proj.manager)?.name}</div></div></div>
                  <Badge status={proj.status}/>
                </div>
                <div style={{display:"flex",gap:14,fontSize:12,color:C.textMuted,marginBottom:12}}><span>شروع: {proj.startDate}</span><span>پایان: {proj.endDate}</span></div>
                <Progress tasks={proj.tasks}/>
                <div style={{display:"flex",gap:4,marginTop:10,flexWrap:"wrap"}}>{proj.members.map(uid=>{const u=USERS.find(x=>x.id===uid);return u?<div key={uid} style={{display:"flex",alignItems:"center",gap:4,background:C.bg,borderRadius:20,padding:"3px 8px 3px 4px",fontSize:11,color:C.textMuted}}><Av user={u} size={18}/>{u.lastName}</div>:null;})}</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontWeight:700,fontSize:14}}>وظایف</span>
                <button style={btn("p")} onClick={()=>setShowTaskForm(proj.id)}>افزودن</button>
              </div>
              {["pending","inprogress","done"].map(st=>{
                const grp=proj.tasks.filter(t=>t.status===st);
                if(!grp.length) return null;
                const lbs={pending:"در انتظار",inprogress:"در جریان",done:"تکمیل"};
                return <div key={st} style={{marginBottom:16}}><div style={{fontSize:10,color:C.textDim,fontWeight:700,marginBottom:6}}>{lbs[st]}</div>{grp.map(t=>{const a=USERS.find(u=>u.id===t.assignedTo);return(<div key={t.id} style={{...card,opacity:t.status==="done"?0.55:1,cursor:"pointer",marginBottom:8}} onClick={()=>setActiveTask({pid:proj.id,tid:t.id})}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,flex:1,marginLeft:8}}>{t.title}</span><Badge status={t.priority}/></div>{t.desc&&<div style={{fontSize:12,color:C.textDim,marginBottom:6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{t.desc}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:6}}><Av user={a} size={20}/><span style={{fontSize:11,color:C.textMuted}}>{a?.lastName}</span><span style={{fontSize:11,color:C.textDim}}>· {t.due}</span></div><span style={{fontSize:11,color:C.teal}}>جزئیات</span></div></div>);})}</div>;
              })}
              <div style={{marginTop:8}}>
                <div style={{fontSize:12,color:C.textDim,fontWeight:700,marginBottom:10}}>تاریخچه</div>
                {proj.log.map((l,i)=>{const u=USERS.find(x=>x.id===l.userId);return(<div key={i} style={{display:"flex",gap:8,marginBottom:10}}><Av user={u} size={28}/><div style={{background:C.surfaceAlt,borderRadius:10,padding:"7px 12px",flex:1}}><div style={{fontSize:11,color:C.teal,marginBottom:2}}>{u?.lastName} · {l.time}</div><div style={{fontSize:13}}>{l.text}</div></div></div>);})}
              </div>
            </div>

          ):(
          <>
            {/* Tab Bar */}
            <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
              {TABS.filter(t=>t.id==='notifs'||(t.id==='chat'&&hasPermission('chat:view'))||(t.id==='payments'&&hasPermission('payments:view'))||(t.id==='crm'&&hasPermission('crm:view'))||['projects','tasks'].includes(t.id)).map(t=>(
                <div key={t.id} onClick={()=>setTab(t.id)}
                  style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"10px 4px 8px",cursor:"pointer",color:tab===t.id?C.teal:C.textDim,position:"relative",WebkitTapHighlightColor:"transparent",minHeight:52}}>
                  <t.Icon/>
                  <span style={{fontSize:9,marginTop:3,fontWeight:tab===t.id?700:400}}>{t.label}</span>
                  {t.badge>0&&<div style={{position:"absolute",top:7,right:"50%",transform:"translateX(10px)",background:C.teal,borderRadius:"50%",width:8,height:8}}/>}
                </div>
              ))}
            </div>

            {/* NOTIFICATIONS */}
            {tab==="notifs"&&(
              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px 8px"}}>
                  <span style={{fontWeight:700,fontSize:15}}>اعلان‌ها</span>
                  {unread>0&&<button style={{...btn("g"),fontSize:11,padding:"5px 10px"}} onClick={()=>setNotifs(ns=>ns.map(n=>({...n,read:true})))}>همه خوانده شد</button>}
                </div>
                {(()=>{
                  // Group consecutive messages from same sender
                  const grouped = [];
                  notifs.forEach(n=>{
                    const last = grouped[grouped.length-1];
                    if(last && last.type===n.type && last.type==="dm" && last.refId===n.refId && !n.read===!last.read){
                      last.count=(last.count||1)+1;
                      last.time=n.time;
                    } else if(last && last.type===n.type && last.type==="msg" && last.channel===n.channel && !n.read===!last.read){
                      last.count=(last.count||1)+1;
                      last.time=n.time;
                    } else {
                      grouped.push({...n,count:1});
                    }
                  });
                  return grouped;
                })().map(n=>(
                  <div key={n.id} style={{display:"flex",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:n.read?"transparent":C.tealDim}}
                    onClick={()=>{
  setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x));
  if(n.type==="task"&&n.projectId&&n.taskId){
    setActiveProj(n.projectId);setActiveTask({pid:n.projectId,tid:n.taskId});setTab("projects");
  } else if(n.type==="dm"&&n.refId){
    if(hasPermission('chat:view')){setTab("chat");setDm(n.refId);}
  } else if(n.type==="msg"&&n.channel){
    if(hasPermission('chat:view')){setTab("chat");setDm(null);setChannel(n.channel);}
  } else if(n.type==="request"){
    setTab("requests");
  } else if(n.type==="payment"){
    if(hasPermission('payments:view')){setTab("payments");}
  }
}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      {n.count>1&&<div style={{position:"absolute",top:-4,left:-4,background:C.danger,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",zIndex:1}}>{faN(n.count)}</div>}
                      <div style={{width:42,height:42,borderRadius:"50%",background:n.read?C.surfaceAlt:C.tealDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:n.read?C.textDim:C.teal}}><Icons.Check/></div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,fontWeight:700}}>{n.title}</span>{!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:C.teal,flexShrink:0,marginTop:4}}/>}</div>
                      <div style={{fontSize:12,color:C.textMuted}}>{n.desc}</div>
                      <div style={{fontSize:11,color:C.textDim,marginTop:4}}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CHAT */}
            {tab==="chat"&&hasPermission('chat:view')&&(
              <>
                <div style={{padding:"8px 14px",borderBottom:`1px solid ${C.border}`,background:C.surface,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  {dm?<><Av user={USERS.find(u=>u.id===dm)} size={34}/><div><div style={{fontSize:13,fontWeight:600}}>{USERS.find(u=>u.id===dm)?.name}</div><button onClick={()=>{setShowMsgSearch(p=>!p);setMsgSearch("");}} style={{background:"none",border:"none",color:showMsgSearch?C.teal:C.textMuted,cursor:"pointer",padding:4,display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button><div style={{fontSize:11,color:C.teal}}>{USERS.find(u=>u.id===dm)?.role}</div><button onClick={()=>{setShowMsgSearch(p=>!p);setMsgSearch("");}} style={{background:"none",border:"none",color:showMsgSearch?C.teal:C.textMuted,cursor:"pointer",padding:4,display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></div><button onClick={()=>{setShowMsgSearch(p=>!p);setMsgSearch("");}} style={{background:"none",border:"none",color:showMsgSearch?C.teal:C.textMuted,cursor:"pointer",padding:4,display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></>:<><div style={{width:34,height:34,borderRadius:"50%",background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.textDim}}>#</div><button onClick={()=>{setShowMsgSearch(p=>!p);setMsgSearch("");}} style={{background:"none",border:"none",color:showMsgSearch?C.teal:C.textMuted,cursor:"pointer",padding:4,display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button><span style={{fontSize:13,fontWeight:600}}>{CHANNELS.find(x=>x.id===channel)?.name}</span></>}
                </div>
                {showMsgSearch&&<div style={{padding:"6px 14px",background:C.surfaceAlt,flexShrink:0,borderBottom:`1px solid ${C.border}`}}>
                    <input style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.text,fontSize:14,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit"}} placeholder="جستجو در پیام‌ها..." value={msgSearch} onChange={e=>setMsgSearch(e.target.value)} autoFocus/>
                  </div>}
                <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:2,WebkitOverflowScrolling:"touch",background:C.bg}}>
                  {curMsgs.filter(msg=>!msgSearch||msg.text?.includes(msgSearch)).map(msg=>{const u=USERS.find(x=>x.id===msg.userId);const mine=msg.userId===me.id;const isImage=msg.file_type&&msg.file_type.startsWith('image/')&&msg.file_url;return(<div key={msg.id} style={{display:"flex",justifyContent:mine?"flex-start":"flex-end",marginBottom:4}}><div style={{maxWidth:"78%",background:mine?C.myBubble:C.theirBubble,borderRadius:mine?"4px 12px 12px 12px":"12px 4px 12px 12px",padding:"8px 12px 6px"}}>{!mine&&<div style={{fontSize:11,color:C.teal,fontWeight:700,marginBottom:3}}>{u?.lastName}</div>}{msg.file_url&&isImage&&<a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{display:"block",marginBottom:4}}><img src={msg.file_url} alt={msg.file_name||"تصویر"} style={{maxWidth:"100%",maxHeight:200,borderRadius:8,objectFit:"contain"}}/></a>}{msg.file_url&&!isImage&&<a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",marginBottom:4,background:mine?C.surfaceAlt:C.bg,borderRadius:8,textDecoration:"none",color:C.teal,fontSize:12,border:`1px solid ${C.border}`}}><span>📎</span><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}}>{msg.file_name||"فایل"}</span><span style={{fontSize:10,color:C.textDim}}>{msg.file_size||""}</span></a>}<div style={{fontSize:14,lineHeight:1.6,color:C.text,wordBreak:"break-word"}}>{msg.text}</div><div style={{fontSize:10,color:C.textDim,marginTop:3,textAlign:"left",display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>{msg.time}{msg.userId===me.id&&<svg width="18" height="11" viewBox="0 0 18 11" fill="none"><path d="M1 5.5L4.5 9L11 2" stroke={C.success} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 5.5L9.5 9L16 2" stroke={C.success} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div></div></div>);})}
                  <div ref={msgEnd}/>
                </div>
                {pendingFile&&<div style={{padding:"6px 14px",background:C.surfaceAlt,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  {pendingFile.uploading&&<span style={{fontSize:12,color:C.teal}}>⏳ در حال آپلود...</span>}
                  {!pendingFile.uploading&&<span style={{fontSize:12,color:C.success}}>✅ آپلود شد</span>}
                  <span style={{fontSize:12,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📎 {pendingFile.name}</span>
                  <span style={{fontSize:11,color:C.textDim}}>{pendingFile.size}</span>
                </div>}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",paddingBottom:"calc(8px + env(safe-area-inset-bottom))",borderTop:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
                  <label style={{width:42,height:42,borderRadius:"50%",background:pendingFile?C.teal:C.surfaceAlt,border:"none",cursor:"pointer",color:pendingFile?"#fff":C.textMuted,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                    {pendingFile?<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<Icons.Attach/>}
                    {pendingFile&&<span style={{position:"absolute",top:-4,right:-4,fontSize:9,background:C.danger,color:"#fff",borderRadius:8,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onClick={(ev)=>{ev.preventDefault();setPendingFile(null);}}>×</span>}
                    <input type="file" style={{display:"none"}} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" onChange={async e=>{const f=e.target.files[0];if(!f)return;if(f.size>10485760){alert("حداکثر حجم فایل ۱۰ مگابایت است.");e.target.value="";return;}e.target.value="";setPendingFile({name:f.name,size:f.size>1048576?(f.size/1048576).toFixed(1)+"MB":(f.size/1024).toFixed(0)+"KB",type:f.type,url:null,uploading:true});const result=await uploadFile(f);if(result){setPendingFile({...result,uploading:false});}else{setPendingFile(null);alert("خطا در آپلود فایل. لطفاً دوباره تلاش کنید.");}}}/>
                  </label>
                  <input style={{flex:1,background:C.surfaceAlt,border:"none",borderRadius:24,padding:"10px 16px",color:C.text,fontSize:16,outline:"none",direction:"rtl",fontFamily:"inherit"}} placeholder={pendingFile?"پیام + فایل...":"پیام..."} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg();}}/>
                  <button style={{width:42,height:42,borderRadius:"50%",background:C.teal,border:"none",cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={sendMsg}><Icons.Send/></button>
                </div>
              </>
            )}

            {/* PROJECTS */}
            {tab==="projects"&&(
              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px 8px"}}>
                  <span style={{fontWeight:700,fontSize:15}}>پروژه‌ها</span>
                  <button style={btn("p")} onClick={()=>setShowProjForm(true)}>پروژه جدید</button>
                </div>
                {projs.map(p=>{const mgr=USERS.find(u=>u.id===p.manager);return(
                  <div key={p.id} style={{...card,margin:"0 14px 8px",cursor:"pointer"}} onClick={()=>setActiveProj(p.id)}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{flex:1,marginLeft:8}}><div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{p.title}</div><div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.textMuted}}><Av user={mgr} size={18}/><span>{mgr?.lastName}</span><span style={{color:C.textDim}}>· {p.endDate}</span></div></div>
                      <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}><Badge status={p.status}/><Badge status={p.priority}/></div>
                    </div>
                    <Progress tasks={p.tasks}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:C.textDim}}>
                      <span>{p.tasks.length} وظیفه · {p.tasks.filter(t=>t.status==="done").length} تکمیل</span>
                      <span style={{display:"flex",gap:2}}>{p.members.slice(0,4).map(uid=>{const u=USERS.find(x=>x.id===uid);return u?<Av key={uid} user={u} size={20}/>:null;})}</span>
                    </div>
                  </div>
                );})}
              </div>
            )}

            {/* REQUESTS */}
            {tab==="requests"&&(
              openRequest ? (
                /* Request Detail with Workflow */
                <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
                    <button onClick={()=>{setOpenRequest(null);setReqNote("");}} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>‹</button>
                    <span style={{fontSize:15,fontWeight:700,flex:1}}>{openRequest.type}</span>
                    <Badge status={openRequest.status}/>
                  </div>
                  <div style={{...card,marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <Av user={USERS.find(u=>u.id===openRequest.fromId)||USERS[0]} size={40}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:700}}>{openRequest.from}</div>
                        <div style={{fontSize:11,color:C.textDim}}>{USERS.find(u=>u.id===openRequest.fromId)?.role} · {openRequest.time}</div>
                      </div>
                    </div>
                    <div style={{fontSize:13,color:C.textMuted,lineHeight:1.7}}>{openRequest.detail}</div>
                  </div>
                  <WorkflowTimeline workflow={openRequest.workflow} users={USERS}/>
                  {openRequest.status==="pending"&&canApproveRequest(openRequest)&&(
                    <div style={{marginTop:16}}>
                      <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>یادداشت (اختیاری)</div>
                      <textarea style={{...fi,height:70,resize:"none",direction:"rtl",fontFamily:"inherit",lineHeight:1.7}}
                        placeholder="توضیح تأیید یا رد..." defaultValue={reqNote} onBlur={e=>setReqNote(e.target.value)}/>
                      <div style={{display:"flex",gap:10}}>
                        <button style={{...btn("s"),flex:1,padding:"13px",fontSize:14}} onClick={()=>{
                          setReqs(p=>p.map(r=>r.id!==openRequest.id?r:{...r,status:"approved",
                            workflow:r.workflow.map(w=>w.action==="pending"&&!w.done?{...w,action:"approved",done:true,time:nowShamsi(),note:reqNote}:w)
                          }));
                          setOpenRequest(null);setReqNote("");
                        }}>✓ تأیید درخواست</button>
                        <button style={{...btn("d"),flex:1,padding:"13px",fontSize:14}} onClick={()=>{
                          setReqs(p=>p.map(r=>r.id!==openRequest.id?r:{...r,status:"rejected",
                            workflow:r.workflow.map(w=>w.action==="pending"&&!w.done?{...w,action:"rejected",done:true,time:nowShamsi(),note:reqNote||"رد شد"}:w)
                          }));
                          setOpenRequest(null);setReqNote("");
                        }}>✕ رد درخواست</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px 8px"}}>
                    <span style={{fontWeight:700,fontSize:15}}>درخواست‌ها</span>
                    <button style={btn("p")} onClick={()=>setShowReqForm(true)}>+ درخواست</button>
                  </div>
                  {/* Search */}
                  <div style={{padding:"0 14px 10px"}}>
                    <input style={{...fi,marginBottom:0,background:C.surfaceAlt,border:"none",borderRadius:24,padding:"9px 16px"}}
                      placeholder="جستجو در درخواست‌ها..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
                  </div>
                  {/* Filter tabs */}
                  <div style={{display:"flex",gap:6,padding:"0 14px 10px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                    {["همه","در انتظار","تأیید شده","رد شده"].map(f=>(
                      <button key={f} onClick={()=>setSearchQ(f==="همه"?"":f)}
                        style={{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",
                          background:searchQ===f||(!searchQ&&f==="همه")?C.teal:C.surfaceAlt,
                          color:searchQ===f||(!searchQ&&f==="همه")?"#fff":C.textMuted}}>
                        {f}
                      </button>
                    ))}
                  </div>
                  {reqs.filter(r=>{
                    if (!searchQ) return true;
                    if (searchQ==="در انتظار") return r.status==="pending";
                    if (searchQ==="تأیید شده") return r.status==="approved";
                    if (searchQ==="رد شده") return r.status==="rejected";
                    return r.from.includes(searchQ)||r.type.includes(searchQ)||r.detail.includes(searchQ);
                  }).map(r=>(
                    <div key={r.id} style={{...card,margin:"0 14px 8px",cursor:"pointer"}} onClick={()=>setOpenRequest(r)}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <Av user={USERS.find(u=>u.id===r.fromId)||USERS[0]} size={38}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700}}>{r.from}</div>
                          <div style={{fontSize:11,color:C.textDim}}>{r.time}</div>
                        </div>
                        <Badge status={r.status}/>
                      </div>
                      <div style={{fontSize:13,color:C.textMuted,display:"flex",alignItems:"center",flexWrap:"wrap",gap:6,marginBottom:8}}>
                        <span style={{background:C.tealDim,color:C.teal,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{r.type}</span>
                        <span>{r.detail}</span>
                      </div>
                      {/* Mini workflow progress */}
                      {r.workflow&&(
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          {r.workflow.map((w,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                              <div style={{width:20,height:20,borderRadius:"50%",background:w.done?(w.action==="rejected"?C.danger:C.success):C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700}}>{w.done?"✓":i+1}</div>
                              {i<r.workflow.length-1&&<div style={{width:16,height:2,background:w.done?C.success:C.border}}/>}
                            </div>
                          ))}
                          <span style={{fontSize:10,color:C.textDim,marginRight:6}}>
                            {faN(r.workflow.filter(w=>w.done).length)}/{faN(r.workflow.length)} مرحله
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* TASKS — My Tasks (فاز ۱، از بک‌اند) */}
            {tab==="tasks"&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {openApiTask?(
                  /* ─── جزئیات تسک ─── */
                  <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"10px 14px 20px"}}>
                    <button onClick={()=>setOpenApiTask(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600,marginBottom:10,padding:0,WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontSize:14}}>‹</span> بازگشت به لیست
                    </button>
                    {apiDetailLoading?(
                      <div style={{textAlign:"center",color:C.textDim,marginTop:40,fontSize:13}}>در حال بارگذاری...</div>
                    ):(
                      <>
                        <div style={{...card,marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                            <span style={{fontSize:15,fontWeight:700,flex:1}}>{openApiTask.title}</span>
                            <TaskStatusBadge status={openApiTask.status}/>
                          </div>
                          {openApiTask.description&&<div style={{fontSize:13,color:C.textDim,lineHeight:1.9,marginBottom:10}}>{openApiTask.description}</div>}
                          <div style={{display:"flex",flexWrap:"wrap",gap:8,fontSize:11,color:C.textMuted}}>
                            {openApiTask.priority&&<span style={{background:C.surfaceAlt,padding:"3px 10px",borderRadius:12}}>اولویت: {openApiTask.priority}</span>}
                            {openApiTask.due_date&&<span style={{background:C.surfaceAlt,padding:"3px 10px",borderRadius:12}}>سررسید: {openApiTask.due_date}</span>}
                            {openApiTask.order_id&&<span style={{background:C.surfaceAlt,padding:"3px 10px",borderRadius:12}}>سفارش: {openApiTask.order_id}</span>}
                          </div>
                        </div>

                        {/* اقدامات */}
                        {["PENDING_ACK","ACKNOWLEDGED","IN_PROGRESS","REJECTED"].includes(openApiTask.status)&&(
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                            {openApiTask.status==="PENDING_ACK"&&<button disabled={!!statusBusy} onClick={()=>setApiTaskStatus(openApiTask.id,"ACKNOWLEDGED")} style={{...btn("p"),flex:1}}>تأیید دریافت</button>}
                            {openApiTask.status==="ACKNOWLEDGED"&&<button disabled={!!statusBusy} onClick={()=>setApiTaskStatus(openApiTask.id,"IN_PROGRESS")} style={{...btn("p"),flex:1}}>شروع انجام</button>}
                            {["IN_PROGRESS","REJECTED"].includes(openApiTask.status)&&<button disabled={!!statusBusy} onClick={()=>{setEvErr("");setEvForm({evidenceType:"TEXT",notes:"",contentUrl:""});setEvFormOpen(true);}} style={{...btn("s"),flex:2}}>ثبت شاهد و ارسال به بررسی</button>}
                            {["PENDING_ACK","ACKNOWLEDGED","IN_PROGRESS"].includes(openApiTask.status)&&<button disabled={!!statusBusy} onClick={()=>{setEvErr("");setBlockerDesc("");setBlockerOpen(true);}} style={{...btn("d"),flex:1}}>گزارش مانع</button>}
                          </div>
                        )}
                        {openApiTask.status==="APPROVED"&&<div style={{textAlign:"center",fontSize:12,color:C.success,marginBottom:14}}>این تسک تأیید نهایی شده است ✓</div>}
                        {openApiTask.status==="BLOCKED"&&<div style={{textAlign:"center",fontSize:12,color:C.danger,marginBottom:14}}>این تسک به دلیل مانع متوقف است</div>}

                        {/* شواهد */}
                        <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>شواهد ثبت شده ({faN(apiTaskEv.length)})</div>
                        {apiTaskEv.length===0&&<div style={{textAlign:"center",color:C.textDim,fontSize:12,padding:"18px 0",marginBottom:6}}>هنوز شاهد یا مدرکی ثبت نشده است</div>}
                        {apiTaskEv.map(ev=>(
                          <div key={ev.id} style={{...card,marginBottom:8}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                              <span style={{fontSize:10,background:C.tealDim,color:C.teal,padding:"2px 10px",borderRadius:12,fontWeight:600}}>{ev.evidence_type}</span>
                              {ev.created_at&&<span style={{fontSize:11,color:C.textDim}}>{dateShamsi(new Date(ev.created_at))}</span>}
                            </div>
                            {ev.notes&&<div style={{fontSize:13,color:C.text,lineHeight:1.8}}>{ev.notes}</div>}
                            {ev.content_url&&<a href={ev.content_url} target="_blank" rel="noreferrer" style={{fontSize:12,color:C.teal,textDecoration:"none",display:"inline-block",marginTop:4}}>{ev.content_url}</a>}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ):(
                  /* ─── لیست تسک‌ها ─── */
                  <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 16px 8px"}}>
                      <div style={{fontWeight:700,fontSize:15,flex:1}}>تسک‌های من</div>
                      <button onClick={loadMyApiTasks} style={{...btn("g"),fontSize:11,padding:"6px 12px"}}>به‌روزرسانی</button>
                    </div>
                    {apiTasksLoading&&apiTasks.length===0&&<div style={{textAlign:"center",color:C.textDim,marginTop:60,fontSize:13}}>در حال بارگذاری...</div>}
                    {!apiTasksLoading&&apiTasksErr&&(
                      <div style={{textAlign:"center",marginTop:50,padding:"0 30px"}}>
                        <div style={{fontSize:13,color:C.danger,marginBottom:12,lineHeight:1.9}}>{apiTasksErr}</div>
                        <button onClick={loadMyApiTasks} style={{...btn("p"),fontSize:12}}>تلاش مجدد</button>
                      </div>
                    )}
                    {!apiTasksLoading&&!apiTasksErr&&apiTasks.length===0&&<div style={{textAlign:"center",color:C.textDim,marginTop:60,fontSize:13}}>تسکی به شما محول نشده است</div>}
                    {apiTasks.map(t=>(
                      <div key={t.id} style={{...card,margin:"8px 14px",cursor:"pointer"}} onClick={()=>openApiTaskDetail(t.id)}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}><span style={{fontSize:13,fontWeight:600,flex:1}}>{t.title}</span><TaskStatusBadge status={t.status}/></div>
                        {t.description&&<div style={{fontSize:12,color:C.textDim,marginBottom:6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{t.description}</div>}
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:11,color:C.textDim}}>{t.due_date?`سررسید: ${t.due_date}`:""}</span>
                          <span style={{fontSize:11,color:C.teal}}>مشاهده و اقدام</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* فرم ثبت شاهد */}
                {evFormOpen&&openApiTask&&(
                  <Sheet title="ثبت شاهد / مدرک" onClose={()=>!evBusy&&setEvFormOpen(false)}>
                    {lbl("نوع شاهد")}
                    <select style={fi} value={evForm.evidenceType} onChange={e=>setEvForm(p=>({...p,evidenceType:e.target.value}))}>
                      <option value="TEXT">گزارش متنی</option>
                      <option value="URL">لینک / مدرک آنلاین</option>
                      <option value="IMAGE">تصویر</option>
                      <option value="FILE">فایل</option>
                    </select>
                    {lbl("توضیحات")}
                    <textarea style={{...fi,height:90,resize:"none",direction:"rtl",textAlign:"right",fontFamily:"'Vazirmatn',sans-serif",lineHeight:1.8}} placeholder="شرح کار انجام‌شده..." value={evForm.notes} onChange={e=>setEvForm(p=>({...p,notes:e.target.value}))}/>
                    {lbl("لینک / پیوست (اختیاری)")}
                    <input style={fi} placeholder="https://..." value={evForm.contentUrl} onChange={e=>setEvForm(p=>({...p,contentUrl:e.target.value}))}/>
                    {evErr&&<div style={{fontSize:12,color:C.danger,marginBottom:10,lineHeight:1.8}}>{evErr}</div>}
                    <div style={{display:"flex",gap:8}}>
                      <button style={{...btn("g"),flex:1,border:`1px solid ${C.border}`}} disabled={evBusy} onClick={()=>setEvFormOpen(false)}>انصراف</button>
                      <button style={{...btn("p"),flex:2}} disabled={evBusy} onClick={submitEvidence}>{evBusy?"در حال ارسال...":"ثبت و ارسال به بررسی"}</button>
                    </div>
                  </Sheet>
                )}

                {/* فرم گزارش مانع */}
                {blockerOpen&&openApiTask&&(
                  <Sheet title="گزارش مانع (Blocker)" onClose={()=>!evBusy&&setBlockerOpen(false)}>
                    {lbl("شرح مانع")}
                    <textarea style={{...fi,height:100,resize:"none",direction:"rtl",textAlign:"right",fontFamily:"'Vazirmatn',sans-serif",lineHeight:1.8}} placeholder="مشکل / مانع پیش‌آمده را توضیح دهید..." value={blockerDesc} onChange={e=>setBlockerDesc(e.target.value)}/>
                    {evErr&&<div style={{fontSize:12,color:C.danger,marginBottom:10,lineHeight:1.8}}>{evErr}</div>}
                    <div style={{display:"flex",gap:8}}>
                      <button style={{...btn("g"),flex:1,border:`1px solid ${C.border}`}} disabled={evBusy} onClick={()=>{setBlockerOpen(false);setEvErr("");}}>انصراف</button>
                      <button style={{...btn("d"),flex:2}} disabled={evBusy} onClick={submitBlocker}>{evBusy?"در حال ارسال...":"ثبت مانع"}</button>
                    </div>
                  </Sheet>
                )}
              </div>
            )}


            {/* INBOX / KARTEBL */}
            {tab==="inbox"&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {/* Sub tabs */}
                <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
                  {["letters","docs"].map(s=>(
                    <div key={s} onClick={()=>setInboxSub(s)}
                      style={{flex:1,padding:"11px 8px",textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:600,color:inboxSub===s?C.teal:C.textMuted,borderBottom:inboxSub===s?`2px solid ${C.teal}`:"2px solid transparent",WebkitTapHighlightColor:"transparent"}}>
                      {s==="letters"?"نامه‌ها":"مستندات"}
                    </div>
                  ))}
                </div>

                {/* LETTERS */}
                {inboxSub==="letters"&&(
                  <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",padding:"10px 16px",gap:8,flexShrink:0}}>
                      {["inbox","sent"].map(t=>(
                        <button key={t} onClick={()=>setLetterTab(t)}
                          style={{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:letterTab===t?C.teal:C.surfaceAlt,color:letterTab===t?"#fff":C.textMuted}}>
                          {t==="inbox"?"صندوق ورودی":"ارسال شده"}
                        </button>
                      ))}
                      <div style={{flex:1}}/>
                      <button onClick={()=>{setCompose({to:[],subject:"",body:"",priority:"normal",attachments:[]});setShowCompose(true);}}
                        style={{...btn("p"),fontSize:12}}>+ نامه جدید</button>
                    </div>
                    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                      {letters.filter(l=>l.status===letterTab).map(l=>{
                        const sender=USERS.find(u=>u.id===l.from);
                        return(
                          <div key={l.id} style={{display:"flex",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:!l.read&&l.status==="inbox"?C.tealDim:"transparent"}}
                            onClick={()=>{setOpenLetter(l);setLetters(ls=>ls.map(x=>x.id===l.id?{...x,read:true}:x));}}>
                            <Av user={sender} size={40}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                                <span style={{fontSize:13,fontWeight:700,color:!l.read&&l.status==="inbox"?C.text:C.textMuted}}>{sender?.name}</span>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  {l.priority==="high"&&<span style={{fontSize:10,background:C.danger+"22",color:C.danger,padding:"1px 6px",borderRadius:10,fontWeight:600}}>فوری</span>}
                                  <span style={{fontSize:11,color:C.textDim}}>{l.date}</span>
                                </div>
                              </div>
                              <div style={{fontSize:13,fontWeight:600,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.subject}</div>
                              <div style={{fontSize:12,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.body.split("\n")[0]}</div>
                              {l.attachments.length>0&&<div style={{fontSize:11,color:C.teal,marginTop:3}}>📎 {l.attachments.length} پیوست</div>}
                            </div>
                            {!l.read&&l.status==="inbox"&&<div style={{width:8,height:8,borderRadius:"50%",background:C.teal,flexShrink:0,marginTop:6}}/>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DOCS */}
                {inboxSub==="docs"&&(
                  <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                    <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <div style={{display:"flex",gap:6,flex:1,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                        {["همه","آیین‌نامه","قراردادها","فرم‌ها","گزارش‌ها"].map(cat=>(
                          <button key={cat} onClick={()=>setDocFilter(cat)}
                            style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",background:docFilter===cat?C.teal:C.surfaceAlt,color:docFilter===cat?"#fff":C.textMuted}}>
                            {cat}
                          </button>
                        ))}
                      </div>
                      <label style={{...btn("p"),fontSize:12,cursor:"pointer"}}>
                        + آپلود
                        <input type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const ext=f.name.split(".").pop().toLowerCase();const icon=ext==="pdf"?"📄":ext==="xlsx"||ext==="xls"?"📊":ext==="docx"||ext==="doc"?"📝":"📁";setDocs(p=>[{id:Date.now(),name:f.name,category:"سایر",uploadedBy:me.id,date:dateShamsi(new Date()),size:(f.size/1024).toFixed(0)+"KB",icon},...p]);e.target.value="";}}/>
                      </label>
                    </div>
                    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"0 14px"}}>
                      {docs.filter(d=>docFilter==="همه"||d.category===docFilter).map(d=>{
                        const uploader=USERS.find(u=>u.id===d.uploadedBy);
                        return(
                          <div key={d.id} style={{...card,display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:44,height:44,borderRadius:10,background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{d.icon}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                              <div style={{display:"flex",gap:8,marginTop:3,fontSize:11,color:C.textDim}}>
                                <span style={{background:C.tealDim,color:C.teal,padding:"1px 8px",borderRadius:10,fontSize:10}}>{d.category}</span>
                                <span>{d.size}</span>
                                <span>{d.date}</span>
                              </div>
                              {uploader&&<div style={{fontSize:11,color:C.textDim,marginTop:2}}>آپلود توسط: {uploader.lastName}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}


{/* ADMIN PANEL - Full CRUD */}
            {tab==="admin" && hasPermission('admin_panel:view') && (
              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"0 0 20px"}}>
                {/* Header + Tabs */}
                <div style={{padding:"14px 16px 8px",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{fontWeight:700,fontSize:15}}>پنل مدیریت</div>
                  <div style={{fontSize:11,color:C.teal,marginTop:2}}>آذرمهر صنعت</div>
                  <div style={{display:"flex",gap:4,marginTop:10,flexWrap:"wrap"}}>
                    {['users','roles','permissions','groups'].map(t=>(
                      <button key={t} onClick={()=>handleAdminTabChange(t)}
                        style={{...btn(adminTab===t?'p':'g'),fontSize:11,padding:"6px 12px"}}>
                        {t==='users'&&'👥 کاربران'}
                        {t==='roles'&&'🎭 نقش‌ها'}
                        {t==='permissions'&&'🔐 دسترسی‌ها'}
                        {t==='groups'&&'📁 گروه‌ها'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ==================== TAB: USERS ==================== */}
                {adminTab==='users' && (
                  <div style={{padding:"10px 14px 0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontWeight:700,fontSize:14}}>مدیریت کاربران ({adminUsers.length})</span>
                      <button onClick={()=>openUserModal()} style={{...btn("p"),fontSize:11,padding:"5px 12px"}}>
                        <Ic name="plus" size={12} /> افزودن کارمند
                      </button>
                    </div>

                    {adminUsersLoading ? (
                      <Spinner />
                    ) : (
                      <div style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{background:C.surfaceAlt}}>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>نام</th>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>نام کاربری</th>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>سمت</th>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>نقش سیستم</th>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>نقش‌های RBAC</th>
                              <th style={{padding:"10px 8px",textAlign:"center",color:C.textMuted,fontWeight:600}}>عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminUsers.map(u=>(
                              <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
                                <td style={{padding:"10px 8px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <Av user={u} size={28} />
                                    <div>
                                      <div style={{fontWeight:600}}>{u.full_name||u.name}</div>
                                      <div style={{fontSize:10,color:C.textDim}}>{u.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{padding:"10px 8px",color:C.textMuted,fontSize:11,direction:"ltr"}}>@{u.username||'—'}</td>
                                <td style={{padding:"10px 8px"}}><span style={{background:C.tealDim,color:C.teal,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{u.role||'—'}</span></td>
                                <td style={{padding:"10px 8px"}}>
                                  <span style={{background:C.primaryDim,color:C.primary,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{u.system_role||'user'}</span>
                                </td>
                                <td style={{padding:"10px 8px"}}>
                                  {(u.permissions||[]).slice(0,3).map(p=>(
                                    <span key={p} style={{display:"inline-block",marginLeft:4,padding:"1px 6px",background:C.purpleDim,color:C.purple,borderRadius:4,fontSize:9}}>{p}</span>
                                  ))}
                                  {(u.permissions||[]).length>3 && (
                                    <span style={{color:C.textDim,fontSize:9}}>+ {(u.permissions||[]).length-3} بیشتر</span>
                                  )}
                                </td>
                                <td style={{padding:"10px 8px",textAlign:"center"}}>
                                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                                    <button onClick={()=>openUserModal(u)} title="ویرایش" style={{...btn("s"),padding:"6px"}}><Ic name="edit" size={12} /></button>
                                    <button onClick={()=>openAssignRoleModal(u)} title="مدیریت نقش‌ها" style={{...btn("i"),padding:"6px"}}><Ic name="shield" size={12} /></button>
                                    {u.id!==me.id && (
                                      <button onClick={()=>setConfirmDeleteUser(u)} title="حذف" style={{...btn("d"),padding:"6px"}}><Ic name="trash" size={12} /></button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== TAB: ROLES ==================== */}
                {adminTab==='roles' && (
                  <div style={{padding:"10px 14px 0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontWeight:700,fontSize:14}}>مدیریت نقش‌ها ({adminRoles.length})</span>
                      <button onClick={()=>openRoleModal()} style={{...btn("p"),fontSize:11,padding:"5px 12px"}}>
                        <Ic name="plus" size={12} /> افزودن نقش
                      </button>
                    </div>

                    {adminRolesLoading ? (
                      <Spinner />
                    ) : (
                      <div style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{background:C.surfaceAlt}}>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>نام نمایشی</th>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>کلید (Key)</th>
                              <th style={{padding:"10px 8px",textAlign:"center",color:C.textMuted,fontWeight:600}}>سطح</th>
                              <th style={{padding:"10px 8px",textAlign:"right",color:C.textMuted,fontWeight:600}}>تعداد کاربران</th>
                              <th style={{padding:"10px 8px",textAlign:"center",color:C.textMuted,fontWeight:600}}>عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminRoles.map(r=>{
                              const userCount = adminUsers.filter(u=>(u.permissions||[]).some(p=>p.startsWith(r.key)) || u.system_role===r.key).length;
                              const isSystem = ['super_admin','admin','user'].includes(r.key);
                              return (
                                <tr key={r.id} style={{borderBottom:`1px solid ${C.border}`}}>
                                  <td style={{padding:"10px 8px",fontWeight:600}}>{r.title}</td>
                                  <td style={{padding:"10px 8px",color:C.textMuted,fontSize:11,direction:"ltr"}}>{r.key}</td>
                                  <td style={{padding:"10px 8px",textAlign:"center"}}><span style={{background:C.infoDim,color:C.info,padding:"2px 8px",borderRadius:20,fontSize:10}}>{r.level}</span></td>
                                  <td style={{padding:"10px 8px",textAlign:"center",color:C.textMuted}}>{userCount}</td>
                                  <td style={{padding:"10px 8px",textAlign:"center"}}>
                                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                                      <button onClick={()=>openRoleModal(r)} title="ویرایش" style={{...btn("s"),padding:"6px"}}><Ic name="edit" size={12} /></button>
                                      <button onClick={()=>openRolePermissions(r)} title="دسترسی‌ها" style={{...btn("i"),padding:"6px"}}><Ic name="lock" size={12} /></button>
                                      {!isSystem && (
                                        <button onClick={()=>setConfirmDeleteRole(r)} title="حذف" style={{...btn("d"),padding:"6px"}}><Ic name="trash" size={12} /></button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== TAB: PERMISSIONS ==================== */}
                {adminTab==='permissions' && (
                  <div style={{padding:"10px 14px 0"}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>ماتریس دسترسی‌ها</div>
                    <div style={{fontSize:11,color:C.textMuted,marginBottom:10}}>برای هر نقش، دسترسی‌های مربوطه را فعال/غیرفعال کنید. تغییرات بلافاصله اعمال می‌شوند.</div>

                    {adminPermissionsLoading ? (
                      <Spinner />
                    ) : (
                      <div style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:800}}>
                          <thead>
                            <tr style={{background:C.surfaceAlt}}>
                              <th style={{padding:"8px",textAlign:"right",color:C.textMuted,fontWeight:600,minWidth:180,position:"sticky",right:0,background:C.surfaceAlt}}>دسترسی (Permission)</th>
                              {adminRoles.map(r=>(
                                <th key={r.id} style={{padding:"8px",textAlign:"center",color:C.textMuted,fontWeight:600,minWidth:80,position:"sticky",top:0,background:C.surfaceAlt}}>
                                  {r.title}<br/><span style={{fontSize:9,color:C.textDim}}>({r.key})</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {PERMISSION_GROUPS.flatMap(group=>[
                              <tr key={`group-${group.name}`} style={{background:C.surfaceAlt}}>
                                <td colSpan={1+adminRoles.length} style={{padding:"8px",fontWeight:700,color:C.primary}}>📁 {group.name}</td>
                              </tr>,
                              ...group.permissions.map(perm=>(
                                <tr key={perm} style={{borderBottom:`1px solid ${C.border}`}}>
                                  <td style={{padding:"8px",fontSize:11,fontFamily:"monospace",color:C.text}}>
                                    {perm}
                                  </td>
                                  {adminRoles.map(r=>{
                                    const hasPerm = (r.permissions||[]).includes(perm);
                                    const isSystem = ['super_admin','admin','user'].includes(r.key);
                                    return (
                                      <td key={r.id} style={{padding:"4px",textAlign:"center"}}>
                                        <label style={{cursor: isSystem ? 'not-allowed' : 'pointer', opacity: isSystem ? 0.5 : 1}}>
                                          <input
                                            type="checkbox"
                                            checked={hasPerm}
                                            disabled={isSystem}
                                            onChange={()=>togglePermission(r.id, perm, hasPerm)}
                                            style={{width:18,height:18,accentColor:C.teal,cursor: isSystem ? 'not-allowed' : 'pointer'}}
                                          />
                                        </label>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))
                            ])}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== TAB: GROUPS ==================== */}
                {adminTab==='groups' && (
                  <div style={{padding:"10px 14px 0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontWeight:700,fontSize:14}}>مدیریت گروه‌ها ({adminGroups.length})</span>
                      <button onClick={()=>openGroupModal()} style={{...btn("p"),fontSize:11,padding:"5px 12px"}}>
                        <Ic name="plus" size={12} /> ایجاد گروه
                      </button>
                    </div>

                    {adminGroupsLoading ? (
                      <Spinner />
                    ) : (
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
                        {adminGroups.map(g=>(
                          <div key={g.id} style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,padding:14}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                              <div style={{fontWeight:700,fontSize:13}}>{g.name}</div>
                              <div style={{display:"flex",gap:4}}>
                                <button onClick={()=>openGroupModal(g)} title="ویرایش" style={{...btn("s"),padding:"6px"}}><Ic name="edit" size={12} /></button>
                                <button onClick={()=>openGroupMembersModal(g)} title="مدیریت اعضا" style={{...btn("i"),padding:"6px"}}><Ic name="users" size={12} /></button>
                                <button onClick={()=>setConfirmDeleteGroup(g)} title="حذف" style={{...btn("d"),padding:"6px"}}><Ic name="trash" size={12} /></button>
                              </div>
                            </div>
                            <div style={{fontSize:11,color:C.textMuted,marginBottom:8}}>{g.memberCount||0} عضو</div>
                            <div style={{fontSize:10,color:C.textDim,maxHeight:100,overflow:"auto"}}>
                              {(g.members||[]).slice(0,10).map(m=>(
                                <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <Av user={m} size={20} />
                                  <span style={{fontSize:11,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</span>
                                  <span style={{fontSize:9,color:C.textDim,background:C.surfaceAlt,padding:"1px 6px",borderRadius:4}}>{m.role||'—'}</span>
                                </div>
                              ))}
                              {(g.members||[]).length>10 && <div style={{fontSize:10,color:C.textDim}}>+ {(g.members||[]).length-10} عضو دیگر</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== MODALS ==================== */}

                {/* User Modal */}
                {adminUserModal && (
                  <Modal title={adminUserModal.id?'ویرایش کارمند':'افزودن کارمند جدید'} onClose={()=>setAdminUserModal(null)} maxWidth={500}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <Fld label="نام کامل"><input style={fi} value={adminUserForm.full_name} onChange={e=>setAdminUserForm(f=>({...f,full_name:e.target.value}))} placeholder="مثال: محمدرضا بزرگمهر" /></Fld>
                      <Fld label="نام کاربری"><input style={fi} value={adminUserForm.username} onChange={e=>setAdminUserForm(f=>({...f,username:e.target.value}))} placeholder="مثال: bozorgmehr" /></Fld>
                      <Fld label="رمز عبور"><input style={fi} type="password" value={adminUserForm.password} onChange={e=>setAdminUserForm(f=>({...f,password:e.target.value}))} placeholder={adminUserModal.id?"(خالی بگذارید برای عدم تغییر)":"حداقل ۶ کاراکتر"} /></Fld>
                      <Fld label="سمت"><input style={fi} value={adminUserForm.role} onChange={e=>setAdminUserForm(f=>({...f,role:e.target.value}))} placeholder="مثال: مدیر عامل" /></Fld>
                      <Fld label="نقش سیستم">
                        <select style={fi} value={adminUserForm.system_role} onChange={e=>setAdminUserForm(f=>({...f,system_role:e.target.value}))}>
                          <option value="user">کاربر عادی</option>
                          <option value="admin">مدیر</option>
                          <option value="super_admin">مدیر ارشد</option>
                        </select>
                      </Fld>
                      <Fld label="حرف آواتار"><input style={fi} value={adminUserForm.avatar} onChange={e=>setAdminUserForm(f=>({...f,avatar:e.target.value}))} maxLength={2} placeholder="م" /></Fld>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                        <button onClick={()=>setAdminUserModal(null)} style={{...btn("g")}}>انصراف</button>
                        <button onClick={saveAdminUser} disabled={adminUserSaving} style={{...btn("p")}}>{adminUserSaving?'...':(adminUserModal.id?'ذخیره تغییرات':'ایجاد کارمند')}</button>
                      </div>
                    </div>
                  </Modal>
                )}

{/* Role Modal */}
                {adminRoleModal && (
                  <Modal title={adminRoleModal.id?'ویرایش نقش':'افزودن نقش جدید'} onClose={()=>setAdminRoleModal(null)} maxWidth={500}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <Fld label="کلید (Key) - انگلیسی"><input style={fi} value={adminRoleForm.key} onChange={e=>setAdminRoleForm(f=>({...f,key:e.target.value}))} placeholder="مثال: manager" disabled={adminRoleModal.id ? true : false} /></Fld>
                      <Fld label="عنوان نمایشی"><input style={fi} value={adminRoleForm.title} onChange={e=>setAdminRoleForm(f=>({...f,title:e.target.value}))} placeholder="مثال: مدیر" /></Fld>
                      <Fld label="سطح (Level)">
                        <input style={fi} type="number" value={adminRoleForm.level} onChange={e=>{const v=parseInt(e.target.value)||10;setAdminRoleForm(f=>({...f,level:v}));}} min={1} max={100} />
                      </Fld>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                        <button onClick={()=>setAdminRoleModal(null)} style={{...btn("g")}}>انصراف</button>
                        <button onClick={saveAdminRole} disabled={adminRoleSaving} style={{...btn("p")}}>{adminRoleSaving?'...':(adminRoleModal.id?'ذخیره تغییرات':'ایجاد نقش')}</button>
                      </div>
                    </div>
                  </Modal>
                )}

                {/* Role Permissions Modal */}
                {adminRolePermModal && (
                  <Modal title={`دسترسی‌های نقش: ${adminRolePermModal.title}`} onClose={()=>setAdminRolePermModal(null)} maxWidth={600}>
                    <div style={{fontSize:11,color:C.textMuted,marginBottom:10}}>تیک فعال = این نقش این دسترسی را دارد</div>
                    <div style={{maxHeight:400,overflow:"auto"}}>
                      {PERMISSION_GROUPS.map(group=>(
                        <div key={group.name} style={{marginBottom:16}}>
                          <div style={{fontWeight:700,color:C.primary,marginBottom:8,fontSize:12}}>{group.name}</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                            {group.permissions.map(perm=>(
                              <label key={perm} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"6px 8px",background:C.surfaceAlt,borderRadius:8,fontSize:11}}>
                                <input
                                  type="checkbox"
                                  checked={adminRolePermForm.includes(perm)}
                                  onChange={e=>setAdminRolePermForm(f=>e.target.checked?[...f,perm]:f.filter(p=>p!==perm))}
                                  style={{width:16,height:16,accentColor:C.teal}}
                                />
                                <span style={{fontFamily:"monospace",fontSize:10}}>{perm}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
                      <button onClick={()=>setAdminRolePermModal(null)} style={{...btn("g")}}>بستن</button>
                      <button onClick={saveRolePermissions} disabled={adminRolePermSaving} style={{...btn("p")}}>{adminRolePermSaving?'...':'ذخیره دسترسی‌ها'}</button>
                    </div>
                  </Modal>
                )}

                {/* Assign Role Modal */}
                {adminAssignRoleModal && (
                  <Modal title={`مدیریت نقش‌های: ${adminAssignRoleModal.name}`} onClose={()=>setAdminAssignRoleModal(null)} maxWidth={500}>
                    <div style={{maxHeight:300,overflow:"auto"}}>
                      <div style={{fontSize:11,color:C.textMuted,marginBottom:10}}>نقش‌های موجود:</div>
                      {adminRoles.map(r=>{
                        const hasRole = adminAssignRoleModal.assignedRoles.includes(r.id);
                        return (
                          <label key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px",background:C.surfaceAlt,borderRadius:8,marginBottom:6,cursor:"pointer"}}>
                            <input
                              type="checkbox"
                              checked={hasRole}
                              onChange={e=>setAdminAssignRoleModal(f=>({
                                ...f,
                                assignedRoles: e.target.checked ? [...f.assignedRoles, r.id] : f.assignedRoles.filter(id=>id!==r.id)
                              }))}
                              style={{width:18,height:18,accentColor:C.teal}}
                            />
                            <div style={{flex:1}}>
                              <div style={{fontWeight:600,fontSize:12}}>{r.title}</div>
                              <div style={{fontSize:10,color:C.textDim,direction:"ltr"}}>{r.key} · سطح {r.level}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
                      <button onClick={()=>setAdminAssignRoleModal(null)} style={{...btn("g")}}>انصراف</button>
                      <button onClick={saveUserRoles} disabled={adminAssignRoleSaving} style={{...btn("p")}}>{adminAssignRoleSaving?'...':'ذخیره نقش‌ها'}</button>
                    </div>
                  </Modal>
                )}

                {/* Group Modal */}
                {adminGroupModal && (
                  <Modal title={adminGroupModal.id?'ویرایش گروه':'ایجاد گروه جدید'} onClose={()=>setAdminGroupModal(null)} maxWidth={500}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <Fld label="نام گروه"><input style={fi} value={adminGroupForm.name} onChange={e=>setAdminGroupForm(f=>({...f,name:e.target.value}))} placeholder="مثال: تیم فروش" /></Fld>
                      <Fld label="توضیحات"><textarea style={{...fi,height:60}} value={adminGroupForm.description} onChange={e=>setAdminGroupForm(f=>({...f,description:e.target.value}))} placeholder="توضیحات اختیاری" /></Fld>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                        <button onClick={()=>setAdminGroupModal(null)} style={{...btn("g")}}>انصراف</button>
                        <button onClick={saveAdminGroup} disabled={adminGroupSaving} style={{...btn("p")}}>{adminGroupSaving?'...':(adminGroupModal.id?'ذخیره تغییرات':'ایجاد گروه')}</button>
                      </div>
                    </div>
                  </Modal>
                )}

                {/* Group Members Modal */}
                {adminGroupMembersModal && (
                  <Modal title={`اعضای گروه: ${adminGroupMembersModal.name}`} onClose={()=>setAdminGroupMembersModal(null)} maxWidth={600}>
                    <div style={{fontSize:11,color:C.textMuted,marginBottom:10}}>برای افزودن/حذف عضو، روی نام کاربر کلیک کنید</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,maxHeight:400,overflow:"auto"}}>
                      <div>
                        <div style={{fontWeight:600,marginBottom:8,color:C.success}}>اعضای فعلی ({adminGroupMembersModal.members.length})</div>
                        {adminGroupMembersModal.members.length===0 ? (
                          <div style={{color:C.textDim,fontSize:11,textAlign:"center",padding:20}}>عضوی وجود ندارد</div>
                        ) : (
                          adminGroupMembersModal.members.map(m=>(
                            <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px",background:C.surfaceAlt,borderRadius:6,marginBottom:4,cursor:"pointer"}}
                              onClick={()=>removeGroupMember(m.id)}>
                              <Av user={m} size={24} />
                              <span style={{flex:1,fontSize:12}}>{m.name}</span>
                              <Ic name="x" size={14} color={C.danger} />
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <div style={{fontWeight:600,marginBottom:8,color:C.teal}}>کاربران قابل افزودن ({adminGroupMembersModal.available.length})</div>
                        {adminGroupMembersModal.available.length===0 ? (
                          <div style={{color:C.textDim,fontSize:11,textAlign:"center",padding:20}}>کاربر قابل افزودن وجود ندارد</div>
                        ) : (
                          adminGroupMembersModal.available.map(m=>(
                            <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px",background:C.surfaceAlt,borderRadius:6,marginBottom:4,cursor:"pointer"}}
                              onClick={()=>addGroupMember(m.id)}>
                              <Av user={m} size={24} />
                              <span style={{flex:1,fontSize:12}}>{m.name}</span>
                              <Ic name="plus" size={14} color={C.teal} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
                      <button onClick={()=>setAdminGroupMembersModal(null)} style={{...btn("g")}}>بستن</button>
                    </div>
                  </Modal>
                )}

                {/* Confirm Delete User */}
                {confirmDeleteUser && (
                  <Modal title="حذف کارمند" onClose={()=>setConfirmDeleteUser(null)} maxWidth={400}>
                    <p style={{marginBottom:16,color:C.textMuted}}>آیا از حذف «{confirmDeleteUser.name}» اطمینان دارید؟ این عملیات غیرقابل بازگشت است.</p>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button onClick={()=>setConfirmDeleteUser(null)} style={{...btn("g")}}>انصراف</button>
                      <button onClick={deleteUser} disabled={adminUserDeleting} style={{...btn("d")}}>{adminUserDeleting?'...':'حذف'}</button>
                    </div>
                  </Modal>
                )}

                {/* Confirm Delete Role */}
                {confirmDeleteRole && (
                  <Modal title="حذف نقش" onClose={()=>setConfirmDeleteRole(null)} maxWidth={400}>
                    <p style={{marginBottom:16,color:C.textMuted}}>آیا از حذف نقش «{confirmDeleteRole.title}» اطمینان دارید؟</p>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button onClick={()=>setConfirmDeleteRole(null)} style={{...btn("g")}}>انصراف</button>
                      <button onClick={deleteRole} disabled={adminRoleDeleting} style={{...btn("d")}}>{adminRoleDeleting?'...':'حذف'}</button>
                    </div>
                  </Modal>
                )}

                {/* Confirm Delete Group */}
                {confirmDeleteGroup && (
                  <Modal title="حذف گروه" onClose={()=>setConfirmDeleteGroup(null)} maxWidth={400}>
                    <p style={{marginBottom:16,color:C.textMuted}}>آیا از حذف گروه «{confirmDeleteGroup.name}» اطمینان دارید؟ اعضا از گروه خارج می‌شوند اما حذف نمی‌شوند.</p>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button onClick={()=>setConfirmDeleteGroup(null)} style={{...btn("g")}}>انصراف</button>
                      <button onClick={deleteGroup} disabled={adminGroupDeleting} style={{...btn("d")}}>{adminGroupDeleting?'...':'حذف'}</button>
                    </div>
                  </Modal>
                )}

              </div>
            )}



            {/* PAYMENTS */}
            {tab==="payments"&&hasPermission('payments:view')&&(
              openPayment && !canSeePayment(openPayment) ? (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
                  <div>
                    <div style={{fontSize:32,marginBottom:12}}>🔒</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:8}}>دسترسی محدود</div>
                    <div style={{fontSize:12,color:C.textMuted,marginBottom:16}}>شما به این پرداخت دسترسی ندارید</div>
                    <button onClick={()=>setOpenPayment(null)} style={{background:C.teal,border:"none",borderRadius:10,padding:"10px 24px",color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>بازگشت</button>
                  </div>
                </div>
              ) : openPayment ? (
                <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                  <div style={{height:48,display:"flex",alignItems:"center",padding:"0 14px",background:C.surface,borderBottom:`1px solid ${C.border}`,gap:10,flexShrink:0}}>
                    <button onClick={()=>setOpenPayment(null)} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:24,lineHeight:1,padding:0}}>‹</button>
                    <span style={{fontSize:14,fontWeight:700,flex:1}}>جزئیات پرداخت · {openPayment.code}</span>
                    <span style={{fontSize:11,color:statusColor(openPayment.status)}}>{statusLabel(openPayment.status)}</span>
                  </div>
                  <PaymentDetail payment={openPayment} me={me} onBack={()=>setOpenPayment(null)} onAction={handlePaymentAction} isAdmin={[1,2,3].includes(me.id) || hasPermission('admin_panel:view')}/>
                </div>
              ) : (
                <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                  {/* Header */}
                  <div style={{padding:"12px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                    <span style={{fontWeight:700,fontSize:15}}>سیستم پرداخت</span>
                    <button onClick={()=>exportSepidaar(visiblePayments)} style={{...btn("g"),fontSize:11,padding:"5px 12px",border:`1px solid ${C.border}`}}>خروجی سپیدار</button>
                  </div>
                  {/* Stats */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,padding:"0 14px 10px",flexShrink:0}}>
                    {[
                      ["کل",visiblePayments.length,C.teal],
                      ["نوبت من",visiblePayments.filter(p=>p.workflow.some(w=>w.assignedTo===me.id&&w.status==="pending"&&(w.step===1||p.workflow[w.step-2]?.status==="done"))).length,C.warning],
                      ["پرداخت شده",visiblePayments.filter(p=>p.status==="paid").length,C.success],
                    ].map(([l,v,col],i)=>(
                      <div key={i} style={{background:C.surface,borderRadius:10,padding:"10px",border:`1px solid ${C.border}`,textAlign:"center"}}>
                        <div style={{fontSize:20,fontWeight:800,color:col}}>{faN(v)}</div>
                        <div style={{fontSize:10,color:C.textDim,marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Filter */}
                  <div style={{display:"flex",gap:6,padding:"0 14px 8px",overflowX:"auto",WebkitOverflowScrolling:"touch",flexShrink:0}}>
                    {[["all","همه"],["pending","نوبت من"],["mine","درخواست‌های من"],["paid","پرداخت شده"]].map(([id,l])=>(
                      <button key={id} onClick={()=>setPayFilter(id)}
                        style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",background:payFilter===id?C.teal:C.surfaceAlt,color:payFilter===id?"#fff":C.textMuted,flexShrink:0}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {/* Search */}
                  <div style={{padding:"0 14px 8px",flexShrink:0}}>
                    <input style={{width:"100%",background:C.surfaceAlt,border:"none",borderRadius:24,padding:"9px 16px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit"}}
                      placeholder="جستجو..." value={paySearch} onChange={e=>setPaySearch(e.target.value)}/>
                  </div>
                  {/* List */}
                  <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"0 14px"}}>
                    {visiblePayments.filter(p=>{
                      const mf = payFilter==="all"?true:payFilter==="pending"?p.workflow.some(w=>w.assignedTo===me.id&&w.status==="pending"&&(w.step===1||p.workflow[w.step-2]?.status==="done")):payFilter==="mine"?p.requesterId===me.id:p.status==="paid";
                      const ms = !paySearch||p.code.includes(paySearch)||p.desc.includes(paySearch)||p.beneficiary.includes(paySearch)||p.type.includes(paySearch);
                      return mf&&ms;
                    }).map(p=>{
                      const myStep=p.workflow.find(w=>w.assignedTo===me.id&&w.status==="pending"&&(w.step===1||p.workflow[w.step-2]?.status==="done"));
                      const doneCount=p.workflow.filter(w=>w.status==="done").length;
                      return (
                        <div key={p.id} style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${myStep?C.warning:C.border}`,marginBottom:10,cursor:"pointer"}} onClick={()=>setOpenPayment(p)}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:700}}>{p.code}</div>
                              <div style={{fontSize:11,color:C.textDim}}>{p.type} · {p.date}</div>
                            </div>
                            <div style={{textAlign:"left"}}>
                              <div style={{fontSize:14,fontWeight:800,color:C.teal}}>{Number(p.amount).toLocaleString("fa-IR")}</div>
                              <div style={{fontSize:10,color:C.textDim}}>تومان</div>
                            </div>
                          </div>
                          <div style={{fontSize:12,color:C.textMuted,marginBottom:8}}>{p.desc}</div>
                          <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:myStep?8:0}}>
                            {p.workflow.map((w,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                                <div style={{width:20,height:20,borderRadius:"50%",background:w.status==="done"?C.success:w.status==="rejected"?C.danger:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700}}>
                                  {w.status==="done"?"✓":w.status==="rejected"?"✕":faN(w.step)}
                                </div>
                                {i<p.workflow.length-1&&<div style={{width:10,height:2,background:w.status==="done"?C.success:C.border}}/>}
                              </div>
                            ))}
                            <span style={{fontSize:10,color:C.textDim,marginRight:6}}>{faN(doneCount)}/{faN(p.workflow.length)}</span>
                          </div>
                          {myStep&&<div style={{background:C.warning+"22",borderRadius:8,padding:"6px 10px",fontSize:12,color:C.warning,fontWeight:600}}>نوبت شما: {myStep.title}</div>}
                        </div>
                      );
                    })}
                    <div style={{height:80}}/>
                  </div>
                  {/* FAB */}
                  <button onClick={()=>setShowPayForm(true)}
                    style={{position:"absolute",bottom:"calc(70px + env(safe-area-inset-bottom))",left:"50%",transform:"translateX(-50%)",background:C.teal,border:"none",borderRadius:28,padding:"12px 24px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 20px ${C.teal}66`,display:"flex",alignItems:"center",gap:8,WebkitTapHighlightColor:"transparent",zIndex:5}}>
                    + درخواست پرداخت جدید
                  </button>
                </div>
              )
            )}

            {/* ─── CRM ─── */}
            {tab==="crm"&&hasPermission('crm:view')&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

                {/* هدر */}
                <div style={{padding:"12px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                  <span style={{fontWeight:700,fontSize:15}}>CRM مشتریان</span>
                  <button onClick={()=>setShowCustForm(true)} style={{...btn("p"),fontSize:12,padding:"6px 14px"}}>+ مشتری</button>
                </div>

                {/* آمار */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"0 14px 10px",flexShrink:0}}>
                  {[
                    ["مشتریان",customers.length,C.teal],
                    ["طلایی",customers.filter(c=>c.grade==="طلایی").length,"#F59E0B"],
                    ["بدهکار",customers.filter(c=>c.debt>0).length,C.danger],
                    ["سفارش",crmOrders.filter(o=>o.status!=="تسویه").length,C.success],
                  ].map(([l,v,col],i)=>(
                    <div key={i} style={{background:C.surface,borderRadius:10,padding:"10px 6px",border:`1px solid ${C.border}`,textAlign:"center"}}>
                      <div style={{fontSize:18,fontWeight:800,color:col}}>{faN(v)}</div>
                      <div style={{fontSize:9,color:C.textDim,marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* تب‌های داخلی */}
                <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                  {[["customers","مشتریان"],["orders","سفارشات"],["debt","مطالبات"],["report","گزارش"]].map(([id,lbl])=>(
                    <div key={id} onClick={()=>setCrmTab(id)}
                      style={{flex:1,textAlign:"center",padding:"10px 4px",cursor:"pointer",fontSize:12,
                        color:crmTab===id?C.teal:C.textMuted,
                        borderBottom:crmTab===id?`2px solid ${C.teal}`:"2px solid transparent",
                        fontWeight:crmTab===id?700:400}}>
                      {lbl}
                    </div>
                  ))}
                </div>

                {/* محتوا */}
                <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"10px 14px"}}>

                  {/* مشتریان */}
                  {crmTab==="customers"&&<>
                    <input style={{width:"100%",background:C.surfaceAlt,border:"none",borderRadius:24,padding:"9px 16px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit",marginBottom:10}}
                      placeholder="جستجو..." value={crmSearch} onChange={e=>setCrmSearch(e.target.value)}/>
                    {customers.filter(c=>!crmSearch||c.name.includes(crmSearch)||c.city.includes(crmSearch)||c.contact.includes(crmSearch)).map(c=>(
                      <div key={c.id} style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:10,cursor:"pointer"}} onClick={()=>setActiveCust(c)}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},#A66B0A)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#111",fontWeight:800,fontSize:18,flexShrink:0}}>{c.av||c.name[0]}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                              <span style={{fontSize:14,fontWeight:700}}>{c.name}</span>
                              <span style={{fontSize:10,background:c.grade==="طلایی"?"#F59E0B22":c.grade==="نقره‌ای"?"#8A8A8A22":"#4A4A4A22",color:c.grade==="طلایی"?"#F59E0B":c.grade==="نقره‌ای"?"#8A8A8A":"#4A4A4A",padding:"1px 8px",borderRadius:10,fontWeight:600,flexShrink:0}}>{c.grade}</span>
                            </div>
                            <div style={{fontSize:11,color:C.textMuted}}>{c.type} · {c.city} · {c.contact}</div>
                          </div>
                          <div style={{textAlign:"left",flexShrink:0}}>
                            {c.debt>0
                              ? <div style={{fontSize:11,color:C.danger,fontWeight:600}}>{faN(Math.round(c.debt/1000000))}M بدهی</div>
                              : <div style={{fontSize:11,color:C.success}}>تسویه ✓</div>
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{height:80}}/>
                  </>}

                  {/* سفارشات */}
                  {crmTab==="orders"&&<>
                    <div style={{display:"flex",justifyContent:"flex-start",marginBottom:10}}>
                      <button onClick={()=>setShowOrderForm(true)} style={{...btn("p"),fontSize:12,padding:"6px 14px"}}>+ سفارش جدید</button>
                    </div>
                    {crmOrders.map(o=>{
                      const cust = customers.find(c=>c.id===o.customerId);
                      const sc = {ارسال:C.teal,تسویه:C.success,تولید:C.warning,ثبت:C.textMuted};
                      return (
                        <div key={o.id} style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <span style={{fontSize:13,fontWeight:700}}>{cust?.name||"—"}</span>
                            <span style={{fontSize:11,background:(sc[o.status]||C.textMuted)+"22",color:sc[o.status]||C.textMuted,padding:"2px 8px",borderRadius:10,fontWeight:600}}>{o.status}</span>
                          </div>
                          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>{o.product} · {faN(o.qty)} {o.unit}</div>
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <span style={{fontSize:13,fontWeight:700,color:C.teal}}>{Number(o.amount).toLocaleString("fa-IR")} تومان</span>
                            <span style={{fontSize:11,color:C.textDim}}>{o.date}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{height:80}}/>
                  </>}

                  {/* مطالبات */}
                  {crmTab==="debt"&&<>
                    {customers.filter(c=>c.debt>0).length===0
                      ? <div style={{textAlign:"center",color:C.textDim,marginTop:40,fontSize:13}}>هیچ مطالبه‌ای وجود ندارد ✓</div>
                      : customers.filter(c=>c.debt>0).map(c=>(
                          <div key={c.id} style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.danger}33`,marginBottom:10}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                              <span style={{fontSize:14,fontWeight:700}}>{c.name}</span>
                              <span style={{fontSize:15,fontWeight:800,color:C.danger}}>{faN(Math.round(c.debt/1000000))} میلیون</span>
                            </div>
                            <div style={{fontSize:11,color:C.textMuted}}>{c.city} · {c.contact} · {c.phone}</div>
                          </div>
                        ))
                    }
                  </>}

                  {/* گزارش */}
                  {crmTab==="report"&&<>
                    <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:10}}>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>فروش به تفکیک محصول</div>
                      {Object.entries(crmOrders.reduce((acc,o)=>{
                        acc[o.product]=(acc[o.product]||0)+Number(o.amount); return acc;
                      },{})).map(([prod,total],i,arr)=>{
                        const max=Math.max(...arr.map(([,v])=>v));
                        return (
                          <div key={prod} style={{marginBottom:10}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                              <span style={{fontSize:12}}>{prod}</span>
                              <span style={{fontSize:12,color:C.teal,fontWeight:600}}>{(total/1000000).toFixed(0)}M</span>
                            </div>
                            <div style={{height:4,background:C.border,borderRadius:4}}>
                              <div style={{width:(total/max*100)+"%",height:"100%",background:C.teal,borderRadius:4}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>خلاصه</div>
                      {[
                        ["کل فروش", crmOrders.reduce((s,o)=>s+Number(o.amount),0).toLocaleString("fa-IR")+" تومان", C.teal],
                        ["کل مطالبات", customers.reduce((s,c)=>s+c.debt,0).toLocaleString("fa-IR")+" تومان", C.danger],
                        ["سفارشات باز", faN(crmOrders.filter(o=>o.status!=="تسویه").length)+" سفارش", C.warning],
                      ].map(([l,v,col],i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
                          <span style={{fontSize:12,color:C.textMuted}}>{l}</span>
                          <span style={{fontSize:13,fontWeight:700,color:col}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </>}

                </div>

                {/* پروفایل مشتری */}
                {activeCust&&(
                  <div style={{position:"absolute",inset:0,background:C.bg,zIndex:20,display:"flex",flexDirection:"column"}}>
                    <div style={{height:52,display:"flex",alignItems:"center",padding:"0 14px",background:C.surface,borderBottom:`1px solid ${C.border}`,gap:10,flexShrink:0}}>
                      <button onClick={()=>setActiveCust(null)} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:22,padding:0,display:"flex",alignItems:"center"}}><Icons.Back/></button>
                      <span style={{fontSize:14,fontWeight:700,flex:1}}>{activeCust.name}</span>
                      <span style={{fontSize:10,background:activeCust.grade==="طلایی"?"#F59E0B22":"#8A8A8A22",color:activeCust.grade==="طلایی"?"#F59E0B":"#8A8A8A",padding:"2px 10px",borderRadius:10,fontWeight:600}}>{activeCust.grade}</span>
                    </div>
                    <div style={{flex:1,overflowY:"auto",padding:16}}>
                      <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:12}}>
                        {[
                          ["نوع",activeCust.type],
                          ["شهر",activeCust.city],
                          ["مسئول خرید",activeCust.contact],
                          ["تلفن",activeCust.phone],
                          ["شماره حساب",activeCust.account||"—"],
                        ].map(([k,v])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                            <span style={{fontSize:12,color:C.textMuted}}>{k}</span>
                            <span style={{fontSize:12,fontWeight:600,direction:k==="شماره حساب"?"ltr":"rtl"}}>{v}</span>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}>
                          <span style={{fontSize:12,color:C.textMuted}}>وضعیت مالی</span>
                          <span style={{fontSize:13,fontWeight:700,color:activeCust.debt>0?C.danger:C.success}}>
                            {activeCust.debt>0?faN(Math.round(activeCust.debt/1000000))+" میلیون بدهی":"تسویه ✓"}
                          </span>
                        </div>
                      </div>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>سفارشات این مشتری</div>
                      {crmOrders.filter(o=>o.customerId===activeCust.id).length===0
                        ? <div style={{color:C.textDim,fontSize:12,textAlign:"center",padding:20}}>سفارشی ثبت نشده</div>
                        : crmOrders.filter(o=>o.customerId===activeCust.id).map(o=>(
                            <div key={o.id} style={{background:C.surface,borderRadius:10,padding:12,border:`1px solid ${C.border}`,marginBottom:8}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:13,fontWeight:600}}>{o.product}</span>
                                <span style={{fontSize:12,color:C.teal,fontWeight:700}}>{Number(o.amount).toLocaleString("fa-IR")}</span>
                              </div>
                              <div style={{fontSize:11,color:C.textDim}}>{faN(o.qty)} {o.unit} · {o.date} · {o.status}</div>
                            </div>
                          ))
                      }
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Permission Denied Fallback */}
            {(tab==="chat"||tab==="payments"||tab==="crm")&&!(
              (tab==="chat"&&hasPermission('chat:view'))||
              (tab==="payments"&&hasPermission('payments:view'))||
              (tab==="crm"&&hasPermission('crm:view'))
            )&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:16}}>🚫</div>
                <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>عدم دسترسی</div>
                <div style={{fontSize:13,color:C.textMuted,lineHeight:1.8}}>شما مجوز دسترسی به این بخش را ندارید.<br/>لطفاً با مدیر سیستم تماس بگیرید.</div>
              </div>
            )}

            {/* ORG CHART */}
            {tab==="org"&&(
              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"flex",alignItems:"center",padding:"12px 16px 8px",gap:8}}>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>چارت سازمانی</div><div style={{fontSize:11,color:C.teal}}>{orgActive.length} نفر فعال</div></div>
                  <button onClick={()=>setOrgOpen(new Set(orgMembers.map(m=>m.id)))} style={{fontSize:11,padding:"6px 10px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>باز همه</button>
                  {hasPermission('org_chart:edit') && (
                    <button onClick={()=>{setOrgForm({name:"",role:"",mgr:"1",av:""});setOrgMode("add");}} style={btn("p")}>+ عضو</button>
                  )}
                </div>

                {orgRows.map(({m,depth,isLast,hasKids,isOpen})=>{
                  const col=ORG_LC[Math.min(depth,ORG_LC.length-1)];
                  const mgrName=m.mgr?orgActive.find(x=>x.id===m.mgr)?.name:null;
                  return(
                    <div key={m.id} style={{display:"flex",borderBottom:`1px solid ${C.border}`,alignItems:"stretch"}}>
                      {depth>0&&(
                        <div style={{width:depth*22,flexShrink:0,position:"relative"}}>
                          <div style={{position:"absolute",top:0,bottom:isLast?"50%":0,right:depth*22-11,width:1,background:C.border}}/>
                          <div style={{position:"absolute",top:"50%",right:depth*22-11,width:11,height:1,background:C.border}}/>
                        </div>
                      )}
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:12,padding:"11px 14px",cursor:hasPermission('org_chart:edit')?'pointer':'default'}} onClick={hasPermission('org_chart:edit')?()=>orgEdit(m):undefined}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${col},${col}77)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:700,color:"#fff",flexShrink:0}}>{m.av}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:600}}>{m.name}</div>
                          <div style={{fontSize:11,color:C.textDim,marginTop:1}}>{m.role}</div>
                          {mgrName&&<div style={{fontSize:10,color:col+"99",marginTop:2}}>گزارش به: {mgrName}</div>}
                        </div>
                        {hasKids&&<div onClick={e=>{e.stopPropagation();orgToggle(m.id);}} style={{width:28,height:28,borderRadius:"50%",background:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:C.textMuted,cursor:"pointer",flexShrink:0,lineHeight:1}}>{isOpen?"−":"+"}</div>}
                      </div>
                    </div>
                  );
                })}

                {orgInact.length>0&&(
                  <div style={{margin:"12px 14px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",fontSize:12,color:C.textDim,borderBottom:`1px solid ${C.border}`}}>غیرفعال ({orgInact.length})</div>
                    {orgInact.map(m=>(
                      <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",opacity:0.6}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.textMuted,flexShrink:0}}>{m.av}</div>
                        <div style={{flex:1}}><div style={{fontSize:13,color:C.textMuted}}>{m.name}</div><div style={{fontSize:11,color:C.textDim}}>{m.role}</div></div>
                        {hasPermission('org_chart:edit') && (
                          <button onClick={()=>orgReact(m.id)} style={btn("p")}>بازگشت</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{height:20}}/>

                {orgMode==="edit"&&<Sheet title="ویرایش عضو" onClose={()=>setOrgMode("list")}>{lbl("نام کامل")}<input style={fi} value={orgForm.name} onChange={e=>setOrgForm(p=>({...p,name:e.target.value}))}/>{lbl("سمت")}<input style={fi} value={orgForm.role} onChange={e=>setOrgForm(p=>({...p,role:e.target.value}))}/>{lbl("مدیر مستقیم")}<select style={fi} value={orgForm.mgr} onChange={e=>setOrgForm(p=>({...p,mgr:e.target.value}))}><option value="">— رأس —</option>{orgActive.filter(m=>m.id!==orgCur?.id).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>{lbl("حرف آواتار")}<input style={fi} maxLength={2} value={orgForm.av} onChange={e=>setOrgForm(p=>({...p,av:e.target.value}))}/><div style={{display:"flex",gap:8}}>{hasPermission('org_chart:edit') && orgCur?.mgr!==null&&<button onClick={()=>setOrgMode("confirm")} style={{flex:1,padding:11,borderRadius:10,border:"none",background:C.danger+"33",color:C.danger,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>حذف</button>}<button onClick={()=>setOrgMode("list")} style={{flex:1,padding:11,borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>انصراف</button>{hasPermission('org_chart:edit') && <button onClick={orgSave} style={{flex:2,padding:11,borderRadius:10,border:"none",background:C.teal,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>ذخیره</button>}</div></Sheet>}
                {orgMode==="add"&&<Sheet title="عضو جدید" onClose={()=>setOrgMode("list")}>{lbl("نام کامل")}<input style={fi} placeholder="نام و نام خانوادگی" value={orgForm.name} onChange={e=>setOrgForm(p=>({...p,name:e.target.value}))}/>{lbl("سمت")}<input style={fi} placeholder="عنوان شغلی" value={orgForm.role} onChange={e=>setOrgForm(p=>({...p,role:e.target.value}))}/>{lbl("مدیر مستقیم")}<select style={fi} value={orgForm.mgr} onChange={e=>setOrgForm(p=>({...p,mgr:e.target.value}))}>{orgActive.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>{lbl("حرف آواتار")}<input style={fi} maxLength={2} value={orgForm.av} onChange={e=>setOrgForm(p=>({...p,av:e.target.value}))}/><div style={{display:"flex",gap:8}}><button onClick={()=>setOrgMode("list")} style={{flex:1,padding:11,borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>انصراف</button>{hasPermission('org_chart:edit') && <button onClick={orgAdd} style={{flex:2,padding:11,borderRadius:10,border:"none",background:C.teal,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>افزودن</button>}</div></Sheet>}
                {orgMode==="confirm"&&<div style={{position:"fixed",inset:0,background:"#000C",display:"flex",alignItems:"flex-end",zIndex:100}} onClick={()=>setOrgMode("edit")}><div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:500,margin:"0 auto",textAlign:"center"}} onClick={e=>e.stopPropagation()}><div style={{width:32,height:4,background:C.border,borderRadius:2,margin:"0 auto 18px"}}/><div style={{fontSize:16,fontWeight:700,marginBottom:8}}>حذف از چارت</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.7,marginBottom:22}}>غیرفعال می‌شه و زیرمجموعه‌ها منتقل می‌شن.</div><div style={{display:"flex",gap:10}}><button onClick={()=>setOrgMode("edit")} style={{flex:1,padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>انصراف</button>{hasPermission('org_chart:edit') && <button onClick={orgDeact} style={{flex:1,padding:12,borderRadius:10,border:"none",background:C.danger,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>غیرفعال</button>}</div></div></div>}
              </div>
            )}
          </>)}
        </div>
      </div>

      {/* Global Modals */}
      {showReqForm&&<Sheet title="درخواست جدید" onClose={()=>setShowReqForm(false)}>{lbl("نوع")}<select style={fi} value={newReq.type} onChange={e=>setNewReq(p=>({...p,type:e.target.value}))}>
              <option>مرخصی استحقاقی</option>
              <option>مرخصی استعلاجی</option>
              <option>مرخصی بدون حقوق</option>
              <option>مساعده</option>
              <option>اضافه‌کاری</option>
              <option>مأموریت</option>
              <option>درخواست خرید</option>
              <option>درخواست تجهیزات</option>
              <option>درخواست آموزش</option>
              <option>سایر</option>
            </select>{lbl("توضیحات")}<textarea style={{...fi,height:90,resize:"none",direction:"rtl",textAlign:"right",fontFamily:"inherit",lineHeight:1.8,fontSize:16}} placeholder="توضیحات درخواست..." defaultValue={newReq.note} onBlur={e=>setNewReq(p=>({...p,note:e.target.value}))} key={showReqForm?"open":"closed"}></textarea><div style={{display:"flex",gap:8}}><button style={{...btn("g"),flex:1,border:`1px solid ${C.border}`}} onClick={()=>setShowReqForm(false)}>انصراف</button><button style={{...btn("p"),flex:2}} onClick={submitReq}>ارسال</button></div></Sheet>}

      {showProjForm&&<Sheet title="پروژه جدید" onClose={()=>setShowProjForm(false)}>{lbl("نام پروژه")}<input style={fi} placeholder="عنوان..." value={newProj.title} onChange={e=>setNewProj(p=>({...p,title:e.target.value}))}/>{lbl("مدیر پروژه")}<select style={fi} value={newProj.manager} onChange={e=>setNewProj(p=>({...p,manager:e.target.value}))}>{USERS.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>{lbl("اعضا")}<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{USERS.map(u=>{const sel=newProj.members.includes(u.id)||newProj.members.includes(String(u.id));return<div key={u.id} onClick={()=>setNewProj(p=>({...p,members:sel?p.members.filter(x=>Number(x)!==u.id):[...p.members,u.id]}))} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:12,background:sel?C.tealDim:C.surfaceAlt,color:sel?C.teal:C.textMuted,border:`1px solid ${sel?C.teal:C.border}`}}><Av user={u} size={18}/>{u.lastName}</div>;})}</div>{lbl("تاریخ پایان")}<input style={fi} placeholder="۱۴۰۴/۰۶/۳۱" value={newProj.endDate} onChange={e=>setNewProj(p=>({...p,endDate:e.target.value}))}/>{lbl("اولویت")}<select style={fi} value={newProj.priority} onChange={e=>setNewProj(p=>({...p,priority:e.target.value}))}><option value="high">مهم</option><option value="medium">متوسط</option><option value="low">عادی</option></select><div style={{display:"flex",gap:8}}><button style={{...btn("g"),flex:1,border:`1px solid ${C.border}`}} onClick={()=>setShowProjForm(false)}>انصراف</button><button style={{...btn("p"),flex:2}} onClick={submitProj}>ایجاد</button></div></Sheet>}

      {showTaskForm&&<Sheet title="وظیفه جدید" onClose={()=>setShowTaskForm(false)}>{lbl("عنوان")}<input style={fi} placeholder="عنوان وظیفه..." value={newTask.title} onChange={e=>setNewTask(p=>({...p,title:e.target.value}))}/>{lbl("شرح کامل")}<textarea style={{...fi,height:90,resize:"none",direction:"rtl",textAlign:"right",fontFamily:"'Vazirmatn',sans-serif",lineHeight:1.8}} placeholder="توضیح دهید..." defaultValue={newTask.desc} onBlur={e=>setNewTask(p=>({...p,desc:e.target.value}))} key={showTaskForm?"open":"closed"}/>{lbl("مسئول")}<select style={fi} value={newTask.assignedTo} onChange={e=>setNewTask(p=>({...p,assignedTo:e.target.value}))}>{USERS.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>{lbl("اولویت")}<select style={fi} value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))}><option value="high">مهم</option><option value="medium">متوسط</option><option value="low">عادی</option></select>{lbl("سررسید")}<input style={fi} placeholder="۱۴۰۴/۰۵/۱۵" value={newTask.due} onChange={e=>setNewTask(p=>({...p,due:e.target.value}))}/><div style={{display:"flex",gap:8}}><button style={{...btn("g"),flex:1,border:`1px solid ${C.border}`}} onClick={()=>setShowTaskForm(false)}>انصراف</button><button style={{...btn("p"),flex:2}} onClick={submitTask}>افزودن</button></div></Sheet>}


      {/* Letter Detail */}
      {openLetter&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:80,display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top)"}}>
          <div style={{height:52,display:"flex",alignItems:"center",padding:"0 14px",background:C.surface,borderBottom:`1px solid ${C.border}`,gap:12,flexShrink:0}}>
            <button onClick={()=>setOpenLetter(null)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",display:"flex"}}><Icons.Back/></button>
            <div style={{flex:1,fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{openLetter.subject}</div>
            {openLetter.priority==="high"&&<span style={{fontSize:11,background:C.danger+"22",color:C.danger,padding:"2px 8px",borderRadius:10,fontWeight:600}}>فوری</span>}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:16}}>
            <div style={{...card,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
                <Av user={USERS.find(u=>u.id===openLetter.from)} size={40}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{USERS.find(u=>u.id===openLetter.from)?.name}</div>
                  <div style={{fontSize:11,color:C.textDim}}>{USERS.find(u=>u.id===openLetter.from)?.role}</div>
                </div>
                <div style={{fontSize:11,color:C.textDim}}>{openLetter.date}</div>
              </div>
              {openLetter.to.length>0&&<div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>به: {openLetter.to.map(id=>USERS.find(u=>u.id===id)?.name).join("، ")}</div>}
              {openLetter.cc.length>0&&<div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>رونوشت: {openLetter.cc.map(id=>USERS.find(u=>u.id===id)?.name).join("، ")}</div>}
            </div>
            <div style={{...card,lineHeight:2,fontSize:14,whiteSpace:"pre-line"}}>{openLetter.body}</div>
            {openLetter.attachments.length>0&&(
              <div style={{...card,marginTop:12}}>
                <div style={{fontSize:12,color:C.teal,fontWeight:700,marginBottom:8}}>پیوست‌ها</div>
                {openLetter.attachments.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:20}}>📎</span>
                    <span style={{fontSize:13,flex:1}}>{a.name}</span>
                    <span style={{fontSize:11,color:C.textDim}}>{a.size}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Workflow Timeline */}
            {openLetter.workflow&&(
              <div style={{...card,marginTop:12}}>
                <WorkflowTimeline workflow={openLetter.workflow} users={USERS}/>
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={()=>{
                // Add referral step to workflow
                const newStep={step:(openLetter.workflow?.length||0)+1,title:"ارجاع داده شد",userId:me.id,action:"sent",time:nowShamsi(),done:true};
                setLetters(ls=>ls.map(l=>l.id===openLetter.id?{...l,workflow:[...(l.workflow||[]),newStep]}:l));
                setCompose({to:openLetter.to,subject:"ارجاع: "+openLetter.subject,body:openLetter.body,priority:openLetter.priority,attachments:[]});
                setShowCompose(true);setOpenLetter(null);
              }} style={{...btn("g"),flex:1,padding:"12px",border:`1px solid ${C.border}`}}>ارجاع</button>
              <button onClick={()=>{
                setCompose({to:[openLetter.from],subject:"پاسخ: "+openLetter.subject,body:"\n\n--- پیام اصلی ---\n"+openLetter.body,priority:"normal",attachments:[]});
                setShowCompose(true);setOpenLetter(null);
              }} style={{...btn("p"),flex:1,padding:"12px"}}>پاسخ</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Sheet */}
      {showCompose&&(
        <div style={{position:"fixed",inset:0,background:"#000A",display:"flex",alignItems:"flex-end",zIndex:90}}>
          <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"20px 20px calc(20px + env(safe-area-inset-bottom))",width:"100%",maxWidth:520,margin:"0 auto",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:15,fontWeight:700}}>نامه جدید</span>
              <button onClick={()=>setShowCompose(false)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:20}}>×</button>
            </div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:5}}>گیرنده</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
              {USERS.filter(u=>u.id!==me.id).map(u=>{
                const sel=compose.to.includes(u.id);
                return<div key={u.id} onClick={()=>setCompose(p=>({...p,to:sel?p.to.filter(x=>x!==u.id):[...p.to,u.id]}))}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px 4px 6px",borderRadius:20,cursor:"pointer",fontSize:12,background:sel?C.tealDim:C.surfaceAlt,color:sel?C.teal:C.textMuted,border:`1px solid ${sel?C.teal:C.border}`}}>
                  <Av user={u} size={20}/>{u.lastName}
                </div>;
              })}
            </div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:5}}>موضوع</div>
            <input style={{...fi}} placeholder="موضوع نامه..." value={compose.subject} onChange={e=>setCompose(p=>({...p,subject:e.target.value}))}/>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:5}}>اولویت</div>
            <select style={fi} value={compose.priority} onChange={e=>setCompose(p=>({...p,priority:e.target.value}))}>
              <option value="normal">عادی</option>
              <option value="high">فوری</option>
            </select>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:5}}>متن نامه</div>
            <textarea style={{...fi,height:140,resize:"none"}} placeholder="متن نامه را بنویسید..." defaultValue={compose.body} onBlur={e=>setCompose(p=>({...p,body:e.target.value}))}/>
            <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:C.surfaceAlt,borderRadius:8,cursor:"pointer",marginBottom:12}}>
              <Icons.Attach/><span style={{fontSize:13,color:C.textMuted}}>افزودن پیوست</span>
              <input type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;setCompose(p=>({...p,attachments:[...p.attachments,{name:f.name,size:(f.size/1024).toFixed(0)+"KB"}]}));e.target.value="";}}/>
            </label>
            {compose.attachments.length>0&&<div style={{marginBottom:12}}>{compose.attachments.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",fontSize:12,color:C.textMuted}}><span>📎</span><span style={{flex:1}}>{a.name}</span><span>{a.size}</span><button onClick={()=>setCompose(p=>({...p,attachments:p.attachments.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:16}}>×</button></div>)}</div>}
            <div style={{display:"flex",gap:8}}>
              <button style={{...btn("g"),flex:1,border:`1px solid ${C.border}`}} onClick={()=>setShowCompose(false)}>انصراف</button>
              <button style={{...btn("p"),flex:2}} onClick={()=>{
                if(!compose.to.length||!compose.subject.trim()) return;
                const newLetter={id:Date.now(),from:me.id,to:compose.to,cc:[],subject:compose.subject,body:compose.body,status:"sent",priority:compose.priority,date:"همین الان",read:true,attachments:compose.attachments};
                setLetters(p=>[newLetter,...p]);
                setShowCompose(false);
              }}>ارسال نامه</button>
            </div>
          </div>
        </div>
      )}


      {/* Change PIN Sheet — غیرفعال، فقط راهنمای تماس با ادمین */}
      {showChangePIN&&(
        <div style={{position:"fixed",inset:0,background:"#000A",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:110}} onClick={()=>{setShowChangePIN(false);setPinChangeMsg("");}}>
          <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:480,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 20px"}}>
            </div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>تنظیمات حساب</div>
            <div style={{fontSize:14,color:C.textMuted,lineHeight:1.7,marginBottom:24}}>
              برای تغییر رمز عبور با مدیر سیستم تماس بگیرید.
            </div>
            <div style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px",fontSize:13,color:C.teal,direction:"ltr",marginBottom:24,wordBreak:"break-all"}}>
              بدون رمز فعلی امکان تغییر وجود ندارد.
            </div>
            <button onClick={()=>{setShowChangePIN(false);setPinChangeMsg("");}} style={{width:"100%",padding:"12px",borderRadius:10,background:C.teal,border:"none",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              بسته
            </button>
          </div>
        </div>
      )}

      {showPayForm&&<NewPaymentForm me={me} onSave={p=>{setPayments(ps=>[p,...ps]);}} onClose={()=>setShowPayForm(false)}/>}


      {/* ── فرم مشتری جدید ── */}
      {showCustForm&&(
        <div style={{position:"fixed",inset:0,background:"#000A",display:"flex",alignItems:"flex-end",zIndex:99}} onClick={()=>setShowCustForm(false)}>
          <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"20px 20px calc(24px + env(safe-area-inset-bottom))",width:"100%",maxWidth:520,margin:"0 auto",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>مشتری جدید</div>
            {[
              ["نام شرکت/مشتری","name","text"],
              ["شهر","city","text"],
              ["مسئول خرید","contact","text"],
              ["تلفن","phone","tel"],
              ["شماره حساب/شبا","account","text"],
            ].map(([lbl,key,type])=>(
              <div key={key} style={{marginBottom:10}}>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>{lbl}</div>
                <input style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",direction:key==="account"?"ltr":"rtl",textAlign:key==="account"?"left":"right",boxSizing:"border-box",fontFamily:"inherit"}}
                  value={newCust[key]||""} onChange={e=>setNewCust(p=>({...p,[key]:e.target.value}))} type={type}/>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>نوع</div>
                <select style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit",WebkitAppearance:"none"}}
                  value={newCust.type} onChange={e=>setNewCust(p=>({...p,type:e.target.value}))}>
                  {["کارخانه","تاجر","توزیع‌کننده","پیمانکار","سایر"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>درجه</div>
                <select style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit",WebkitAppearance:"none"}}
                  value={newCust.grade} onChange={e=>setNewCust(p=>({...p,grade:e.target.value}))}>
                  {["طلایی","نقره‌ای","معمولی"].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowCustForm(false)} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>انصراف</button>
              <button onClick={()=>{
                if(!newCust.name.trim()) return;
                const nc = {...newCust, id:Date.now(), debt:0, orders:[], notes:[], createdAt:dateShamsi(new Date()), av:newCust.name[0]};
                supa('POST','crm_customers',{name:nc.name,type:nc.type,city:nc.city,phone:nc.phone,contact:nc.contact,grade:nc.grade,account:nc.account,av:nc.av}).catch(()=>{});
                setCustomers(p=>[nc,...p]);
                setNewCust({name:"",type:"کارخانه",city:"",phone:"",contact:"",grade:"معمولی",account:"",av:""});
                setShowCustForm(false);
              }} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:C.teal,color:"#111",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>ذخیره</button>
            </div>
          </div>
        </div>
      )}

      {/* ── فرم سفارش جدید ── */}
      {showOrderForm&&(
        <div style={{position:"fixed",inset:0,background:"#000A",display:"flex",alignItems:"flex-end",zIndex:99}} onClick={()=>setShowOrderForm(false)}>
          <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"20px 20px calc(24px + env(safe-area-inset-bottom))",width:"100%",maxWidth:520,margin:"0 auto",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>سفارش جدید</div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>مشتری</div>
            <select style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit",WebkitAppearance:"none",marginBottom:10}}
              value={newCrmOrder.customerId} onChange={e=>setNewCrmOrder(p=>({...p,customerId:Number(e.target.value)}))}>
              <option value="">انتخاب مشتری...</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {[
              ["محصول","product","text","مثلاً: ورق گرم ۳mm"],
              ["مبلغ (تومان)","amount","tel",""],
            ].map(([lbl,key,type,ph])=>(
              <div key={key} style={{marginBottom:10}}>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>{lbl}</div>
                <input style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",direction:"rtl",textAlign:"right",boxSizing:"border-box",fontFamily:"inherit"}}
                  placeholder={ph} value={newCrmOrder[key]||""} onChange={e=>setNewCrmOrder(p=>({...p,[key]:e.target.value}))} type={type}/>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>مقدار</div>
                <input style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit"}}
                  type="tel" placeholder="۰" value={newCrmOrder.qty||""} onChange={e=>setNewCrmOrder(p=>({...p,qty:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>واحد</div>
                <select style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",fontFamily:"inherit",WebkitAppearance:"none"}}
                  value={newCrmOrder.unit} onChange={e=>setNewCrmOrder(p=>({...p,unit:e.target.value}))}>
                  {["تن","کیلوگرم","متر","عدد"].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowOrderForm(false)} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>انصراف</button>
              <button onClick={()=>{
                if(!newCrmOrder.customerId||!newCrmOrder.product) return;
                const no = {...newCrmOrder, id:Date.now(), status:"ثبت", date:dateShamsi(new Date())};
                setCrmOrders(p=>[no,...p]);
                setNewCrmOrder({customerId:"",product:"",qty:"",unit:"تن",amount:"",status:"ثبت",desc:""});
                setShowOrderForm(false);
              }} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:C.teal,color:"#111",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>ثبت سفارش</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDlg cfg={confirm} onClose={()=>setConfirm(null)}/>
    </div>
  );
}