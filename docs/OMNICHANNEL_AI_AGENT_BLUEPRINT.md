# Omnichannel AI Communication & Growth Agent Blueprint

> مستند معماری و نقشهٔ اجرایی — ثبت رسمی در اسناد پروژه (تسک D0).
> این سند فقط مستندسازی است؛ هیچ تغییری در سورس، deploy یا migration انجام نشده است.

## 1. Document Status

- **Status:** Proposed — pending implementation approval
- **Document type:** Architecture and execution blueprint
- **Source-of-truth scope:** معماری کلان ارتباطات چندکاناله و عامل هوشمند رشد (Omnichannel AI Communication & Growth Agent)؛ مالکیت مفهومی بین `backend/`، `whatsapp-broadcast-api/`, `admin-panel/`, `messenger-app/`.
- **Created date:**
  - Gregorian: 2026-07-14
  - Jalali: ۱۴۰۵/۰۴/۲۳
- **Source changes:** No
- **Deployment:** No

وضعیت «Approved» از هیچ سند یا تصمیم ثبت‌شده‌ای قابل اثبات نیست؛ لذا عبارت **Proposed — pending implementation approval** ثبت می‌شود و حدس نزده شده است.

## 2. Executive Summary

محصول آینده نباید صرفاً یک «پنل واتساپ» باشد. هدف‌گذاری محصول به این شکل تعریف می‌شود:

**Omnichannel AI Communication & Growth Agent**

این سیستم باید:
- WhatsApp و Bale را به‌صورت first-class channel پشتیبانی کند.
- channel-agnostic باشد (منطق کسب‌وکار به یک کانال خاص گره نخورد).
- گفتگو و هویت مشتری را در کانال‌های مختلف یکپارچه کند (Unified Conversation + Customer 360).
- AI را فقط یک chatbot نداند؛ بلکه آن را عامل عملیاتی (operational agent) ببیند.
- AI را کنترل‌شده، دارای سیاست (policy)، مجوز (permission) و قابل ممیزی (auditable) پیاده کند.
- برای بازار ایران، قطعی یا ناپایداری کانال‌ها (مثل فیلترینگ) را در طراحی لحاظ کند (fallback و routing هوشمند).

## 3. Product Principles

1. **Customer-centric, not channel-centric** — اولویت با مشتری است نه کانال.
2. **Channel adapters must be isolated** — هر adapter فقط ورودی/خروجی کانال را انجام دهد.
3. **One unified customer and conversation timeline** — یک خط زمانی یکپارچه ولی channel-attributed.
4. **WhatsApp and Bale are first-class channels** — پشتیبانی درجه‌یک از هر دو.
5. **AI actions require policies, permissions and audit logs** — هیچ عمل خودکار بدون سیاست/مجوز/لاگ.
6. **Human-in-the-loop by default** — پیش‌فرض حضور انسان در تصمیم‌های حساس.
7. **Sensitive facts must come from approved sources** — قیمت/وضعیت سفارش/گارانتی فقط از منبع تأییدشده.
8. **Price must be provided via the approved portal flow only** — طبق AGENTS.md، قیمت عمده در واتساپ ممنوع؛ فقط هدایت به پورتال.
9. **No sales phone should be invented or supplied by AI** — شماره تماس ساختگی ممنوع.
10. **Cross-channel continuity must preserve context** — انتقال بین کانال نباید context را از بین ببرد.
11. **No new API base URL may be hardcoded** — طبق DEVELOPMENT_RULES و قواعد تسک.
12. **Existing production service ownership must be preserved** — مالکیت سرویس‌های موجود حفظ شود، بازنویسی کور نشود.

## 4. AI Agent Operating Model

نقش AI در پنج سطح مستند می‌شود:

### 1) Observe
- **Input:** رویدادهای ورودی کانال، پیام‌ها، متادیتا.
- **Output:** مشاهده خام، لاگ دریافت.
- **Allowed actions:** خواندن/ذخیره‌سازی رویداد (درون جداول مجاز).
- **Required approval:** ندارد.
- **Audit requirements:** ثبت ورود رویداد (agent_run_started و context_retrieved در صورت نیاز).
- **Failure behavior:** در صورت خطا، رویداد در inbox ثبت شود و پردازش متوقف گردد (مثل رفتار فعلی webhook).

### 2) Understand
- **Input:** پیام نرمال‌شده، تاریخچه، پروفایل مشتری.
- **Output:** intent, sentiment, urgency, classification, خلاصه.
- **Allowed actions:** استنتاج (تحلیل)، برچسب‌گذاری موقت.
- **Required approval:** ندارد (تحلیل فقط).
- **Audit requirements:** ثبت نتایج استنتاج به‌صورت قابل ردیابی (بدون ذخیرهٔ raw chain-of-thought).
- **Failure behavior:** در صورت عدم قطعیت، intent را FALLBACK/UNKNOWN ثبت کند و به مسیر خنثی یا انسان ارجاع دهد.

### 3) Recommend
- **Input:** خروجی Understand + سیاست‌ها.
- **Output:** suggested reply, next best action, best channel, follow-up suggestion.
- **Allowed actions:** تولید پیش‌نهاد (draft).
- **Required approval:** تأیید انسان برای ارسال پیش‌نهاد حساس.
- **Audit requirements:** recommendation_created + منبع پیش‌نهاد.
- **Failure behavior:** در صورت عدم قطعیت، «عدم اطمینان» اعلام و escalate شود.

### 4) Act
- **Input:** پیش‌نهادِ تأییدشده + مجوز ابزار.
- **Output:** ارسال پیام، ثبت lead، ایجاد follow-up، routing، escalation.
- **Allowed actions:** فقط ابزارهای مجازِ سطح autonomous مشخص‌شده.
- **Required approval:** per-tool permission + در موارد حساس تأیید انسان.
- **Audit requirements:** tool_execution_started/succeeded/failed + ورودی/خروجی ابزار (با redaction).
- **Failure behavior:** خطا → compensating action/rollback where possible + ثبت در audit.

### 5) Learn
- **Input:** بازخورد اپراتور، نتایج outcome، برچسب‌ها.
- **Output:** بهبود پرامپت/مدل (offline)، به‌روزرسانی دانش بازبینی‌شده.
- **Allowed actions:** یادگیری غیرمستقیم (offline evaluation) — نه self-modifying production agent.
- **Required approval:** بازبینی انسان روی تغییرات پرامپت/مدل.
- **Audit requirements:** نسخه پرامپت/مدل، مجموعه ارزیابی، نتایج.
- **Failure behavior:** یادگیری نباید رفتار زنده را بدون انتشار کنترل‌شده تغییر دهد.

## 5. AI Autonomy Levels

### Level 0 — Analysis only
- summary, intent, sentiment, urgency, classification.
- هیچ عمل نوشتنی در سیستم کسب‌وکار؛ فقط مشاهده/تحلیل.

### Level 1 — Recommendation
- suggested reply, next best action, best channel suggestion, follow-up suggestion.
- **human confirmation required** پیش از هر ارسال/ثبت.

### Level 2 — Limited controlled action
- auto-tagging, lead draft, follow-up draft یا creation طبق policy, routing suggestion یا permitted low-risk routing, approved acknowledgement messages.
- همه با محدودیت سیاست و لاگ.

### Level 3 — Guarded autonomous operation
- automatic follow-up, policy-based channel switching, escalation, approved campaign execution.
- strict limits + audit + kill switch اجباری.

**Initial implementation target:**
> Level 1 plus selected low-risk Level 2 capabilities.
>
> Level 3 is explicitly out of MVP scope.

## 6. Core AI Capabilities

حداقل قابلیت‌های زیر مستند می‌شوند (مفهومی؛ بدون انتساب به پیاده‌سازی موجود بدون evidence):
- intent detection
- sentiment detection
- urgency detection
- lead qualification and scoring
- conversation summarization
- suggested replies
- next best action
- next best channel
- follow-up generation
- complaint and escalation detection
- CRM field extraction
- product-interest extraction
- voice-note transcription and analysis
- semantic search
- customer memory
- operator quality assistance
- campaign recommendations
- churn and win-back suggestions
- cross-channel conversation continuity

## 7. Omnichannel Architecture

معماری مفهومی:

```
Channel Adapters
  - WhatsApp
  - Bale
  - future SMS / Telegram / Internal adapters
        ↓
Inbound Verification and Security
        ↓
Message Normalization
        ↓
Identity Resolution
        ↓
Unified Conversation Store
        ↓
Customer 360
        ↓
AI Agent Orchestrator
        ↓
Policy and Guardrail Engine
        ↓
Human Approval Workflow
        ↓
Action Executor
        ↓
Audit and Observability
```

**تأکیدهای اجباری:**
- business logic نباید در WhatsApp adapter محبوس شود.
- `whatsapp-broadcast-api/` نباید به‌صورت ضمنی مالک کل CRM یا AI orchestration شود؛ طبق PROJECT_MAP این سرویس «تنها endpoint زنده» اش `api/webhook.js` است و adapter ورودی/خروجی واتساپ است، نه مالک orchestration.
- مالکیت دقیق runtime components باید در فاز طراحی فنی (P1) با بررسی سورس قطعی شود.
- این سند ownership تأییدنشده را به‌عنوان واقعیت ثبت نمی‌کند.

## 8. Agent Tool Model

ابزارهای مفهومی (در این مرحله فقط conceptual؛ به هیچ endpoint یا پیاده‌سازی موجود بدون evidence نسبت داده نشده‌اند):

| Tool | نوع | Risk class | Approval | Idempotency | Audit |
|---|---|---|---|---|---|
| search_knowledge_base | read-only | low | no | n/a | yes (query ref) |
| get_customer_profile | read-only | medium (PII) | no | n/a | yes |
| get_conversation_history | read-only | medium (PII) | no | n/a | yes |
| get_order_status | read-only | medium | no | n/a | yes |
| draft_reply | write (draft) | low | human confirm before send | n/a | yes |
| send_message | write | high | per-policy / human | dedupe required | yes |
| create_lead | write | medium | policy-based | idempotent by phone | yes |
| update_lead | write | medium | policy-based | idempotent | yes |
| create_follow_up | write | medium | policy-based | idempotent | yes |
| create_ticket | write | medium | policy-based | idempotent | yes |
| escalate_conversation | write | high | human/auto per policy | idempotent | yes |
| route_channel | write | high | policy-based | idempotent | yes |
| create_campaign_draft | write (draft) | high | human approval | n/a | yes |
| get_channel_health | read-only | low | no | n/a | yes (metadata) |

## 9. Smart Channel Routing

عوامل تصمیم‌گیری:
- customer channel preference
- last successful channel
- delivery history
- response probability
- channel health
- message type
- urgency
- cost
- consent
- quiet hours
- internal policy

**Fallback باید:**
- policy-driven باشد
- قابل خاموش‌کردن (kill switch) باشد
- consent-aware باشد
- duplicate-send protection داشته باشد
- audit شود
- در ارسال‌های حساس نیازمند approval باشد

## 10. Customer Identity and Conversation Continuity

- یک contact می‌تواند چند channel identity داشته باشد.
- merge هویت باید کنترل‌شده و قابل ممیزی باشد (review-based، نه خودکار).
- شماره موبایل به‌تنهایی همیشه اثبات قطعی یکسان‌بودن هویت نیست.
- conversation timeline باید یکپارچه ولی channel-attributed باشد.
- AI summary باید منبع پیام‌ها را حفظ کند.
- cross-channel انتقال نباید context را از بین ببرد.

## 11. Knowledge and Grounding Policy

- پاسخ‌های حساس باید grounded باشند.
- قیمت فقط از portal/policy تأییدشده (طبق AGENTS.md: قیمت عمده در واتساپ ممنوع).
- وضعیت سفارش فقط از backend معتبر.
- شرایط گارانتی فقط از knowledge source تأییدشده (مطابق `docs/warranty-scenario.txt`).
- در نبود evidence، AI باید عدم قطعیت را اعلام و escalate کند.
- AI نباید URL، شماره تماس، تخفیف، موجودی یا تعهد ساختگی تولید کند.
- هر پاسخ دارای منبع حساس باید traceable باشد.

## 12. Human-in-the-loop and Guardrails

الزامات:
- approval queue
- per-tool permissions
- per-channel AI enable/disable
- per-tenant / organizational policy
- confidence thresholds
- escalation thresholds
- rate limits
- budget limits
- content policy
- prompt-injection resistance
- PII minimization
- full action audit log
- emergency kill switch
- rollback یا compensating action where possible

## 13. AI Memory Design

تفکیک بین:
- raw message history
- generated conversation summary
- verified customer facts
- inferred preferences
- temporary working memory
- long-term business memory

الزامات:
- inference با fact مخلوط نشود.
- confidence و provenance ذخیره شود.
- اپراتور امکان اصلاح داشته باشد.
- retention policy تعریف شود.
- داده حساس بدون ضرورت در promptها ارسال نشود.

## 14. AI Learning and Evaluation

«Learn» به معنی self-modifying production agent نیست. یادگیری از طریق:
- operator accept/edit/reject feedback
- outcome labels
- resolved intents
- successful follow-ups
- channel delivery / response outcomes
- reviewed knowledge updates
- offline evaluation datasets
- controlled prompt/model releases

معیارهای ارزیابی:
- intent accuracy
- unsafe-action rate
- hallucination rate
- reply acceptance rate
- operator edit distance
- time to first response
- follow-up completion
- conversion assistance
- escalation precision
- channel delivery success
- customer opt-out rate
- cost per resolved interaction

## 15. AI Observability and Audit

eventهای قابل ثبت در آینده (حداقل):
- agent_run_started
- context_retrieved
- model_invoked
- recommendation_created
- approval_requested
- approval_granted
- approval_rejected
- tool_execution_started
- tool_execution_succeeded
- tool_execution_failed
- message_routed
- fallback_triggered
- escalation_created
- agent_run_completed

**ذخیره raw chain-of-thought پیشنهاد نمی‌شود.** به‌جای آن ثبت شود:
- concise decision rationale
- source references
- policy decision
- tool inputs/outputs with redaction
- model/prompt version
- latency/cost metadata

## 16. Security Dependencies

شکاف‌های فعلی شناخته‌شده — فقط با ارجاع به evidence از سورس جاری (بازبینی ۱۴۰۵/۰۴/۲۳):

- **webhook authenticity verification — IMPLEMENTED در P0 (۱۴۰۵/۰۴/۲۳):** پیش از این هیچ تأیید امضای ورودی وجود نداشت (همان یافتهٔ ABSENT در D0). در P0 یک **shared-secret gate** افزوده شد: هدر `X-Webhook-Secret` با `process.env.ULTRAMSG_WEBHOOK_SECRET` بررسی می‌شود (مقایسهٔ constant-time با `crypto.timingSafeEqual`) در `api/_webhook-security.js`؛ هندلر `webhook.js` پیش از هر پردازش POST آن را فراخوانی می‌کند. رفتار **fail-closed**: اگر env ست نباشد یا هدر غایب/غلط باشد → ۴۰۱/۴۰۳ و هیچ پردازشی انجام نمی‌شود. محدودیت: تأیید امضای رسمی ارائه‌دهنده (UltraMsg) در سورس پیدا نشد؛ لذا shared-secret استفاده شد. گام عملیاتی (خارج از patch): تنظیم `ULTRAMSG_WEBHOOK_SECRET` در production و پیکربندی UltraMsg برای ارسال هدر.
- **ghost routes در vercel.json — تأییدشده:** `vercel.json` (خط ۳-۱۷) ۱۳ مسیر تبلیغ می‌کند؛ فقط مقصد `/api/webhook.js` در ریپو موجود است. ۱۲ فایل مقصد دیگر (whatsapp-inbox, send-message, run-migration, create-products, ultramsg-status, health, send-customer-welcome, ai-learning-queue, admin/ai-learning-queue, و catch-allهای whatsapp-broadcast.js) **در ریپو نیستند** → روی Vercel ۴۰۴/۵۰۰ می‌دهند. در P0 حذف نشدند (ریسک تغییر routing در deploy بدون تأیید)؛ **patch پیشنهادی**: حذف ۱۲ مسیر ghost و نگه‌داشتن فقط `/api/webhook` + یک `/api/health` واقعی در صورت نیاز — نیازمند تأیید پیش از اعمال.
- **hardcoded URLs — تأییدشده:** `webhook.js:55` و `webhook.js:1531` لینک `https://wholesale-portal-azure.vercel.app` را hardcode کرده‌اند (متفاوت از `API_BASE` رسمی سایر سرویس‌ها؛ ناهماهنگی محتمل). `webhook.js:49` لینک `www.scorpiongroup.ir` را hardcode دارد که طبق AGENTS.md کانال فروش خردهٔ رسمی است و مجاز است. هیچ‌کدام URL ممنوعهٔ `azarmehr-backend-main.vercel.app` نیستند.
- **CORS / JWT observations — از سورس اثبات‌شده:** `Access-Control-Allow-Origin: *` در `_lib.js:17`. `JWT_SECRET` در بارگذاری ماژول اجباری است (`_lib.js:8`)، اما مسیر وب‌هوک از `requireAuth` استفاده نمی‌کند → تناقض پیکربندی/امنیتی.

**تأکید:** inbound webhook اکنون دارای shared-secret gate است (P0)؛ با این حال اجرای AI action خودکار تا پیش از عبور از کل Phase Gates و تأیید صریح نباید فعال شود.

## 17. UX Surfaces

### admin-panel/ — AI Agent Center
- approval queue
- policies
- automation rules
- knowledge management
- evaluation
- audit log
- channel health
- campaign suggestions

### messenger-app/ — AI Copilot
- conversation summary
- intent / sentiment / urgency
- lead score
- suggested reply
- next best action
- best channel
- customer facts
- risk alerts
- follow-up controls

> قبل از implementation، source ownership هر UI باید دوباره بررسی شود. توجه: طبق PROJECT_MAP، تب projects در `messenger-app` در وضعیت «محلی/دمو، متصل نشده به backend زنده» ثبت شده است؛ لذا ادعای اتصال آن به Unified Inbox باید در P1 با سورس قطعی شود.

## 18. Execution Phases

### D0 — Documentation and architecture baseline
- تسک فعلی؛ بدون تغییر سورس؛ بدون deploy.

### P0 — Security prerequisite
- **Primary target:** `whatsapp-broadcast-api/`
- **Scope:** تأیید طراحی امنیتی وب‌هوک فعلی؛ انتخاب مکانیزم تأیید پشتیبانی‌شده توسط ارائه‌دهنده؛ رد رویدادهای جعلی/تکراری (forged/replayed)؛ تعریف رفتار safe health endpoint؛ حل یا مستندسازی ghost routes؛ smoke tests؛ **بدون AI action خودکار پیش از تکمیل**.

### P1 — Current-state technical discovery
- **Targets:** `backend/`, `whatsapp-broadcast-api/`, `messenger-app/`, `admin-panel/`
- **Scope:** route inventory, table inventory, ownership map, مدل‌های موجود conversation/message/contact, پیاده‌سازی موجود AI/intent/menu، اجزای قابل‌استفاده مجدد، مرزهای legacy، نقشه وابستگی API.
- **Deliverable:** gap analysis آمادهٔ پیاده‌سازی، بدون ویرایش speculative.

### P2 — Domain and data design
- **Primary target:** `backend/`
- **Scope:** channel, channel identity, conversation, message, delivery, agent run, recommendation, approval, tool execution, knowledge reference, audit events.
- **Deliverable:** ابتدا schema/API design؛ migration فقط پس از تأیید صریح.

### P3 — WhatsApp adapter normalization
- **Target:** `whatsapp-broadcast-api/`
- **Scope:** secure webhook input, normalized inbound event, idempotency, message correlation, delivery status handling, بدون تکرار business logic.

### P4 — Bale adapter readiness
- **Target:** پس از P1 تعیین می‌شود.
- **Scope:** امکان‌سنجی provider/API، مدل auth/webhook، قرارداد adapter نرمال‌شده، اثبات مفهوم ورودی/خروجی، بدون فرض برابری payload واتساپ و Bale.

### P5 — AI Copilot MVP
- **Targets:** `backend/` + verified operator UI source.
- **Scope:** summary, intent, sentiment, urgency, suggested reply, next best action, best-channel recommendation, human approval.

### P6 — Controlled Operational Agent
- **Scope:** lead/follow-up creation, escalation, safe routing, انتخابِ low-risk Level 2 actions, tool permissions, idempotency, audit.

### P7 — Growth Agent
- **Scope:** campaign drafts, segmentation suggestions, win-back suggestions, upsell/cross-sell, offline evaluation پیش از فعال‌سازی.

### P8 — Guarded Autonomy
- **Scope:** فقط پس از معیارهای پذیرش ایمنی قابل‌اندازه‌گیری؛ فعال‌سازی opt-in؛ kill switch؛ محدودیت‌های budget/rate؛ نظارت تولید؛ نیازمند تأیید صریح پیش از پیاده‌سازی.

## 19. Phase Gates

برای هر فاز:
- architecture approved
- security prerequisites passed
- source-of-truth confirmed
- backward compatibility assessed
- tests defined before implementation
- smoke test passed
- auditability confirmed
- rollback plan available
- no deployment without explicit instruction

## 20. Non-goals

برای MVP:
- fully autonomous sales agent
- unreviewed price negotiation
- autonomous discount promises
- mass campaign auto-send
- automatic identity merge without review
- replacing human support
- storing hidden chain-of-thought
- broad refactor of unrelated services
- changing legacy/deprecated code
- production deployment

## 21. Risks

| Risk | Impact | Mitigation | Owner category | Phase gate |
|---|---|---|---|---|
| forged webhook events | اجرای ربات با پیام جعلی | تأیید امضای ارائه‌دهنده + reject forged/replayed (P0) | whatsapp-broadcast-api | P0 |
| hallucinated business facts | آسیب اعتماد/فروش غلط | grounding اجباری + escalation در عدم قطعیت (§۱۱) | backend/AI | P2/P5 |
| duplicate sends | آزار مشتری/هزینه | idempotency + duplicate-send protection (§۹) | Action Executor | P3/P6 |
| wrong customer identity merge | نقض حریم/اشتباه | merge کنترل‌شده+review (§۱۰) | backend | P2 |
| cross-channel privacy/consent violations | قانونی/اعتماد | consent-aware routing (§۹) | Policy Engine | P2 |
| excessive automation | سلب کنترل | Level 1+selected L2، kill switch (§۵/§۱۲) | backend | P6 |
| stale knowledge | پاسخ نادرست | reviewed knowledge updates (§۱۴) | admin-panel | P7 |
| prompt injection | دور زدن گارد | prompt-injection resistance (§۱۲) | AI Orchestrator | P5 |
| unbounded model/tool cost | هزینه | budget/rate limits (§۱۲) | backend | P6 |
| vendor/channel outage | توقف سرویس | fallback + channel health (§۷/§۹) | Channel Adapters | P3/P4 |
| provider policy changes | توقف کانال | انزوای adapter + قرارداد نرمال (§۳/§۷) | backend | P1 |
| operator over-reliance | کاهش کیفیت انسانی | human-in-the-loop پیش‌فرض (§۳/§۱۲) | admin-panel | P5 |
| audit gaps | عدم پاسخگویی | full action audit log (§۱۲/§۱۵) | backend | P2 |

## 22. Success Metrics

عملیاتی و تجاری:
- time to first response
- unanswered conversation rate
- follow-up completion rate
- suggested-reply acceptance
- operator edit rate
- conversion assistance
- complaint escalation accuracy
- channel delivery success
- duplicate-send rate
- unsafe-action rate
- hallucination rate
- opt-out rate
- average handling time
- cost per resolved conversation

## 23. Decisions and Open Questions

### Known decisions
- معماری باید channel-agnostic باشد.
- WhatsApp و Bale کانال‌های اولویت‌دار هستند.
- AI یک operational agent است، نه فقط chatbot.
- MVP human-in-the-loop است.
- Level 3 autonomy خارج از MVP است.
- هیچ AI action خودکاری پیش از پیش‌نیاز امنیتی وب‌هوک فعال نشود.
- پاسخ‌های حساس business باید grounded باشند.
- هیچ API base URL جدید hardcoded نشود.
- بدون deploy بدون دستور صریح.

### Open questions
- مالک نهایی runtime از agent orchestration (backend؟).
- جداول نهایی دیتابیس پس از کشف وضعیت فعلی (P1).
- محدودیت‌های provider/API بale.
- سیاست نگهداری پیام (retention).
- مدل رضایت (consent).
- انتخاب model/provider.
- انتخاب embedding/vector storage.
- محدودیت‌های هزینه (cost limits).
- آستانه‌های ارزیابی (evaluation thresholds).
- مجوزهای نقش اپراتور.
- مالکیت دقیق بین admin-panel و messenger-app.

## 24. Change Log

| تاریخ | تغییر | تسک | نویسنده |
|---|---|---|---|
| ۱۴۰۵/۰۴/۲۳ (۲۰۲۶-۰۷-۱۴) | ایجاد اولیهٔ سند Blueprint معماری Omnichannel AI Agent (D0). بدون تغییر سورس/deploy. | D0-OMNICHANNEL-AI-DOCUMENTATION | documentation-only |
| ۱۴۰۵/۰۴/۲۳ (۲۰۲۶-۰۷-۱۴) | **P0 — امن‌سازی webhook ورودی:** افزودن `api/_webhook-security.js` (shared-secret gate + idempotency) و اتصال به `webhook.js` (fail-closed). `ULTRAMSG_WEBHOOK_SECRET` اجباری شد. GET health پایدار ماند. ghost routes مستند شدند (حذف نشدند). | P0-WHATSAPP-WEBHOOK-SECURITY | security patch (no deploy) |

---

> این سند طبق قواعد پروژه (AGENTS.md / DEVELOPMENT_RULES.md) فقط مستندسازی است. هرگونه پیاده‌سازی باید پس از عبور از Phase Gates و با دستور صریح انجام شود.
