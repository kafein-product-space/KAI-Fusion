# Create a Markdown interview prep pack for download
content = r"""
# AI Systems Engineer (No-Code + Agents + Automation) — Mülakat Paketi (kitUP)

**Hazırlayan:** Senin deneyimlerine göre özelleştirilmiş hızlı çalışma seti  
**Kapsam:** 20 teknik SSS + 10 senaryo + 10 kültür/soft-skill + açılış konuşması, demo planı, metrikler, kontrol listesi  
**Not:** Cevaplar 1. tekil şahıs olarak yazıldı ki mülakatta direkt okuyup/anlatabilesin. Köşeli parantezli yerleri kendi rakamlarınla güncelle.

---

## 0) 120 saniyelik açılış konuşması (script)
“Merhaba, ben Baha. Şu an Kafein Technology’de AI Engineer intern olarak; **LangChain/LangGraph, FastMCP, n8n**, Zapier/Make ve **Supabase PGVector** tabanlı RAG sistemleriyle **agent ve otomasyon** geliştiriyorum. En son, HR için **vektör arama + reranking** tabanlı bir CV arama asistanı ve Slack’te çalışan birkaç **async agent** kurguladım. Zor problemleri hızlı MVP’lere dönüştürmeyi, **no-code ile code’u harmanlayarak** en kısa yoldan üretime taşımayı seviyorum.  
KitUP’ta ilgi duyduğum şey, **operasyonel problemi haritalayıp** uçtan uca çözüm tasarlama özgürlüğü: API’ler, webhooks, veri modeli, otomasyon akışı, gözlemleme ve iterasyon. Benim yaklaşımım: **etki odaklı**, ölçülebilir ve sade çözümler; gereksiz karmaşıklıktan kaçınmak. Kısacası, ‘chat’ yazıp bırakmıyorum; **işe yarayan sistemler** kuruyorum.”

---

## 1) STAR hikayeleri (3 adet, kısa anlatım şablonu)

### Hikaye 1 — HR Semantic Search & Assistant (RAG + PGVector + Slack)
- **S**: HR ekibi CV’lerde aradığı yetkinlikleri bulmakta zorlanıyordu, manuel arama çok zaman alıyordu.
- **T**: CV’leri hızlı indeksleyip semantik arama + keyword match + skorlamayla **en iyi adayları** getiren bir sistem kurmak.
- **A**: LangChain + OpenAI embeddings, **Supabase PGVector**, metadata filtreleme; Slack’te hızlı sorgu agent’ı; **eval & logging** için temel metrikler.
- **R**: Arama süresi **[X%]** kısaldı, doğru aday isabeti **[Y%]** arttı; HR haftalık **[Z]** saat kazandı.

### Hikaye 2 — Slack Triage & Async Agents (n8n/FastMCP + Webhooks)
- **S**: Tekrarlayan Slack taleplerinde bottleneck oluşuyordu.
- **T**: Mesajı sınıflandırıp ilgili sisteme yönlendiren, gerektiğinde özet/cevap hazırlayan **triage botu**.
- **A**: n8n + FastMCP; Slack webhook; sınıflandırma → ilgili tool çağrıları → sonuç ve loglama; **idempotent** tasarım ve retry.
- **R**: İlk cevap süresi **[X%]** iyileşti, manuel iş yükü **[Y saat/hafta]** azaldı.

### Hikaye 3 — Rapor Otomasyonu (Zapier/Make + Looker Studio)
- **S**: Dağınık kaynaklardan manuel raporlama yapılıyordu.
- **T**: Stripe/Notion/Airtable/Google Sheets verilerini **günlük otomatik** konsolide etmek.
- **A**: Make/Zapier ile ETL akışları; hata-yakalama, Slack uyarıları; Looker Studio’ya besleme; sürümleme.
- **R**: Rapor hazırlama süresi **[X saat → Y dakika]**, hata oranı **[Z%]** azaldı.

---

## 2) 20 Teknik Soru & Kısa, Net Cevaplar

1) **Bir LLM agent mimarisi nasıl kurarsın?**  
**Cevap:** Girdi → **Prompt template** → **LLM** → **Tool calling** (API/DB/Function) → **Memory** (kısa/uzun süreli) → Çıktı. **Controller/Planner** (LangGraph) ile adımları yönetirim; **guardrails** ve **observability** eklerim (trace, cost, latency).

2) **Tool calling şemasını nasıl tasarlarsın?**  
**Cevap:** JSON-schema ile **gerekli/minimum** parametreler, tip ve constraint’ler; **idempotency key**, **timeout** ve **retry policy**. Yanıtları **pydantic** benzeri doğrulamadan geçirir, hataları sınıflandırırım (user/input, network, provider).

3) **RAG pipeline adımları ve kritik ayarlar?**  
**Cevap:** Loader → Splitter (token/semantik) → Embeddings → **Vector store** → Retrieval (k-NN + MMR) → Context assembly → LLM. **Chunk size/overlap**, **metadata** ve **filters** (ör. departman, tarih) kritiktir; **eval** ile kalite ölçerim (hit rate, answer faithfulness).

4) **PGVector vs Pinecone/Weaviate?**  
**Cevap:** PGVector: **tek DB’de** ACID + vektör; maliyet/operasyon basit. Pinecone/Weaviate: **yüksek ölçek** ve gelişmiş **ANN** özellikleri. Trafik ve SLO’lara göre seçerim; önce PGVector ile başlar, ihtiyaç olursa ayrıştırırım.

5) **LangChain vs LangGraph farkı?**  
**Cevap:** LangChain zincir ve bileşen seti; **LangGraph** ise **durum-makinesi/graph** ile **çok-adımlı akışları deterministik** yönetir (retries, branches). Çok adımlı ajanlarda LangGraph’ı tercih ederim.

6) **Memory stratejileri?**  
**Cevap:** **Kısa süreli** (conversation buffer/summary) + **uzun süreli** (vector DB profili). **Episodik** (oturum bazlı) + **semantik bellek** (kavramsal). **TTL** ve PII temizleme uygularım.

7) **Prompt sağlamlığı ve guardrails?**  
**Cevap:** **System prompt politikası**, **negative constraints**, **tool-first** yaklaşım, **output schema validation**, **test prompts** ve **adversarial cases**. LangSmith ile **golden set** ve **regression** takibi.

8) **MCP/FastMCP ile orkestrasyonun faydası?**  
**Cevap:** Tool’ları **standart arayüzle** expose eder, farklı ajanlar/uygulamalar aynı tool’ları **yeniden kullanır**. İzolasyon, yetkilendirme ve gözlemlenebilirlik kolaylaşır.

9) **Webhook’larda güven ve idempotency?**  
**Cevap:** **Signature verify**, **replay protection**, **idempotency key** (store & check), **exactly-once** yerine **at-least-once** + **safe retry**; **dead-letter queue**.

10) **Rate limit ve geri-çekilme (backoff)?**  
**Cevap:** **Exponential backoff + jitter**, **token bucket**; önbellek/kesinleşmiş sonuçları **cache**; yüksek hacimde **batching**.

11) **Zapier/Make hata yönetimi?**  
**Cevap:** **Error handler branch**, **retry steps**, **storage** ile offset/checkpoint, **alerting** (Slack/Email). Hata sınıfına göre otomatik toparlama ve **manual override**.

12) **Auth desenleri (API key/OAuth2)?**  
**Cevap:** **Secrets vault**, **scopes**, **least privilege**. OAuth2 refresh’inde **graceful refresh & retry**; kimlik doğrulama hatalarını özel log’lar.

13) **PII ve güvenlik?**  
**Cevap:** **Masking/pseudonymization**, **data retention** politikası, **role-based access**, **audit logs**. Prompt içine PII sokmamak, gerekiyorsa **redaction** katmanı.

14) **Async agentlar ve kuyruklar?**  
**Cevap:** No-code tarafında **delayed jobs** ve scheduler; kod tarafında **Celery/RQ + Redis** veya bulut kuyrukları. Uzun işlemleri **callback** veya **webhook** ile tamamlarım.

15) **Test stratejisi (LLM & otomasyon)?**  
**Cevap:** **Unit** (tool adapters), **contract tests** (API), **golden prompts**, **offline eval** (faithfulness/recall), **canary release** ve **A/B**.

16) **Observability (no-code + code)**  
**Cevap:** **Trace id** uçtan uca; merkezi log (JSON), **metrics** (latency, cost, success rate), **structured events**. Hatanın **kök nedenini** gösterecek bağlamı log’larım.

17) **Maliyet optimizasyonu?**  
**Cevap:** **Context kısaltma**, **cache** (semantic/embedding), **distilled modeller**, **function calling** ile kısa cevap; uzun işler **batch & async**. **Token bütçesi**/kullanıcı başı limit.

18) **Sürümleme ve geri alma?**  
**Cevap:** Flow’lar için **versiyon numarası**, **feature flags**, **rollback**. Prompt’lar için **git-versioned** dosyalar ve **release notes**.

19) **No-code vs code seçim kriterleri?**  
**Cevap:** **Zaman-etki** önceliği; basit CRUD/entegrasyon → no-code; özel mantık/performans/ölçek → code. Her iki tarafta da **observability** ve **tests** şart.

20) **Prod’a çıkış ve değişim yönetimi?**  
**Cevap:** **Staging → canary → prod**, **migration plan**, **runbook**, **SLA/SLO**; **post-deployment checks** ve **error budget** takibi.

---

## 3) 10 Senaryo Görevi & Yaklaşım Taslağı

1) **Günlük Gelir Raporu (Stripe → Sheets → Looker)**  
**Yaklaşım:** Make’te scheduler → Stripe API’den son 24 saat ödemeler → normalize → Google Sheets → Looker datasource → Slack’e “done + link”. Hatalarda retry + alert.

2) **Slack Support Triage**  
**Yaklaşım:** Slack event → sınıflandırma (routing labels) → FAQ RAG → gerekirse Jira ticket → özet + öneri cevap. “Low-risk auto-reply”, “needs-human” bayrakları.

3) **Meta Ads Anomali Alarmı**  
**Yaklaşım:** Günlük çekim → baseline/MA → eşik aşıldığında Slack + Notion incident. Root-cause checklist (creative, audience, budget).

4) **Webflow Form → CRM Zenginleştirme**  
**Yaklaşım:** Webhook → email domain → şirket bilgisi enrichment → CRM’e lead + skor → SDR’e Slack DM.

5) **Notion → Airtable Takvim Senkronu**  
**Yaklaşım:** Değişim tetikleyici → mapping tablosu → kural bazlı alan doldurma → çakışma/çifte kayıt engeli.

6) **Internal Knowledge Assistant (Docs RAG)**  
**Yaklaşım:** Git/Notion kaynaklı doküman ingest → splitter/embeddings → PGVector → Slack komutu ile Q&A + kaynak linkleri → feedback loop (helpful/not).

7) **Finans Onay Akışı**  
**Yaklaşım:** Typeform/Forms → kural tabanlı kontrol → onay hiyerarşisi → imza sonrası ERP/API kayıt → PDF arşiv; audit log + immutable id.

8) **E-mail Drafting Assistant**  
**Yaklaşım:** Brief → prompt teması + müşteri geçmişi (RAG) → taslak → onay mekanizması → CRM’e loglama.

9) **Lead Scoring**  
**Yaklaşım:** Davranışsal sinyaller + firmographics → skorlama → eşik üstü lead’lere otomatik outreach → sonuçları geri besleme.

10) **Hiring CV Triage (Senin HR projesi)**  
**Yaklaşım:** CV’ler ingest → embedding + metadata → pozisyon bazlı filtre → %uyum skoru + açıklama + kaynak cümleler → HR için tek tık shortlist.

---

## 4) 10 Kültür/Soft-Skill Soru & Örnek Cevap

1) **Yeni bir tool’u 1 günde öğrenebilir misin?**  
Evet. Dokümanı hızlı tarar, örnek akışı klonlar, minimal PoC çıkarırım. Geçen ay **[Tool X]** ile aynı gün MVP çıkarıp ertesi gün prod’a aldım.

2) **Belirsizlikle nasıl baş edersin?**  
Problemi parçalara ayırırım: “bilinenler, bilinmeyenler, varsayımlar”. Ölçülebilir 1-2 hipotezle küçük bir deney akışı kurarım.

3) **Hız vs kalite?**  
Önce **işleyen iskelet** (kapsama %60–70), riskli noktaları feature flag ile kapatırım. Etkisi kanıtlanınca kalite yatırımı yaparım.

4) **Stakeholder yönetimi?**  
Net hedef, net metrik, kısa döngü. Haftalık 10 dk demo + risk listesi + sonraki adımlar.

5) **Geri bildirim/pushback**  
İş etkisi ve veriyle konuşurum. “Bu talebi çözmek 3 gün, şu alternatif 1 gün ve %80 etki.”

6) **Gizlilik/Güvenlik**  
PII redaction, erişim rolleri, log sanitization; hassas veriyi promptsuz tutmaya çalışırım.

7) **Başarısızlık örneği**  
Yanlış veri kaynağıyla başladım; izlenebilirlik zayıftı. Sonra trace id, structured logs ekledim; tekrar etmedi.

8) **Dokümantasyon**  
Runbook, env değişkenleri, sırlar, rate limit, tetikleyici şartlar — hepsi tek sayfa “how-to” ve diyagram.

9) **Uzaktan/async çalışma**  
Standart ritüeller: günlük kısa status, haftalık demo, açık kanban, her işte kabul kriteri.

10) **Önceliklendirme**  
ICE/RICE dengesine bakarım; en hızlı etkiyi yapan en küçük akış ilk sırada.

---

## 5) Basit ASCII Mimari Diyagramları

### A) Slack RAG Asistanı
[Slack] → (Event) → [Router] → [RAG: PGVector] → [Tools/API] → [Answer + Sources] → [Slack]

### B) Stripe Günlük Rapor
[Scheduler] → [Stripe API] → [Normalize] → [Google Sheets] → [Looker] → [Slack Notify]

### C) CV Triage
[CV Store] → [Embeddings] → [PGVector] → [Retriever + Filters] → [LLM] → [Shortlist + Rationale]

### D) Triage Bot
[Slack] → [Classifier] → [Route: FAQ/Jira/Owner] → [Log/Trace] → [Feedback Loop]

### E) Anomali Alarmı
[Cron] → [Ads API] → [Baseline/MA] → [Threshold] → [Incident + Playbook]

---

## 6) KPI / Metrik Örnekleri (yer tutucuları kendi rakamlarınla güncelle)

- **Time-to-first-value:** MVP süresi **[gün]**
- **Manual hours saved:** **[saat/hafta]**
- **Resolution time:** **[X%]** iyileşme
- **Accuracy/Precision:** **[X%]**
- **Cost per query:** **[₺/istek]**, toplam **[₺/ay]**
- **Adoption:** aktif kullanıcı **[n]**, tekrar kullanım oranı **[X%]**

---

## 7) 15 Dakikalık Canlı Demo Planı

1) **3 dk** — Problem & hedef (ör. “CV aramasında hız + isabet”)  
2) **4 dk** — Mimari akış: ingest → vector → retrieval → Slack komutu  
3) **5 dk** — Canlı gösterim: 2 sorgu (biri edge-case) + kaynak linkleri  
4) **3 dk** — Metrikler, limitler, sonraki adımlar (eval set, cache, cost)

**Demo içeriği:** Küçük bir Supabase tablosu, 30–50 doküman, basit Slack slash-command.

---

## 8) Mülakat Sonunda Sorabileceğin 8 Soru (kısa ve iyi)

1) Bu rolün ilk 90 günde başarmasını beklediğiniz **3 somut çıktı** nedir?  
2) Agent/otomasyon için hâlihazırda kullandığınız **stack** ve en büyük **engel** nedir?  
3) Üretime çıkışta **versiyonlama ve gözlemlenebilirlik** nasıl yönetiliyor?  
4) **LLM maliyeti** için benimsediğiniz stratejiler neler?  
5) “Hızlı deney + güvenli prod” dengesini nasıl kuruyorsunuz?  
6) Ekip **async ritüelleri** ve karar alma mekanizması nasıl?  
7) Başarılı gördüğünüz bir **iç otomasyon örneği** var mı?  
8) Benim geçmişimden hangi alan **en hızlı etki** yaratır?

---

## 9) Son Dakika Kontrol Listesi

- [ ] 3 STAR hikaye, **rakamlar güncellendi**  
- [ ] 5 diyagramı **30 sn’de çizebiliyorum**  
- [ ] Canlı demo **tek komutla** açılıyor, fake data hazır  
- [ ] Prompt & tool **schema**’ları elde (kopyala-yapıştır)  
- [ ] Token/cost ve latency **görünür** (log + örnek)  
- [ ] En az **1 başarısızlık** hikayesi ve çıkarım hazır  
- [ ] “Neden kitUP?” için **2 özgün cümle** ezber

---

## 10) Ek: Hızlı Cevap Kartları (tek satır punchline’lar)

- “**Teknoloji değil, iş etkisi** optimize ederim.”  
- “**No-code + code** hibrit; en hızlı etki için doğru araç.”  
- “**Trace id** uçtan uca, hatayı dakikada buluruz.”  
- “**Idempotent & retry-safe** akış; veri tutarlılığı esastır.”  
- “Önce **MVP**, sonra **güvenli ölçek**.”

---

### Kısa Pratik: 60 sn’lik **‘Neden ben?’**
“Agent ve otomasyonları **iş akışına gömerek** gerçek kullanıma sokuyorum. RAG + PGVector, Slack triage, Stripe raporları gibi işleri **gün içinde ayağa** kaldırıp bir hafta içinde metriklenebilir hale getiriyorum. Dokümantasyon, gözlemleme ve denetlenebilirlik bende standarttır. Bu yüzden ilk 30 günde **[hedef X]**, 90 günde **[hedef Y]** çıkarırım.”

"""
with open("/mnt/data/kitup_interview_prep.md", "w", encoding="utf-8") as f:
    f.write(content)

"/mnt/data/kitup_interview_prep.md"
