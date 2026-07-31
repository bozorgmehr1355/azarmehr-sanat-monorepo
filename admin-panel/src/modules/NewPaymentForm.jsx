export function NewPaymentForm({me, onSave, onClose}) {
  const [form, setForm] = useState({
    type:"Ù¾Ø±Ø¯Ø§Ø®Øª Ø¨Ù‡ ØªØ§Ù…ÛŒÙ†â€ŒÚ©Ù†Ù†Ø¯Ù‡", desc:"", amount:"", ref:"",
    beneficiary:"", bankAccount:"",
  });
  const [err, setErr] = useState("");

  function submit() {
    if (!form.desc.trim())        { setErr("Ø´Ø±Ø­ Ù¾Ø±Ø¯Ø§Ø®Øª Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯"); return; }
    if (!form.amount || isNaN(Number(form.amount.replace(/,/g,"")))) { setErr("Ù…Ø¨Ù„Øº Ø±Ø§ Ø¨Ù‡ Ø¯Ø±Ø³ØªÛŒ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯"); return; }
    if (!form.beneficiary.trim()) { setErr("Ù†Ø§Ù… Ø°ÛŒÙ†ÙØ¹ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯"); return; }
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
      date: "Ø§Ù…Ø±ÙˆØ²",
      status: "step2",
      attachments: [],
      workflow: makeWorkflow(me.id).map((w,i) => i===0 ? {...w, status:"done", time:nowShamsi(), note:"Ø«Ø¨Øª Ø´Ø¯"} : w),
    };
    onSave(newP);
    onClose();
  }

  const fi = {width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:15,outline:"none",direction:"rtl",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit",WebkitAppearance:"none"};

  return (
    <div style={{position:"fixed",inset:0,background:"#000A",display:"flex",alignItems:"flex-end",zIndex:99}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"20px 20px calc(24px + env(safe-area-inset-bottom))",width:"100%",maxWidth:520,margin:"0 auto",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù¾Ø±Ø¯Ø§Ø®Øª Ø¬Ø¯ÛŒØ¯</div>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>Ù†ÙˆØ¹ Ù¾Ø±Ø¯Ø§Ø®Øª</div>
        <select style={fi} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
          {PAYMENT_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>Ø´Ø±Ø­ Ù¾Ø±Ø¯Ø§Ø®Øª</div>
        <textarea style={{...fi,height:80,resize:"none",lineHeight:1.7}} placeholder="ØªÙˆØ¶ÛŒØ­ Ú©Ø§Ù…Ù„ Ù¾Ø±Ø¯Ø§Ø®Øª..." defaultValue={form.desc} onBlur={e=>setForm(p=>({...p,desc:e.target.value}))}></textarea>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>Ù…Ø¨Ù„Øº (ØªÙˆÙ…Ø§Ù†)</div>
            <input style={{...fi}} placeholder="Ù…Ø«Ù„Ø§Ù‹: ÛµÛ°Û°Û°Û°Û°Û°" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} type="tel"/>
          </div>
          <div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>Ø´Ù…Ø§Ø±Ù‡ Ù…Ø±Ø¬Ø¹ / ÙØ§Ú©ØªÙˆØ±</div>
            <input style={{...fi}} placeholder="Ø§Ø®ØªÛŒØ§Ø±ÛŒ" value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))}/>
          </div>
        </div>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>Ø°ÛŒÙ†ÙØ¹ / Ú¯ÛŒØ±Ù†Ø¯Ù‡</div>
        <input style={fi} placeholder="Ù†Ø§Ù… Ø´Ø±Ú©Øª ÛŒØ§ Ø´Ø®Øµ" value={form.beneficiary} onChange={e=>setForm(p=>({...p,beneficiary:e.target.value}))}/>

        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>Ø´Ù…Ø§Ø±Ù‡ Ø­Ø³Ø§Ø¨ / Ø´Ø¨Ø§ (Ø§Ø®ØªÛŒØ§Ø±ÛŒ)</div>
        <input style={{...fi,direction:"ltr",textAlign:"left"}} placeholder="IR..." value={form.bankAccount} onChange={e=>setForm(p=>({...p,bankAccount:e.target.value}))}/>

        {/* Workflow preview */}
        <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:11,color:C.textDim,marginBottom:8}}>Ù…Ø³ÛŒØ± ØªØ£ÛŒÛŒØ¯ Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª:</div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",gap:6}}>
            {["Ø´Ù…Ø§","Ø§Ø±Ø¯Ø³ØªØ§Ù†ÛŒ","Ø³Ø±Ø§Ø¬â€ŒØ§Ù„Ø¯ÛŒÙ†ÛŒ","Ú©Ø±ÛŒÙ…â€ŒÙ„Ùˆ","Ø³Ø±Ø§Ø¬â€ŒØ§Ù„Ø¯ÛŒÙ†ÛŒ","Ø§Ø¹Ø±Ø§Ø¨ÛŒ"].map((n,i,arr)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:11,background:C.surface,borderRadius:20,padding:"3px 10px",color:C.textMuted}}>{n}</span>
                {i<arr.length-1 && <span style={{color:C.textDim,fontSize:12}}>â†</span>}
              </div>
            ))}
          </div>
        </div>

        {err && <div style={{background:C.danger+"22",borderRadius:8,padding:"9px 12px",fontSize:13,color:C.danger,marginBottom:10,textAlign:"center"}}>{err}</div>}

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontFamily:"inherit"}}>Ø§Ù†ØµØ±Ø§Ù</button>
          <button onClick={submit} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:C.teal,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>Ø§Ø±Ø³Ø§Ù„ Ø¨Ø±Ø§ÛŒ ØªØ£ÛŒÛŒØ¯</button>
        </div>
      </div>
    </div>
  );
}
