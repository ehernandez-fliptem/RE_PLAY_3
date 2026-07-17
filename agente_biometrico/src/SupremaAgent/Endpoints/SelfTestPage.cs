namespace SupremaAgent.Endpoints;

/// <summary>
/// Pagina de auto-diagnostico embebida. Se sirve desde el propio agente para
/// que funcione aunque la app web no este disponible.
/// </summary>
internal static class SelfTestPage
{
    public const string Html = """
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agente biometrico - Diagnostico</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f7f9; --card:#fff; --tx:#1b1f24; --mut:#5b6570; --bd:#e1e5ea; --ok:#0f7b3f; --bad:#b3261e; --warn:#8a5a00; }
  @media (prefers-color-scheme: dark) { :root { --bg:#14171a; --card:#1c2024; --tx:#e6e9ec; --mut:#9aa4ae; --bd:#2c3238; --ok:#4ac97e; --bad:#ff6b5e; --warn:#e0a437; } }
  * { box-sizing:border-box; }
  body { margin:0; padding:24px; background:var(--bg); color:var(--tx); font:15px/1.5 system-ui,Segoe UI,sans-serif; }
  .wrap { max-width:820px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--mut); margin:0 0 24px; }
  .step { background:var(--card); border:1px solid var(--bd); border-radius:10px; padding:16px; margin-bottom:12px; }
  .head { display:flex; align-items:center; gap:10px; }
  .num { width:26px; height:26px; border-radius:50%; background:var(--bd); color:var(--tx); display:grid; place-items:center; font-size:13px; font-weight:600; flex:none; }
  .ttl { font-weight:600; flex:1; }
  .why { color:var(--mut); font-size:13.5px; margin:8px 0 12px; }
  button { background:var(--tx); color:var(--card); border:0; border-radius:7px; padding:8px 14px; font-size:14px; font-weight:500; cursor:pointer; }
  button:disabled { opacity:.45; cursor:default; }
  button.ghost { background:transparent; color:var(--tx); border:1px solid var(--bd); }
  textarea { width:100%; min-height:80px; margin-bottom:10px; padding:8px; border:1px solid var(--bd); border-radius:7px; background:var(--bg); color:var(--tx); font:12px/1.4 ui-monospace,Consolas,monospace; resize:vertical; }
  pre { background:var(--bg); border:1px solid var(--bd); border-radius:7px; padding:10px; margin:12px 0 0; font:12px/1.45 ui-monospace,Consolas,monospace; white-space:pre-wrap; word-break:break-word; overflow-x:auto; }
  .tag { font-size:12px; font-weight:600; padding:2px 8px; border-radius:20px; border:1px solid currentColor; }
  .t-ok { color:var(--ok); } .t-bad { color:var(--bad); } .t-warn { color:var(--warn); } .t-run { color:var(--mut); }
  .hint { border-left:3px solid var(--warn); padding:8px 12px; margin-top:10px; background:var(--bg); border-radius:0 7px 7px 0; font-size:13.5px; }
  .foot { margin-top:20px; padding-top:16px; border-top:1px solid var(--bd); }
</style>
</head>
<body>
<div class="wrap">
  <h1>Agente biometrico &mdash; Diagnostico</h1>
  <p class="sub">Corre los pasos <strong>en orden</strong>. Si uno falla, para ahi: los siguientes van a fallar tambien. Al final, copia el reporte y mandalo.</p>

  <div class="step" id="s1">
    <div class="head"><div class="num">1</div><div class="ttl">Entorno y DLLs del SDK</div><span class="tag t-run" data-tag>sin correr</span></div>
    <p class="why">Revisa que UFScanner.dll y UFMatcher.dll esten junto al agente y que la arquitectura coincida. No toca el lector.</p>
    <button data-run="1">Revisar</button>
    <pre data-out hidden></pre>
  </div>

  <div class="step" id="s2">
    <div class="head"><div class="num">2</div><div class="ttl">Lector conectado</div><span class="tag t-run" data-tag>sin correr</span></div>
    <p class="why">Inicializa el SDK y busca el BioMini. Conectalo por USB antes de correr esto.</p>
    <button data-run="2">Revisar</button>
    <pre data-out hidden></pre>
  </div>

  <div class="step" id="s3">
    <div class="head"><div class="num">3</div><div class="ttl">Captura de prueba</div><span class="tag t-run" data-tag>sin correr</span></div>
    <p class="why">Lee una huella y reporta la calidad. Pon el dedo cuando presiones el boton; tienes unos segundos.</p>
    <button data-run="3">Capturar</button>
    <pre data-out hidden></pre>
  </div>

  <div class="step" id="s4">
    <div class="head"><div class="num">4</div><div class="ttl">El lector se reconoce a si mismo</div><span class="tag t-run" data-tag>sin correr</span></div>
    <p class="why">Dos capturas del <strong>mismo dedo</strong> y las compara. Prueba que el lector y el comparador trabajan juntos. Pon el dedo, levantalo cuando lo pida, y ponlo otra vez.</p>
    <button data-run="4">Probar</button>
    <pre data-out hidden></pre>
  </div>

  <div class="step" id="s5">
    <div class="head"><div class="num">5</div><div class="ttl">Compatibilidad con BioStar</div><span class="tag t-run" data-tag>sin correr</span></div>
    <p class="why"><strong>Esta es la prueba que decide todo.</strong> Pega abajo una plantilla que te hayan pasado de BioStar y pon el dedo de <em>esa misma persona</em>. Si coinciden, el sistema completo es viable. Si no, hay que cambiar el formato de plantilla.</p>
    <textarea id="tpl" placeholder="Pega aqui la plantilla de BioStar (texto largo en base64)"></textarea>
    <button data-run="5">Comparar</button>
    <pre data-out hidden></pre>
  </div>

  <div class="foot">
    <button class="ghost" id="copy">Copiar reporte completo</button>
    <span id="copied" style="margin-left:10px;color:var(--ok);font-size:13px" hidden>Copiado</span>
  </div>
</div>

<script>
const results = {};

function setTag(step, cls, text) {
  const t = document.querySelector('#s' + step + ' [data-tag]');
  t.className = 'tag ' + cls;
  t.textContent = text;
}

function show(step, data, hint) {
  const pre = document.querySelector('#s' + step + ' [data-out]');
  pre.hidden = false;
  pre.textContent = JSON.stringify(data, null, 2);
  const old = document.querySelector('#s' + step + ' .hint');
  if (old) old.remove();
  if (hint) {
    const d = document.createElement('div');
    d.className = 'hint';
    d.textContent = hint;
    pre.after(d);
  }
}

// Un paso "pasa" segun su propia forma; no todos tienen el mismo campo.
function passed(step, d) {
  if (step === 1) return d.faltantes.length === 0;
  if (step === 2) return d.ok === true;
  if (step === 3) return d.ok === true;
  return d.ok === true && d.coincide === true;
}

async function run(step) {
  const btn = document.querySelector('#s' + step + ' [data-run]');
  btn.disabled = true;
  setTag(step, 't-run', 'corriendo...');
  try {
    let res;
    if (step === 1) res = await fetch('/api/selftest/entorno');
    else if (step === 2) res = await fetch('/api/selftest/lector');
    else if (step === 3) res = await fetch('/api/selftest/captura', { method: 'POST' });
    else if (step === 4) res = await fetch('/api/selftest/match-propio', { method: 'POST' });
    else {
      const tpl = document.getElementById('tpl').value.trim();
      if (!tpl) { setTag(5, 't-warn', 'falta plantilla'); btn.disabled = false; return; }
      res = await fetch('/api/selftest/match-biostar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: tpl }),
      });
    }

    const data = await res.json();
    results['paso' + step] = data;
    const ok = passed(step, data);
    setTag(step, ok ? 't-ok' : 't-bad', ok ? 'OK' : 'FALLO');
    show(step, data, data.hint || null);
  } catch (e) {
    results['paso' + step] = { error: String(e) };
    setTag(step, 't-bad', 'ERROR');
    show(step, { error: String(e) }, 'No se pudo hablar con el agente. Verifica que la ventana del agente siga abierta.');
  }
  btn.disabled = false;
}

document.querySelectorAll('[data-run]').forEach(b =>
  b.addEventListener('click', () => run(Number(b.dataset.run))));

document.getElementById('copy').addEventListener('click', async () => {
  const reporte = { fecha: new Date().toISOString(), navegador: navigator.userAgent, resultados: results };
  await navigator.clipboard.writeText(JSON.stringify(reporte, null, 2));
  const c = document.getElementById('copied');
  c.hidden = false;
  setTimeout(() => (c.hidden = true), 2000);
});
</script>
</body>
</html>
""";
}
