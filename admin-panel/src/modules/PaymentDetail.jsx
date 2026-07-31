export function PaymentDetail({payment, me, onBack, onAction, isAdmin}) {
  const [note, setNote] = useState("");
  const myStep = payment.workflow.find(w => w.assignedTo===me.id && w.status==="pending");
  const currentStepNum = payment.workflow.filter(w=>w.status==="done").length + 1;

  return (
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",fontSize:24,lineHeight:1,padding:0}}>â€¹</button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700}}>{payment.code}</div>
          <div style={{fontSize:11,color:statusColor(payment.status)}}>{statusLabel(payment.status)}</div>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:C.teal}}>{fmt(payment.amount)} ØªÙˆÙ…Ø§Ù†</div>
      </div>

      {/* Info Card */}
      <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[
            ["Ù†ÙˆØ¹",payment.type],["ØªØ§Ø±ÛŒØ®",payment.date],
            ["Ø´Ø±Ø­",payment.desc],["Ø´Ù…Ø§Ø±Ù‡ Ù…Ø±Ø¬Ø¹",payment.ref||"â€”"],
          ].map(([k,v],i)=>(
            <div key={i} style={{gridColumn:i===2||i===3?"1/-1":"auto"}}>
              <div style={{fontSize:10,color:C.textDim,marginBottom:3}}>{k}</div>
              <div style={{fontSize:13,color:C.text,fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
          <div style={{fontSize:10,color:C.textDim,marginBottom:3}}>Ø°ÛŒÙ†ÙØ¹ / Ú¯ÛŒØ±Ù†Ø¯Ù‡</div>
          <div style={{fontSize:13,fontWeight:600}}>{payment.beneficiary}</div>
          {payment.bankAccount && (
            <div style={{fontSize:11,color:C.textMuted,marginTop:3,direction:"ltr",textAlign:"right"}}>{payment.bankAccount}</div>
          )}
        </div>
      </div>

      {/* Workflow Timeline */}
      <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:C.textMuted}}>Ù…Ø³ÛŒØ± ØªØ£ÛŒÛŒØ¯</div>
        {payment.workflow.map((step,i)=>{
          const user = USERS.find(u=>u.id===step.assignedTo);
          const isLast = i===payment.workflow.length-1;
          const isCurrent = step.status==="pending" && (i===0 || payment.workflow[i-1].status==="done");
          const dotColor = step.status==="done"?C.success:step.status==="rejected"?C.danger:isCurrent?C.warning:C.border;
          return (
            <div key={i} style={{display:"flex",gap:12,position:"relative",paddingBottom:isLast?0:4}}>
              {!isLast && <div style={{position:"absolute",right:11,top:28,width:2,bottom:0,background:step.status==="done"?C.success:C.border}}/>}
              <div style={{width:24,height:24,borderRadius:"50%",background:step.status==="done"?dotColor:"transparent",border:`2px solid ${dotColor}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,marginTop:2}}>
                {step.status==="done" && <span style={{fontSize:10,color:"#fff",fontWeight:700}}>âœ“</span>}
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
          <div style={{fontSize:13,fontWeight:700,color:C.warning,marginBottom:10}}>Ù†ÙˆØ¨Øª Ø§Ù‚Ø¯Ø§Ù… Ø´Ù…Ø§Ø³Øª</div>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>{myStep.title}</div>
          <textarea
            style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14,outline:"none",direction:"rtl",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit",lineHeight:1.7,resize:"none",height:80}}
            placeholder="ÛŒØ§Ø¯Ø¯Ø§Ø´Øª (Ø§Ø®ØªÛŒØ§Ø±ÛŒ)..."
            value={note} onChange={e=>setNote(e.target.value)}
          />
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{onAction(payment.id,"rejected",myStep.step,note);onBack();}}
              style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:C.danger+"33",color:C.danger,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
              Ø±Ø¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øª
            </button>
            <button onClick={()=>{onAction(payment.id,"approved",myStep.step,note);onBack();}}
              style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:C.success,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>
              {myStep.role==="treasury"?"Ø«Ø¨Øª Ù¾Ø±Ø¯Ø§Ø®Øª âœ“":"ØªØ£ÛŒÛŒØ¯ Ù…ÛŒâ€ŒÚ©Ù†Ù… âœ“"}
            </button>
          </div>
        </div>
      )}

      {/* Treasury special - payment details */}
      {payment.status==="paid" && (
        <div style={{background:C.success+"11",borderRadius:12,padding:14,border:`1px solid ${C.success}33`,textAlign:"center"}}>
          <div style={{fontSize:20,marginBottom:6}}>âœ“</div>
          <div style={{fontSize:14,fontWeight:700,color:C.success}}>Ù¾Ø±Ø¯Ø§Ø®Øª Ø§Ù†Ø¬Ø§Ù… Ø´Ø¯Ù‡</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:4}}>
            {payment.workflow.find(w=>w.role==="treasury")?.note}
          </div>
        </div>
      )}
    </div>
  );
}
