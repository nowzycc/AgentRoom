'use strict';
/* AgentRoom 接入向导 — 渲染层逻辑（纯静态，无外部依赖）。
 * 四屏：自检 → 选择 Agent → 配置安装 → 连通测试。
 * 只通过 window.agentroomOnboarding 窄桥与主进程通信；不 fetch、不跳转。 */

(() => {
  const bridge = window.agentroomOnboarding;
  const $ = (id) => document.getElementById(id);

  let screen = 1;
  let state = null;           // onboarding:state 的返回
  const selected = new Set(); // 'hermes' | 'dsh'

  const TOTAL = 4;

  /* ---------- 导航 ---------- */
  function goto(n) {
    screen = Math.min(TOTAL, Math.max(1, n));
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    const target = $('screen-' + screen);
    if (target) target.classList.add('active');
    document.querySelectorAll('#steps .step').forEach((el) => {
      const n2 = Number(el.dataset.step);
      el.classList.toggle('active', n2 === screen);
      el.classList.toggle('done', n2 < screen);
    });
    $('btn-prev').disabled = screen === 1;
    $('btn-next').textContent = screen === TOTAL ? '完成' : '下一步';
    refreshNext();
    if (screen === 3) renderConfigScreen();
  }
  function refreshNext() {
    let blocked = false;
    let hint = '';
    if (screen === 2 && selected.size === 0) { blocked = true; hint = '至少选择一个可用的 Agent 才能继续。'; }
    if (screen === 1 && state && !state.ok) { hint = '检测结果异常，可继续但后续步骤可能失败。'; }
    $('btn-next').disabled = blocked;
    $('footer-msg').textContent = hint;
    if (screen === 2) $('pick-hint').hidden = !(screen === 2 && selected.size === 0);
  }

  /* ---------- 第一屏：自检 ---------- */
  function setLamp(id, found, pathText) {
    const row = $(id);
    if (!row) return;
    row.classList.toggle('ok', !!found);
    row.classList.toggle('bad', !found);
    const p = row.querySelector('.path');
    if (p) p.textContent = (found ? '✓ ' : '✗ ') + pathText;
  }
  function renderState() {
    if (!state) return;
    setLamp('lamp-python', state.python && state.python.found, state.python && state.python.path);
    setLamp('lamp-launch', state.launch && state.launch.found, state.launch && state.launch.path);
    setLamp('lamp-connection', state.connection && state.connection.found, state.connection && state.connection.path);
    setLamp('det-hermes', state.hermes && state.hermes.detected, state.hermes && state.hermes.home);
    setLamp('det-dsh', state.dsh && state.dsh.detected, state.dsh && state.dsh.home);
    renderCards();
  }
  async function refreshState() {
    $('footer-msg').textContent = '检测中…';
    try {
      state = await bridge.getState();
      renderState();
      $('footer-msg').textContent = '';
    } catch (e) {
      $('footer-msg').textContent = '检测失败：' + (e && e.message || e);
    }
  }

  /* ---------- 第二屏：选择 Agent ---------- */
  function renderCards() {
    if (!state) return;
    const hermesOk = !!(state.hermes && state.hermes.detected);
    const dshOk = !!(state.dsh && state.dsh.detected);

    $('card-hermes-path').textContent = hermesOk ? state.hermes.configPath : '未检测到（' + (state.hermes && state.hermes.home) + '）';
    $('card-hermes').classList.toggle('disabled', !hermesOk);
    const selHermes = $('sel-hermes');
    if (!hermesOk) { selHermes.checked = false; selected.delete('hermes'); }
    selHermes.disabled = !hermesOk;

    $('card-dsh-path').textContent = dshOk ? (state.dsh.profilesDir + '/<profile>/cordis.patch.yml') : '未检测到（' + (state.dsh && state.dsh.home) + '）';
    $('card-dsh').classList.toggle('disabled', !dshOk);
    const selDsh = $('sel-dsh');
    if (!dshOk) { selDsh.checked = false; selected.delete('dsh'); }
    selDsh.disabled = !dshOk;

    // profile 下拉：来自 detectDsh 的可用 profile 列表
    const sel = $('sel-profile');
    sel.disabled = !dshOk;
    const profiles = (state.dsh && Array.isArray(state.dsh.profiles)) ? state.dsh.profiles : [];
    const options = profiles.length ? profiles : ['default'];
    const current = sel.value || 'default';
    sel.innerHTML = options.map((p) => '<option>' + p + '</option>').join('');
    if (options.includes(current)) sel.value = current;
    syncCardClass();
  }
  function syncCardClass() {
    $('card-hermes').classList.toggle('selected', selected.has('hermes'));
    $('card-dsh').classList.toggle('selected', selected.has('dsh'));
  }
  function bindCard(inputId, agent) {
    $(inputId).addEventListener('change', (ev) => {
      if (ev.target.checked) selected.add(agent); else selected.delete(agent);
      syncCardClass();
      refreshNext();
    });
  }

  /* ---------- 第三屏：配置 ---------- */
  function selectedProfile() {
    return $('sel-profile').value || 'default';
  }
  function renderConfigScreen() {
    if (!state) return;
    $('path-hermes').textContent = state.hermes ? state.hermes.configPath : '—';
    $('path-dsh').textContent = state.dsh ? (state.dsh.profilesDir + '/' + selectedProfile() + '/cordis.patch.yml') : '—';
    $('path-python').textContent = state.python ? state.python.path : '—';
    $('path-launch').textContent = state.launch ? state.launch.path : '—';
    $('path-connection').textContent = state.connection ? state.connection.path : '—';
  }
  function showResult(el, payload, okWhen) {
    el.hidden = false;
    const ok = okWhen;
    el.classList.toggle('ok', !!ok);
    el.classList.toggle('bad', !ok);
    el.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  }
  async function doInstall() {
    const el = $('install-result');
    if (!selected.size) { showResult(el, '尚未选择任何 Agent。', false); return; }
    const agents = [...selected];
    $('btn-write').disabled = true;
    $('btn-skill').disabled = true;
    $('footer-msg').textContent = '写入配置并安装 Skill…';
    try {
      const r = await bridge.install({ agents, profile: selectedProfile() });
      const lines = [];
      let allOk = !!r.ok;
      for (const agent of agents) {
        const item = (r.agents && r.agents[agent]) || {};
        const cfgOk = !!(item.config && item.config.ok);
        lines.push('[' + agent + '] 配置写入: ' + (cfgOk
          ? '成功' + (item.config.changed ? '（已备份: ' + item.config.backup + '）' : '（内容无变化，未重写）')
          : '失败' + (item.config && item.config.error ? ' — ' + item.config.error : (item.error ? ' — ' + item.error : ''))));
        if (item.config && item.config.ok) lines.push('  ' + item.config.configPath);
        if (item.skill) {
          lines.push('[' + agent + '] Skill 安装: ' + (item.skill.ok ? '成功' : '失败' + (item.skill.error ? ' — ' + item.skill.error : '')));
          if (item.skill.ok && item.skill.output) lines.push('  ' + item.skill.output);
        }
        if (!cfgOk || (item.skill && !item.skill.ok)) allOk = false;
      }
      if (r.error) lines.unshift('错误: ' + r.error);
      showResult(el, lines.join('\n'), allOk);
    } catch (e) {
      showResult(el, '调用失败: ' + (e && e.message || e), false);
    } finally {
      $('btn-write').disabled = false;
      $('btn-skill').disabled = false;
      $('footer-msg').textContent = '';
    }
  }

  /* ---------- 第四屏：连通测试 ---------- */
  async function doTest() {
    const btn = $('btn-test');
    const verdict = $('test-verdict');
    const detail = $('test-detail');
    btn.disabled = true;
    btn.textContent = '测试中…（可能需要数十秒）';
    detail.hidden = true;
    document.querySelectorAll('#tool-list li').forEach((li) => li.classList.remove('pass', 'fail'));
    verdict.hidden = true;
    try {
      const r = await bridge.runTest();
      const byName = new Set(r.tools || []);
      document.querySelectorAll('#tool-list li').forEach((li) => {
        li.classList.toggle('pass', byName.has(li.dataset.tool));
        li.classList.toggle('fail', !byName.has(li.dataset.tool));
      });
      verdict.hidden = false;
      verdict.textContent = r.ok ? '✓ 连通测试通过（7/7 工具）' : '✗ 连通测试失败';
      verdict.classList.toggle('ok', !!r.ok);
      verdict.classList.toggle('bad', !r.ok);
      detail.hidden = false;
      showResult(detail, r.ok
        ? 'server: ' + JSON.stringify({ tools: r.tools }) + '\n耗时 ' + r.durationMs + 'ms'
        : '阶段: ' + (r.stage || '?') + '\n错误: ' + (r.error || '缺少工具: ' + JSON.stringify(r.missing || []))
          + (r.stderr ? '\nstderr 末尾:\n' + r.stderr : ''),
        !!r.ok);
      $('footer-msg').textContent = r.ok ? '' : '测试未通过；可检查上方 stderr 末尾（已脱敏）。';
    } catch (e) {
      verdict.hidden = false;
      verdict.textContent = '✗ 测试调用失败';
      verdict.classList.add('bad');
      showResult(detail, String(e && e.message || e), false);
    } finally {
      btn.disabled = false;
      btn.textContent = '运行测试';
    }
  }

  /* ---------- 绑定 ---------- */
  function bind() {
    if (!bridge) {
      $('footer-msg').textContent = '桥接不可用（preload 未加载）— 无法与主进程通信。';
      $('btn-next').disabled = true;
      return;
    }
    $('btn-recheck').addEventListener('click', refreshState);
    bindCard('sel-hermes', 'hermes');
    bindCard('sel-dsh', 'dsh');
    $('sel-profile').addEventListener('change', renderConfigScreen);
    $('btn-write').addEventListener('click', () => doInstall());
    $('btn-skill').addEventListener('click', () => doInstall());
    $('btn-test').addEventListener('click', doTest);
    $('btn-prev').addEventListener('click', () => goto(screen - 1));
    $('btn-next').addEventListener('click', () => {
      if (screen === TOTAL) { bridge.close(); return; }
      goto(screen + 1);
    });
    goto(1);
    refreshState();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
