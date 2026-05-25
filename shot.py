"""MimoCard screenshot pipeline — 7 shots at 1920x1080 + mobile."""
import time, hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("/root/mimocardshots")
OUT.mkdir(exist_ok=True)
URL = "https://gyoomei.github.io/mimocard/"
CB = int(time.time())

def md5(p):
    return hashlib.md5(p.read_bytes()).hexdigest()[:8]

def settle(page, ms=900):
    page.wait_for_timeout(ms)

def cap(page, name):
    p = OUT / name
    page.screenshot(path=str(p))
    print(f"  -> {name}  {p.stat().st_size:>7} B  md5={md5(p)}")

# Pre-seed a deck via JS so screenshots are populated immediately
SEED_JS = """
(() => {
  const cards = [
    {id:'c1', front:'What is spaced repetition and why is it used in learning?', back:'A technique that schedules reviews at increasing intervals to exploit the spacing effect, improving long-term retention while cutting study time.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'c2', front:'How does the SuperMemo-2 algorithm adjust intervals after each review?', back:'It updates the ease factor based on the grade (0-5) and multiplies the previous interval by EF, with a 1.3 floor and a reset on lapses.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'c3', front:'What is the ease factor (EF) in SM-2 and what is its starting value?', back:'EF is a per-card multiplier that grows with easy reviews and shrinks with hard ones. New cards start at 2.5 and never drop below 1.3.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'c4', front:'What does the Leitner system use to schedule flashcard review?', back:'A series of physical boxes — correct cards advance to the next box (longer interval) and missed cards return to box 1 for frequent review.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'c5', front:'Why do increasing review intervals improve long-term memory?', back:'Each successful retrieval just before forgetting strengthens the memory trace, a phenomenon called the spacing effect.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null}
  ];
  const cards2 = [
    {id:'d1', front:'What is the core idea of attention in transformers?', back:'Each token computes a weighted sum of all other tokens via query-key dot products, letting the model attend to relevant context regardless of distance.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'d2', front:'What does multi-head attention add over single-head attention?', back:'Multiple parallel attention heads with separate Q/K/V projections, letting the model attend to different relationships in parallel and concatenate results.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'d3', front:'Why do transformers need positional encoding?', back:'Self-attention is permutation-invariant, so position information is added explicitly via sinusoidal or learned embeddings before the first layer.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'d4', front:'What is the role of the feed-forward network inside each transformer block?', back:'A position-wise MLP applied independently to each token, expanding dimension then projecting back, providing nonlinearity between attention layers.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'d5', front:'How does layer normalization differ from batch normalization?', back:'LayerNorm normalizes across feature channels per sample (independent of batch), making it stable for variable-length sequences in transformers.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null},
    {id:'d6', front:'What is causal masking in decoder self-attention?', back:'A triangular mask that zeroes out future tokens, ensuring autoregressive generation depends only on past context.', ef:2.5, interval:0, reps:0, dueAt:Date.now()-1000, lastReviewed:null, lastGrade:null}
  ];
  const decks = [
    {id:'deck1', name:'Spaced repetition', source:'https://en.wikipedia.org/wiki/Spaced_repetition', style:'qa', lang:'en', createdAt:Date.now()-3600000, lastStudied:null, cards},
    {id:'deck2', name:'Transformer architecture', source:'https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)', style:'qa', lang:'en', createdAt:Date.now()-7200000, lastStudied:null, cards:cards2}
  ];
  localStorage.setItem('mimocard.decks.v1', JSON.stringify(decks));
})();
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--disable-gpu', '--no-sandbox'])
    ctx = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        device_scale_factor=1,
        locale='en-US',
    )
    page = ctx.new_page()

    print("[1/7] desktop dark — landing")
    page.goto(f"{URL}?cb={CB}", wait_until="domcontentloaded", timeout=30000)
    settle(page, 1500)
    cap(page, "01-landing-dark.png")

    print("[2/7] desktop light — landing")
    page.goto(f"{URL}?cb={CB+1}", wait_until="domcontentloaded", timeout=30000)
    page.evaluate("localStorage.setItem('mc-theme','light'); document.documentElement.dataset.theme='light';")
    page.evaluate("document.getElementById('theme-btn').textContent = 'sun';")
    settle(page, 1200)
    cap(page, "02-landing-light.png")

    print("[3/7] dark — library populated")
    page.goto(f"{URL}?cb={CB+2}", wait_until="domcontentloaded", timeout=30000)
    page.evaluate("localStorage.setItem('mc-theme','dark'); document.documentElement.dataset.theme='dark';")
    page.evaluate(SEED_JS)
    page.reload(wait_until="domcontentloaded")
    settle(page, 2000)
    # scroll to library
    y = page.evaluate("document.getElementById('library')?.getBoundingClientRect().top + window.scrollY")
    if y:
        page.evaluate(f"window.scrollTo(0, {y - 80})")
        settle(page, 700)
    cap(page, "03-library-dark.png")

    print("[4/7] dark — study mode (front)")
    page.evaluate("document.querySelector('.deck-action[data-act=\"study\"]').click()")
    settle(page, 1200)
    cap(page, "04-study-front.png")

    print("[5/7] dark — study mode (revealed + grades)")
    page.evaluate("document.getElementById('studyCard')?.click()")
    settle(page, 700)
    cap(page, "05-study-graded.png")

    # close modal
    page.evaluate("document.getElementById('modalClose').click()")
    settle(page, 500)

    print("[6/7] light + ID — generation form")
    page.goto(f"{URL}?cb={CB+3}", wait_until="domcontentloaded", timeout=30000)
    page.evaluate("localStorage.setItem('mc-theme','light'); document.documentElement.dataset.theme='light';")
    page.evaluate("localStorage.setItem('mc-lang','id');")
    page.evaluate(SEED_JS.replace("lang:'en'", "lang:'id'").replace("name:'Spaced repetition'", "name:'Spaced repetition (Indonesian)'"))
    page.reload(wait_until="domcontentloaded")
    settle(page, 1500)
    cap(page, "06-light-id.png")

    print("[7/7] github repo")
    page.goto("https://github.com/gyoomei/mimocard", wait_until="domcontentloaded", timeout=30000)
    settle(page, 2000)
    cap(page, "07-github.png")

    # mobile
    print("[8] mobile dark — landing")
    ctx_m = browser.new_context(
        viewport={'width': 414, 'height': 896},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        locale='en-US',
    )
    pm = ctx_m.new_page()
    pm.goto(f"{URL}?cb={CB+5}", wait_until="domcontentloaded", timeout=30000)
    settle(pm, 1500)
    pm.screenshot(path=str(OUT / "08-mobile.png"))

    browser.close()

print("\nfinal hashes:")
for p in sorted(OUT.glob("*.png")):
    print(f"  {md5(p)}  {p.name}  {p.stat().st_size:>8} B")
