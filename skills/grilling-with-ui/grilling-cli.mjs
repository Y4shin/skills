#!/usr/bin/env node
import { parseArgs } from "node:util";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { writeFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import "node:http";
import { spawn } from "node:child_process";
const spaHtml = '<!doctype html>\n<html lang="en" style="color-scheme: light dark">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta name="color-scheme" content="light dark" />\n    <meta\n      name="description"\n      content="Grilling Visualizer — a live view of a question-dependency grilling session: rounds, nodes, edges, and answers."\n    />\n    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />\n    <meta name="theme-color" content="#1b1b1b" media="(prefers-color-scheme: dark)" />\n    <title>Grilling Visualizer</title>\n    <style>\n      :root {\n        /* Base type roles — Operate mode: a tool, not a page.\n           No display voice; one system sans for UI, monospace for ids/data. */\n        --p-font-ui:\n          system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,\n          sans-serif;\n        --p-font-mono:\n          ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas,\n          "Liberation Mono", monospace;\n\n        /* One rem floor so the SPA\'s rem-based scoped styles resolve\n           against a predictable base rather than the unstyled default. */\n        font-family: var(--p-font-ui);\n        font-size: 100%;\n        line-height: 1.5;\n        -webkit-text-size-adjust: 100%;\n        text-size-adjust: 100%;\n      }\n\n      /* The SPA mounts into #app; give it the document flow and let the\n         scoped component styles own everything inside. */\n      #app {\n        min-block-size: 100dvh;\n      }\n\n      /* Keep the inlined single-file output readable before the SPA hydrates:\n         a quiet fallback that never fights the component\'s own styling. */\n    </style>\n    <script type="module" crossorigin>var hs=Object.defineProperty;var Vr=e=>{throw TypeError(e)};var _s=(e,t,n)=>t in e?hs(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var ce=(e,t,n)=>_s(e,typeof t!="symbol"?t+"":t,n),ar=(e,t,n)=>t.has(e)||Vr("Cannot "+n);var o=(e,t,n)=>(ar(e,t,"read from private field"),n?n.call(e):t.get(e)),k=(e,t,n)=>t.has(e)?Vr("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,n),E=(e,t,n,r)=>(ar(e,t,"write to private field"),r?r.call(e,n):t.set(e,n),n),T=(e,t,n)=>(ar(e,t,"access private method"),n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll(\'link[rel="modulepreload"]\'))r(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&r(l)}).observe(document,{childList:!0,subtree:!0});function n(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(i){if(i.ep)return;i.ep=!0;const s=n(i);fetch(i.href,s)}})();const vi=!0;var hi=Array.isArray,ps=Array.prototype.indexOf,_n=Array.prototype.includes,er=Array.from,ut=Object.defineProperty,Dt=Object.getOwnPropertyDescriptor,gs=Object.getOwnPropertyDescriptors,ms=Object.prototype,ws=Array.prototype,_i=Object.getPrototypeOf,Yr=Object.isExtensible;const ys=()=>{};function bs(e){return e()}function gr(e){for(var t=0;t<e.length;t++)e[t]()}function pi(){var e,t,n=new Promise((r,i)=>{e=r,t=i});return{promise:n,resolve:e,reject:t}}const K=2,pn=4,xn=8,gi=1<<24,Pe=16,xe=32,Qe=64,mr=128,Ee=512,L=1024,F=2048,ke=4096,se=8192,Se=16384,Zt=32768,Kr=1<<25,Yt=65536,gn=1<<17,Es=1<<18,Jt=1<<19,mi=1<<20,Be=1<<25,Tt=65536,mn=1<<21,bt=1<<22,ft=1<<23,Et=Symbol("$state"),wi=Symbol("proxy path"),ks=Symbol("attributes"),wr=Symbol("class"),yr=Symbol("style"),sn=Symbol("text"),Hn=Symbol("form reset"),Ss=Symbol("hmr anchor"),Tn=new class extends Error{constructor(){super(...arguments);ce(this,"name","StaleReactionError");ce(this,"message","The reaction that called `getAbortSignal()` was re-run or destroyed")}},xs=1,Ts=11;function As(e){{const t=new Error(`invariant_violation\nAn invariant violation occurred, meaning Svelte\'s internal assumptions were flawed. This is a bug in Svelte, not your app — please open an issue at https://github.com/sveltejs/svelte, citing the following message: "${e}"\nhttps://svelte.dev/e/invariant_violation`);throw t.name="Svelte error",t}}function yi(e){{const t=new Error(`lifecycle_outside_component\n\\`${e}(...)\\` can only be used during component initialisation\nhttps://svelte.dev/e/lifecycle_outside_component`);throw t.name="Svelte error",t}}function $s(){{const e=new Error("async_derived_orphan\\nCannot create a `$derived(...)` with an `await` expression outside of an effect tree\\nhttps://svelte.dev/e/async_derived_orphan");throw e.name="Svelte error",e}}function Wr(){{const e=new Error("bind_invalid_checkbox_value\\nUsing `bind:value` together with a checkbox input is not allowed. Use `bind:checked` instead\\nhttps://svelte.dev/e/bind_invalid_checkbox_value");throw e.name="Svelte error",e}}function Os(e,t){{const n=new Error(`component_api_changed\nCalling \\`${e}\\` on a component instance (of ${t}) is no longer valid in Svelte 5\nhttps://svelte.dev/e/component_api_changed`);throw n.name="Svelte error",n}}function Ms(e,t){{const n=new Error(`component_api_invalid_new\nAttempted to instantiate ${e} with \\`new ${t}\\`, which is no longer valid in Svelte 5. If this component is not under your control, set the \\`compatibility.componentApi\\` compiler option to \\`4\\` to keep it working.\nhttps://svelte.dev/e/component_api_invalid_new`);throw n.name="Svelte error",n}}function Cs(){{const e=new Error(`derived_references_self\nA derived value cannot reference itself recursively\nhttps://svelte.dev/e/derived_references_self`);throw e.name="Svelte error",e}}function Rs(e,t,n){{const r=new Error(`each_key_duplicate\n${n?`Keyed each block has duplicate key \\`${n}\\` at indexes ${e} and ${t}`:`Keyed each block has duplicate key at indexes ${e} and ${t}`}\nhttps://svelte.dev/e/each_key_duplicate`);throw r.name="Svelte error",r}}function qs(e,t,n){{const r=new Error(`each_key_volatile\nKeyed each block has key that is not idempotent — the key for item at index ${e} was \\`${t}\\` but is now \\`${n}\\`. Keys must be the same each time for a given item\nhttps://svelte.dev/e/each_key_volatile`);throw r.name="Svelte error",r}}function Ns(e){{const t=new Error(`effect_in_teardown\n\\`${e}\\` cannot be used inside an effect cleanup function\nhttps://svelte.dev/e/effect_in_teardown`);throw t.name="Svelte error",t}}function Is(){{const e=new Error("effect_in_unowned_derived\\nEffect cannot be created inside a `$derived` value that was not itself created inside an effect\\nhttps://svelte.dev/e/effect_in_unowned_derived");throw e.name="Svelte error",e}}function Ps(e){{const t=new Error(`effect_orphan\n\\`${e}\\` can only be used inside an effect (e.g. during component initialisation)\nhttps://svelte.dev/e/effect_orphan`);throw t.name="Svelte error",t}}function Ds(){{const e=new Error(`effect_update_depth_exceeded\nMaximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state\nhttps://svelte.dev/e/effect_update_depth_exceeded`);throw e.name="Svelte error",e}}function Ls(e){{const t=new Error(`rune_outside_svelte\nThe \\`${e}\\` rune is only available inside \\`.svelte\\` and \\`.svelte.js/ts\\` files\nhttps://svelte.dev/e/rune_outside_svelte`);throw t.name="Svelte error",t}}function Fs(){{const e=new Error("state_descriptors_fixed\\nProperty descriptors defined on `$state` objects must contain `value` and always be `enumerable`, `configurable` and `writable`.\\nhttps://svelte.dev/e/state_descriptors_fixed");throw e.name="Svelte error",e}}function js(){{const e=new Error("state_prototype_fixed\\nCannot set prototype of `$state` object\\nhttps://svelte.dev/e/state_prototype_fixed");throw e.name="Svelte error",e}}function Hs(){{const e=new Error("state_unsafe_mutation\\nUpdating state inside `$derived(...)`, `$inspect(...)` or a template expression is forbidden. If the value should not be reactive, declare it without `$state`\\nhttps://svelte.dev/e/state_unsafe_mutation");throw e.name="Svelte error",e}}function Bs(){{const e=new Error("svelte_boundary_reset_onerror\\nA `<svelte:boundary>` `reset` function cannot be called while an error is still being handled\\nhttps://svelte.dev/e/svelte_boundary_reset_onerror");throw e.name="Svelte error",e}}const zs=1,Us=2,bi=4,Vs=8,Ys=16,Ks=1,Ws=2,U=Symbol("uninitialized"),j=Symbol("filename");var tr="font-weight: bold",nr="font-weight: normal";function Gs(e){console.warn(`%c[svelte] await_reactivity_loss\n%cDetected reactivity loss when reading \\`${e}\\`. This happens when state is read in an async function after an earlier \\`await\\`\nhttps://svelte.dev/e/await_reactivity_loss`,tr,nr)}function Zs(){console.warn(`%c[svelte] derived_inert\n%cReading a derived belonging to a now-destroyed effect may result in stale values\nhttps://svelte.dev/e/derived_inert`,tr,nr)}function Bn(e){console.warn(`%c[svelte] state_proxy_equality_mismatch\n%cReactive \\`$state(...)\\` proxies and the values they proxy have different identities. Because of this, comparisons with \\`${e}\\` will produce unexpected results\nhttps://svelte.dev/e/state_proxy_equality_mismatch`,tr,nr)}function Js(){console.warn("%c[svelte] svelte_boundary_reset_noop\\n%cA `<svelte:boundary>` `reset` function only resets the boundary the first time it is called\\nhttps://svelte.dev/e/svelte_boundary_reset_noop",tr,nr)}function Ei(e){return e===this.v}function Xs(e,t){return e!=e?t==t:e!==t||e!==null&&typeof e=="object"||typeof e=="function"}function ki(e){return!Xs(e,this.v)}let An=!1,Qs=!1;function el(){An=!0}function G(e,t){return e.label=t,Si(e.v,t),e}function Si(e,t){var n;return(n=e==null?void 0:e[wi])==null||n.call(e,t),e}function xi(e){const t=new Error,n=tl();return n.length===0?null:(n.unshift(`\n`),ut(t,"stack",{value:n.join(`\n`)}),ut(t,"name",{value:e}),t)}function tl(){const e=Error.stackTraceLimit;Error.stackTraceLimit=1/0;const t=new Error().stack;if(Error.stackTraceLimit=e,!t)return[];const n=t.split(`\n`),r=[];for(let i=0;i<n.length;i++){const s=n[i],l=s.replaceAll("\\\\","/");if(s.trim()!=="Error"){if(s.includes("validate_each_keys"))return[];l.includes("svelte/src/internal")||l.includes("node_modules/.vite")||r.push(s)}}return r}function nl(e,t){e||As(t)}let A=null;function Kt(e){A=e}let Xe=null;function Kn(e){Xe=e}function _e(e,t,n,r,i,s){const l=Xe;Xe={type:t,file:n[j],line:r,column:i,parent:l,...s};try{return e()}finally{Xe=l}}let $n=null;function Gr(e){$n=e}function Ti(e,t=!1,n){A={p:A,i:!1,c:null,e:null,s:e,x:null,r:S,l:An&&!t?{s:null,u:null,$:[]}:null},A.function=n,$n=n}function Ai(e){var t=A,n=t.e;if(n!==null){t.e=null;for(var r of n)Gi(r)}return e!==void 0&&(t.x=e),t.i=!0,A=t.p,$n=(A==null?void 0:A.function)??null,e??{}}function On(){return!An||A!==null&&A.l===null}let _t=[];function $i(){var e=_t;_t=[],gr(e)}function Je(e){if(_t.length===0&&!dn){var t=_t;queueMicrotask(()=>{t===_t&&$i()})}_t.push(e)}function rl(){for(;_t.length>0;)$i()}const br=new WeakMap;function Oi(e){var t=S;if(t===null)return x.f|=ft,e;if(e instanceof Error&&!br.has(e)&&br.set(e,il(e,t)),!(t.f&Zt)&&!(t.f&pn))throw!t.parent&&e instanceof Error&&Mi(e),e;ot(e,t)}function ot(e,t){if(!(t!==null&&t.f&Se)){for(;t!==null;){if(t.f&mr){if(!(t.f&Zt))throw e;try{t.b.error(e);return}catch(n){e=n}}t=t.parent}throw e instanceof Error&&Mi(e),e}}function il(e,t){var l,a,u;const n=Dt(e,"message");if(!(n&&!n.configurable)){for(var r=jr?"  ":"	",i=`\n${r}in ${((l=t.fn)==null?void 0:l.name)||"<unknown>"}`,s=t.ctx;s!==null;)i+=`\n${r}in ${(a=s.function)==null?void 0:a[j].split("/").pop()}`,s=s.p;return{message:e.message+`\n${i}\n`,stack:(u=e.stack)==null?void 0:u.split(`\n`).filter(h=>!h.includes("svelte/src/internal")).join(`\n`)}}}function Mi(e){const t=br.get(e);t&&(ut(e,"message",{value:t.message}),ut(e,"stack",{value:t.stack}))}const sl=-7169;function P(e,t){e.f=e.f&sl|t}function Nr(e){e.f&Ee||e.deps===null?P(e,L):P(e,ke)}function Ci(e){if(e!==null)for(const t of e)!(t.f&K)||!(t.f&Tt)||(t.f^=Tt,Ci(t.deps))}function Ri(e,t,n){e.f&F?t.add(e):e.f&ke&&n.add(e),Ci(e.deps),P(e,L)}let Zr=!1;function ll(){Zr||(Zr=!0,document.addEventListener("reset",e=>{Promise.resolve().then(()=>{var t;if(!e.defaultPrevented)for(const n of e.target.elements)(t=n[Hn])==null||t.call(n)})},{capture:!0}))}function Xt(e){var t=x,n=S;Te(null),Ae(null);try{return e()}finally{Te(t),Ae(n)}}function al(e,t,n,r=n){e.addEventListener(t,()=>Xt(n));const i=e[Hn];i?e[Hn]=()=>{i(),r(!0)}:e[Hn]=()=>r(!0),ll()}function ol(e){let t=0,n=$t(0),r;return G(n,"createSubscriber version"),()=>{Hr()&&(_(n),rr(()=>(t===0&&(r=C(()=>e(()=>vn(n)))),t+=1,()=>{Je(()=>{t-=1,t===0&&(r==null||r(),r=void 0,vn(n))})})))}}var fl=Yt|Jt;function ul(e,t,n,r){new cl(e,t,n,r)}var ge,qr,me,gt,fe,we,ne,de,We,mt,st,Ft,yn,bn,Fe,Jn,R,dl,vl,Er,hl,kr,zn,Un,Sr,xr;class cl{constructor(t,n,r,i){k(this,R);ce(this,"parent");ce(this,"is_pending",!1);ce(this,"transform_error");k(this,ge);k(this,qr,null);k(this,me);k(this,gt);k(this,fe);k(this,we,null);k(this,ne,null);k(this,de,null);k(this,We,null);k(this,mt,0);k(this,st,0);k(this,Ft,!1);k(this,yn,new Set);k(this,bn,new Set);k(this,Fe,null);k(this,Jn,ol(()=>(E(this,Fe,$t(o(this,mt))),G(o(this,Fe),"$effect.pending()"),()=>{E(this,Fe,null)})));var s;E(this,ge,t),E(this,me,n),E(this,gt,l=>{var a=S;a.b=this,a.f|=mr,r(l)}),this.parent=S.b,this.transform_error=i??((s=this.parent)==null?void 0:s.transform_error)??(l=>l),E(this,fe,Br(()=>{T(this,R,kr).call(this)},fl))}defer_effect(t){Ri(t,o(this,yn),o(this,bn))}is_rendered(){return!this.is_pending&&(!this.parent||this.parent.is_rendered())}has_pending_snippet(){return!!o(this,me).pending}update_pending_count(t,n){T(this,R,Sr).call(this,t,n),E(this,mt,o(this,mt)+t),!(!o(this,Fe)||o(this,Ft))&&(E(this,Ft,!0),Je(()=>{E(this,Ft,!1),o(this,Fe)&&Gt(o(this,Fe),o(this,mt))}))}get_effect_pending(){return o(this,Jn).call(this),_(o(this,Fe))}error(t){if(!o(this,me).onerror&&!o(this,me).failed)throw t;w!=null&&w.is_fork?(o(this,we)&&w.skip_effect(o(this,we)),o(this,ne)&&w.skip_effect(o(this,ne)),o(this,de)&&w.skip_effect(o(this,de)),w.oncommit(()=>{T(this,R,xr).call(this,t)})):T(this,R,xr).call(this,t)}}ge=new WeakMap,qr=new WeakMap,me=new WeakMap,gt=new WeakMap,fe=new WeakMap,we=new WeakMap,ne=new WeakMap,de=new WeakMap,We=new WeakMap,mt=new WeakMap,st=new WeakMap,Ft=new WeakMap,yn=new WeakMap,bn=new WeakMap,Fe=new WeakMap,Jn=new WeakMap,R=new WeakSet,dl=function(){try{E(this,we,ye(()=>o(this,gt).call(this,o(this,ge))))}catch(t){this.error(t)}},vl=function(t){const n=o(this,me).failed,{reset:r,invoke_onerror:i}=T(this,R,Er).call(this,t);Je(i),n&&E(this,de,ye(()=>{n(o(this,ge),()=>t,()=>r)}))},Er=function(t){var n=!1,r=!1;const i=()=>{if(n){Js();return}n=!0,r&&Bs(),o(this,de)!==null&&St(o(this,de),()=>{E(this,de,null)}),T(this,R,Un).call(this,()=>{T(this,R,kr).call(this)})};return{reset:i,invoke_onerror:()=>{var l,a;try{r=!0,(a=(l=o(this,me)).onerror)==null||a.call(l,t,i),r=!1}catch(u){ot(u,o(this,fe)&&o(this,fe).parent)}}}},hl=function(){const t=o(this,me).pending;t&&(this.is_pending=!0,E(this,ne,ye(()=>t(o(this,ge)))),Je(()=>{var n=E(this,We,document.createDocumentFragment()),r=kt();n.append(r),E(this,we,T(this,R,Un).call(this,()=>ye(()=>o(this,gt).call(this,r)))),o(this,st)===0&&(o(this,ge).before(n),E(this,We,null),St(o(this,ne),()=>{E(this,ne,null)}),T(this,R,zn).call(this,w))}))},kr=function(){try{if(this.is_pending=this.has_pending_snippet(),E(this,st,0),E(this,mt,0),E(this,we,ye(()=>{o(this,gt).call(this,o(this,ge))})),o(this,st)>0){var t=E(this,We,document.createDocumentFragment());Ur(o(this,we),t);const n=o(this,me).pending;E(this,ne,ye(()=>n(o(this,ge))))}else T(this,R,zn).call(this,w)}catch(n){this.error(n)}},zn=function(t){this.is_pending=!1,t.transfer_effects(o(this,yn),o(this,bn))},Un=function(t){var n=S,r=x,i=A;Ae(o(this,fe)),Te(o(this,fe)),Kt(o(this,fe).ctx);try{return At.ensure(),t()}catch(s){return Oi(s),null}finally{Ae(n),Te(r),Kt(i)}},Sr=function(t,n){var r;if(!this.has_pending_snippet()){this.parent&&T(r=this.parent,R,Sr).call(r,t,n);return}E(this,st,o(this,st)+t),o(this,st)===0&&(T(this,R,zn).call(this,n),o(this,ne)&&St(o(this,ne),()=>{E(this,ne,null)}),o(this,We)&&(o(this,ge).before(o(this,We)),E(this,We,null)))},xr=function(t){o(this,we)&&(ue(o(this,we)),E(this,we,null)),o(this,ne)&&(ue(o(this,ne)),E(this,ne,null)),o(this,de)&&(ue(o(this,de)),E(this,de,null));let n=o(this,me).failed;const r=i=>{const{reset:s,invoke_onerror:l}=T(this,R,Er).call(this,i);l(),n&&E(this,de,T(this,R,Un).call(this,()=>{try{return ye(()=>{var a=S;a.b=this,a.f|=mr,n(o(this,ge),()=>i,()=>s)})}catch(a){return ot(a,o(this,fe).parent),null}}))};Je(()=>{var i;try{i=this.transform_error(t)}catch(s){ot(s,o(this,fe)&&o(this,fe).parent);return}i!==null&&typeof i=="object"&&typeof i.then=="function"?i.then(r,s=>ot(s,o(this,fe)&&o(this,fe).parent)):r(i)})};function _l(e,t,n,r){const i=On()?Ir:Ni;var s=e.filter(c=>!c.settled),l=t.map(i);if(l.forEach((c,p)=>{c.label=t[p].toString().replace("() => ","").replaceAll("$.eager(() => ","$state.eager(").replace(/\\$\\.get\\((.+?)\\)/g,(m,g)=>g)}),n.length===0&&s.length===0){r(l);return}var a=S,u=pl(),h=s.length===1?s[0].promise:s.length>1?Promise.all(s.map(c=>c.promise)):null;function d(c){if(!(a.f&Se)){u();try{r([...l,...c])}catch(p){ot(p,a)}Wn()}}var v=qi();if(n.length===0){h.then(()=>d([])).finally(v);return}function f(){Promise.all(n.map(c=>ml(c))).then(d).catch(c=>ot(c,a)).finally(v)}h?h.then(()=>{u(),f(),Wn()}):f()}function pl(){var e=S,t=x,n=A,r=w,i=Xe;return function(l=!0){Ae(e),Te(t),Kt(n),l&&!(e.f&Se)&&(r==null||r.activate(),r==null||r.apply()),cn(null),Kn(i)}}async function Pn(e){var t=ie;queueMicrotask(()=>{ie===t&&cn(null)});var n=await e;return()=>(cn(t),queueMicrotask(()=>{ie===t&&cn(null)}),n)}function Wn(e=!0){Ae(null),Te(null),Kt(null),e&&(w==null||w.deactivate()),cn(null),Kn(null)}function qi(){var e=S,t=e.b,n=w,r=!!(t!=null&&t.is_rendered());return t==null||t.update_pending_count(1,n),n.increment(r,e),()=>{t==null||t.update_pending_count(-1,n),n.decrement(r,e)}}let ie=null;function cn(e){ie=e}const gl=new Set;function Ir(e){var t=K|F;return S!==null&&(S.f|=Jt),{ctx:A,deps:null,effects:null,equals:Ei,f:t,fn:e,reactions:null,rv:0,v:U,wv:0,parent:S,ac:null}}const ln=Symbol("obsolete");function ml(e,t,n){let r=S;r===null&&$s();var i=void 0,s=$t(U);s.label=e.toString();var l=!x,a=new Set;return Ll(()=>{var c,p;var u=S;ie={effect:u,effect_deps:new Set,warned:!1};var h=pi();i=h.promise;try{Promise.resolve(e()).then(h.resolve,m=>{m!==Tn&&h.reject(m)}).finally(Wn)}catch(m){h.reject(m),Wn()}{if(ie){if(u.deps!==null)for(let m=0;m<oe;m+=1)ie.effect_deps.add(u.deps[m]);if(Z!==null)for(let m=0;m<Z.length;m+=1)ie.effect_deps.add(Z[m])}ie=null}var d=w;if(l){if(u.f&Zt)var v=qi();if((c=r.b)!=null&&c.is_rendered())(p=d.async_deriveds.get(u))==null||p.reject(ln);else for(const m of a.values())m.reject(ln);a.add(h),d.async_deriveds.set(u,h)}const f=(m,g=void 0)=>{ie=null,v==null||v(),a.delete(h),g!==ln&&(d.activate(),g?(s.f|=ft,Gt(s,g)):(s.f&ft&&(s.f^=ft),Gt(s,m)),d.deactivate())};h.promise.then(f,m=>f(null,m||"unknown"))}),Wi(()=>{for(const u of a)u.reject(ln)}),s.f|=bt,new Promise(u=>{function h(d){function v(){d===i?u(s):h(i)}d.then(v,v)}h(i)})}function Ni(e){const t=Ir(e);return t.equals=ki,t}function wl(e){var t=e.effects;if(t!==null){e.effects=null;for(var n=0;n<t.length;n+=1)ue(t[n])}}let or=[];function Pr(e){var t,n=S,r=e.parent;if(!ct&&r!==null&&e.v!==U&&r.f&(Se|se))return Zs(),e.v;Ae(r);{let i=Wt;Qr(new Set);try{_n.call(or,e)&&Cs(),or.push(e),e.f&=~Tt,wl(e),t=rs(e)}finally{Ae(n),Qr(i),or.pop()}}return t}function Ii(e){var t=Pr(e);if(!e.equals(t)&&(e.wv=ts(),(!(w!=null&&w.is_fork)||e.deps===null)&&(w!==null?(w.capture(e,t,!0),Lt==null||Lt.capture(e,t,!0)):e.v=t,e.deps===null))){P(e,L);return}ct||(J!==null?(Hr()||w!=null&&w.is_fork)&&J.set(e,t):Nr(e))}function yl(e){var t;if(e.effects!==null)for(const n of e.effects)(n.teardown||n.ac)&&((t=n.teardown)==null||t.call(n),n.ac!==null&&Xt(()=>{n.ac.abort(Tn),n.ac=null}),n.fn!==null&&(n.teardown=ys),wn(n,0),zr(n))}function Pi(e){if(e.effects!==null)for(const t of e.effects)t.teardown&&t.fn!==null&&Ot(t)}let fr=null,qt=null,w=null,Lt=null,J=null,Tr=null,dn=!1,ur=!1,Pt=null,Vn=null;var Jr=0,cr=new Set;let bl=1;var jt,lt,wt,Ht,Bt,zt,Ge,Ut,re,En,Ze,Ne,je,Vt,at,O,Ar,an,$r,Di,Li,It,El,on;const Xn=class Xn{constructor(){k(this,O);ce(this,"id",bl++);k(this,jt,!1);ce(this,"linked",!0);k(this,lt,null);k(this,wt,null);ce(this,"async_deriveds",new Map);ce(this,"current",new Map);ce(this,"previous",new Map);k(this,Ht,new Set);k(this,Bt,new Set);k(this,zt,0);k(this,Ge,new Map);k(this,Ut,null);k(this,re,[]);k(this,En,[]);k(this,Ze,new Set);k(this,Ne,new Set);k(this,je,new Map);k(this,Vt,new Set);ce(this,"is_fork",!1);k(this,at,!1);qt===null?fr=qt=this:(E(qt,wt,this),E(this,lt,qt)),qt=this}skip_effect(t){o(this,je).has(t)||o(this,je).set(t,{d:[],m:[]}),o(this,Vt).delete(t)}unskip_effect(t,n=r=>this.schedule(r)){var r=o(this,je).get(t);if(r){o(this,je).delete(t);for(var i of r.d)P(i,F),n(i);for(i of r.m)P(i,ke),n(i)}o(this,Vt).add(t)}capture(t,n,r=!1){t.v!==U&&!this.previous.has(t)&&this.previous.set(t,t.v),t.f&ft||(this.current.set(t,[n,r]),J==null||J.set(t,n)),this.is_fork||(t.v=n)}activate(){w=this}deactivate(){w=null,J=null}flush(){try{vi&&cr.clear(),ur=!0,w=this,T(this,O,an).call(this)}finally{Jr=0,Tr=null,Pt=null,Vn=null,ur=!1,w=null,J=null,ze.clear();for(const t of cr)t.updated=null}}discard(){var t;for(const n of o(this,Bt))n(this);o(this,Bt).clear();for(const n of this.async_deriveds.values())n.reject(ln);T(this,O,on).call(this),(t=o(this,Ut))==null||t.resolve()}register_created_effect(t){o(this,En).push(t)}increment(t,n){if(E(this,zt,o(this,zt)+1),t){let r=o(this,Ge).get(n)??0;o(this,Ge).set(n,r+1)}}decrement(t,n){if(E(this,zt,o(this,zt)-1),t){let r=o(this,Ge).get(n)??0;r===1?o(this,Ge).delete(n):o(this,Ge).set(n,r-1)}o(this,at)||(E(this,at,!0),Je(()=>{E(this,at,!1),this.linked&&this.flush()}))}transfer_effects(t,n){for(const r of t)o(this,Ze).add(r);for(const r of n)o(this,Ne).add(r);t.clear(),n.clear()}oncommit(t){o(this,Ht).add(t)}ondiscard(t){o(this,Bt).add(t)}settled(){return(o(this,Ut)??E(this,Ut,pi())).promise}static ensure(){if(w===null){const t=w=new Xn;!ur&&!dn&&Je(()=>{o(t,jt)||t.flush()})}return w}apply(){{J=null;return}}schedule(t){var i;if(Tr=t,(i=t.b)!=null&&i.is_pending&&t.f&(pn|xn|gi)&&!(t.f&Zt)){t.b.defer_effect(t);return}for(var n=t;n.parent!==null;){n=n.parent;var r=n.f;if(Pt!==null&&n===S&&(x===null||!(x.f&K)))return;if(r&(Qe|xe)){if(!(r&L))return;n.f^=L}}o(this,re).push(n)}};jt=new WeakMap,lt=new WeakMap,wt=new WeakMap,Ht=new WeakMap,Bt=new WeakMap,zt=new WeakMap,Ge=new WeakMap,Ut=new WeakMap,re=new WeakMap,En=new WeakMap,Ze=new WeakMap,Ne=new WeakMap,je=new WeakMap,Vt=new WeakMap,at=new WeakMap,O=new WeakSet,Ar=function(){if(this.is_fork)return!0;for(const r of o(this,Ge).keys()){for(var t=r,n=!1;t.parent!==null;){if(o(this,je).has(t)){n=!0;break}t=t.parent}if(!n)return!0}return!1},an=function(){var u,h,d,v;E(this,jt,!0),Jr++>1e3&&(T(this,O,on).call(this),Sl());for(const f of this.current.keys())cr.add(f);for(const f of o(this,Ze))o(this,Ne).delete(f),P(f,F),this.schedule(f);for(const f of o(this,Ne))P(f,ke),this.schedule(f);const t=o(this,re);E(this,re,[]),this.apply();var n=Pt=[],r=[],i=Vn=[];for(const f of t)try{T(this,O,$r).call(this,f,n,r)}catch(c){throw Hi(f),T(this,O,Ar).call(this)||this.discard(),c}if(w=null,i.length>0){var s=Xn.ensure();for(const f of i)s.schedule(f)}if(Pt=null,Vn=null,T(this,O,Ar).call(this)){T(this,O,It).call(this,r),T(this,O,It).call(this,n);for(const[f,c]of o(this,je))ji(f,c);i.length>0&&T(u=w,O,an).call(u);return}const l=T(this,O,Di).call(this);if(l){T(this,O,It).call(this,r),T(this,O,It).call(this,n),T(h=l,O,Li).call(h,this);return}o(this,Ze).clear(),o(this,Ne).clear();for(const f of o(this,Ht))f(this);o(this,Ht).clear(),Lt=this,Xr(r),Xr(n),Lt=null,(d=o(this,Ut))==null||d.resolve();var a=w;if(o(this,zt)===0&&(o(this,re).length===0||a!==null)&&T(this,O,on).call(this),o(this,re).length>0)if(a!==null){const f=a;o(f,re).push(...o(this,re).filter(c=>!o(f,re).includes(c)))}else a=this;a!==null&&(ze.clear(),T(v=a,O,an).call(v))},$r=function(t,n,r){t.f^=L;for(var i=t.first;i!==null;){var s=i.f,l=(s&(xe|Qe))!==0,a=l&&(s&L)!==0,u=a||(s&se)!==0||o(this,je).has(i);if(!u&&i.fn!==null){l?i.f^=L:s&pn?n.push(i):Qt(i)&&(s&Pe&&o(this,Ne).add(i),Ot(i));var h=i.first;if(h!==null){i=h;continue}}for(;i!==null;){var d=i.next;if(d!==null){i=d;break}i=i.parent}}},Di=function(){for(var t=o(this,lt);t!==null;){if(!t.is_fork){for(const[n,[,r]]of this.current)if(t.current.has(n)&&!r)return t}t=o(t,lt)}return null},Li=function(t){var r;for(const[i,s]of t.current)!this.previous.has(i)&&t.previous.has(i)&&this.previous.set(i,t.previous.get(i)),this.current.set(i,s);for(const[i,s]of t.async_deriveds){const l=this.async_deriveds.get(i);l&&s.promise.then(l.resolve).catch(l.reject)}t.async_deriveds.clear(),this.transfer_effects(o(t,Ze),o(t,Ne));const n=i=>{var s=i.reactions;if(s!==null&&!(i.f&K&&!(i.f&(F|ke))))for(const u of s){var l=u.f;if(l&K)n(u);else{var a=u;l&(bt|Pe)&&!this.async_deriveds.has(a)&&(o(this,Ne).delete(a),P(a,F),this.schedule(a))}}};for(const i of this.current.keys())n(i);this.oncommit(()=>t.discard()),T(r=t,O,on).call(r),w=this,T(this,O,an).call(this)},It=function(t){for(var n=0;n<t.length;n+=1)Ri(t[n],o(this,Ze),o(this,Ne))},El=function(){var v;for(let f=fr;f!==null;f=o(f,wt)){var t=f.id<this.id,n=[];for(const[c,[p,m]]of this.current){if(f.current.has(c)){var r=f.current.get(c)[0];if(t&&p!==r)f.current.set(c,[p,m]);else continue}n.push(c)}if(t)for(const[c,p]of this.async_deriveds){const m=f.async_deriveds.get(c);m&&p.promise.then(m.resolve).catch(m.reject)}var i=[...f.current.keys()].filter(c=>!f.current.get(c)[1]);if(!(!o(f,jt)||i.length===0)){var s=i.filter(c=>!this.current.has(c));if(s.length===0)t&&f.discard();else if(n.length>0){if(o(f,at)||nl(o(f,re).length===0,"Batch has scheduled roots"),t)for(const c of o(this,Vt))f.unskip_effect(c,p=>{var m;p.f&(Pe|bt)?f.schedule(p):T(m=f,O,It).call(m,[p])});f.activate();var l=new Set,a=new Map;for(var u of n)Fi(u,s,l,a);a=new Map;var h=[...f.current].filter(([c,p])=>{const m=this.current.get(c);return m?m[0]!==p[0]||m[1]!==p[1]:!0}).map(([c])=>c);if(h.length>0)for(const c of o(this,En))!(c.f&(Se|se|gn))&&Dr(c,h,a)&&(c.f&(bt|Pe)?(P(c,F),f.schedule(c)):o(f,Ze).add(c));if(o(f,re).length>0&&!o(f,at)){f.apply();for(var d of o(f,re))T(v=f,O,$r).call(v,d,[],[]);E(f,re,[])}f.deactivate()}}}},on=function(){if(this.linked){var t=o(this,lt),n=o(this,wt);t===null?fr=n:E(t,wt,n),n===null?qt=t:E(n,lt,t),this.linked=!1}};let At=Xn;function kl(e){var t=dn;dn=!0;try{for(var n;;){if(rl(),w===null)return n;w.flush()}}finally{dn=t}}function Sl(){{var e=new Map;for(const n of w.current.keys())for(const[r,i]of n.updated??[]){var t=e.get(r);t||(t={error:i.error,count:0},e.set(r,t)),t.count+=i.count}for(const n of e.values())n.error&&console.error(n.error)}try{Ds()}catch(n){ut(n,"stack",{value:""}),ot(n,Tr)}}let qe=null;function Xr(e){var t=e.length;if(t!==0){for(var n=0;n<t;){var r=e[n++];if(!(r.f&(Se|se))&&Qt(r)&&(qe=new Set,Ot(r),r.deps===null&&r.first===null&&r.nodes===null&&r.teardown===null&&r.ac===null&&Ji(r),(qe==null?void 0:qe.size)>0)){ze.clear();for(const i of qe){if(i.f&(Se|se))continue;const s=[i];let l=i.parent;for(;l!==null;)qe.has(l)&&(qe.delete(l),s.push(l)),l=l.parent;for(let a=s.length-1;a>=0;a--){const u=s[a];u.f&(Se|se)||Ot(u)}}qe.clear()}}qe=null}}function Fi(e,t,n,r){if(!n.has(e)&&(n.add(e),e.reactions!==null))for(const i of e.reactions){const s=i.f;s&K?Fi(i,t,n,r):s&(bt|Pe)&&!(s&F)&&Dr(i,t,r)&&(P(i,F),Lr(i))}}function Dr(e,t,n){const r=n.get(e);if(r!==void 0)return r;if(e.deps!==null)for(const i of e.deps){if(_n.call(t,i))return!0;if(i.f&K&&Dr(i,t,n))return n.set(i,!0),!0}return n.set(e,!1),!1}function Lr(e){w.schedule(e)}function ji(e,t){if(!(e.f&xe&&e.f&L)){e.f&F?t.d.push(e):e.f&ke&&t.m.push(e),P(e,L);for(var n=e.first;n!==null;)ji(n,t),n=n.next}}function Hi(e){P(e,L);for(var t=e.first;t!==null;)Hi(t),t=t.next}let Wt=new Set;const ze=new Map;function Qr(e){Wt=e}let Fr=!1;function xl(){Fr=!0}function $t(e,t){var n={f:0,v:e,reactions:null,equals:Ei,rv:0,wv:0};return n}function tt(e,t){const n=$t(e);return Hl(n),n}function Ke(e,t=!1,n=!0){var i;const r=$t(e);return t||(r.equals=ki),An&&n&&A!==null&&A.l!==null&&((i=A.l).s??(i.s=[])).push(r),r}function ei(e,t){return Y(e,C(()=>_(e))),t}function Y(e,t,n=!1){x!==null&&(!be||x.f&gn)&&On()&&x.f&(K|Pe|bt|gn)&&(Ue===null||!Ue.has(e))&&Hs();let r=n?fn(t):t;return Si(r,e.label),Gt(e,r,Vn)}function Gt(e,t,n=null){var i;if(!e.equals(t)){ct?ze.set(e,t):ze.has(e)||ze.set(e,e.v);var r=At.ensure();r.capture(e,t);{if(S!==null){e.updated??(e.updated=new Map);const s=(((i=e.updated.get(""))==null?void 0:i.count)??0)+1;if(e.updated.set("",{error:null,count:s}),s>5){const l=xi("updated at");if(l!==null){let a=e.updated.get(l.stack);a||(a={error:l,count:0},e.updated.set(l.stack,a)),a.count++}}}S!==null&&(e.set_during_effect=!0)}if(e.f&K){const s=e;e.f&F&&Pr(s),J===null&&Nr(s)}e.wv=ts(),zi(e,F,n),On()&&S!==null&&S.f&L&&!(S.f&(xe|Qe))&&(pe===null?Bl([e]):pe.push(e)),!r.is_fork&&Wt.size>0&&!Fr&&Bi()}return t}function Bi(){Fr=!1;for(const e of Wt){e.f&L&&P(e,ke);let t;try{t=Qt(e)}catch{t=!0}t&&Ot(e)}Wt.clear()}function vn(e){Y(e,e.v+1)}function zi(e,t,n){var r=e.reactions;if(r!==null)for(var i=On(),s=r.length,l=0;l<s;l++){var a=r[l],u=a.f;if(!(!i&&a===S)){var h=(u&F)===0;if(h&&P(a,t),u&gn)Wt.add(a);else if(u&K){var d=a;J==null||J.delete(d),u&Tt||(u&Ee&&(S===null||!(S.f&mn))&&(a.f|=Tt),zi(d,ke,n))}else if(h){var v=a;u&Pe&&qe!==null&&qe.add(v),n!==null?n.push(v):Lr(v)}}}}const Tl=/^[a-zA-Z_$][a-zA-Z_$0-9]*$/;function fn(e){if(typeof e!="object"||e===null||Et in e)return e;const t=_i(e);if(t!==ms&&t!==ws)return e;var n=new Map,r=hi(e),i=tt(0),s=xt,l=d=>{if(xt===s)return d();var v=x,f=xt;Te(null),ii(s);var c=d();return Te(v),ii(f),c};r&&(n.set("length",tt(e.length)),e=$l(e));var a="";let u=!1;function h(d){if(!u){u=!0,a=d,G(i,`${a} version`);for(const[v,f]of n)G(f,ht(a,v));u=!1}}return new Proxy(e,{defineProperty(d,v,f){(!("value"in f)||f.configurable===!1||f.enumerable===!1||f.writable===!1)&&Fs();var c=n.get(v);return c===void 0?l(()=>{var p=tt(f.value);return n.set(v,p),typeof v=="string"&&G(p,ht(a,v)),p}):Y(c,f.value,!0),!0},deleteProperty(d,v){var f=n.get(v);if(f===void 0){if(v in d){const c=l(()=>tt(U));n.set(v,c),vn(i),G(c,ht(a,v))}}else Y(f,U),vn(i);return!0},get(d,v,f){var g;if(v===Et)return e;if(v===wi)return h;var c=n.get(v),p=v in d;if(c===void 0&&(!p||(g=Dt(d,v))!=null&&g.writable)&&(c=l(()=>{var y=fn(p?d[v]:U),H=tt(y);return G(H,ht(a,v)),H}),n.set(v,c)),c!==void 0){var m=_(c);return m===U?void 0:m}return Reflect.get(d,v,f)},getOwnPropertyDescriptor(d,v){var f=Reflect.getOwnPropertyDescriptor(d,v);if(f&&"value"in f){var c=n.get(v);c&&(f.value=_(c))}else if(f===void 0){var p=n.get(v),m=p==null?void 0:p.v;if(p!==void 0&&m!==U)return{enumerable:!0,configurable:!0,value:m,writable:!0}}return f},has(d,v){var m;if(v===Et)return!0;var f=n.get(v),c=f!==void 0&&f.v!==U||Reflect.has(d,v);if(f!==void 0||S!==null&&(!c||(m=Dt(d,v))!=null&&m.writable)){f===void 0&&(f=l(()=>{var g=c?fn(d[v]):U,y=tt(g);return G(y,ht(a,v)),y}),n.set(v,f));var p=_(f);if(p===U)return!1}return c},set(d,v,f,c){var $e;var p=n.get(v),m=v in d;if(r&&v==="length")for(var g=f;g<p.v;g+=1){var y=n.get(g+"");y!==void 0?Y(y,U):g in d&&(y=l(()=>tt(U)),n.set(g+"",y),G(y,ht(a,g)))}if(p===void 0)(!m||($e=Dt(d,v))!=null&&$e.writable)&&(p=l(()=>tt(void 0)),G(p,ht(a,v)),Y(p,fn(f)),n.set(v,p));else{m=p.v!==U;var H=l(()=>fn(f));Y(p,H)}var M=Reflect.getOwnPropertyDescriptor(d,v);if(M!=null&&M.set&&M.set.call(c,f),!m){if(r&&typeof v=="string"){var V=n.get("length"),X=Number(v);Number.isInteger(X)&&X>=V.v&&Y(V,X+1)}vn(i)}return!0},ownKeys(d){_(i);var v=Reflect.ownKeys(d).filter(p=>{var m=n.get(p);return m===void 0||m.v!==U});for(var[f,c]of n)c.v!==U&&!(f in d)&&v.push(f);return v},setPrototypeOf(){js()}})}function ht(e,t){return typeof t=="symbol"?`${e}[Symbol(${t.description??""})]`:Tl.test(t)?`${e}.${t}`:/^\\d+$/.test(t)?`${e}[${t}]`:`${e}[\'${t}\']`}function hn(e){try{if(e!==null&&typeof e=="object"&&Et in e)return e[Et]}catch{}return e}const Al=new Set(["copyWithin","fill","pop","push","reverse","shift","sort","splice","unshift"]);function $l(e){return new Proxy(e,{get(t,n,r){var i=Reflect.get(t,n,r);return Al.has(n)?function(...s){xl();var l=i.apply(this,s);return Bi(),l}:i}})}function Ol(){const e=Array.prototype,t=Array.__svelte_cleanup;t&&t();const{indexOf:n,lastIndexOf:r,includes:i}=e;e.indexOf=function(s,l){const a=n.call(this,s,l);if(a===-1){for(let u=l??0;u<this.length;u+=1)if(hn(this[u])===s){Bn("array.indexOf(...)");break}}return a},e.lastIndexOf=function(s,l){const a=r.call(this,s,l??this.length-1);if(a===-1){for(let u=0;u<=(l??this.length-1);u+=1)if(hn(this[u])===s){Bn("array.lastIndexOf(...)");break}}return a},e.includes=function(s,l){const a=i.call(this,s,l);if(!a){for(let u=0;u<this.length;u+=1)if(hn(this[u])===s){Bn("array.includes(...)");break}}return a},Array.__svelte_cleanup=()=>{e.indexOf=n,e.lastIndexOf=r,e.includes=i}}function Nt(e,t,n=!0){try{e===t!=(hn(e)===hn(t))&&Bn(n?"===":"!==")}catch{}return e===t===n}var ti,jr,Ui,Vi;function Ml(){if(ti===void 0){ti=window,jr=/Firefox/.test(navigator.userAgent);var e=Element.prototype,t=Node.prototype,n=Text.prototype;Ui=Dt(t,"firstChild").get,Vi=Dt(t,"nextSibling").get,Yr(e)&&(e[wr]=void 0,e[ks]=null,e[yr]=void 0,e.__e=void 0),Yr(n)&&(n[sn]=void 0),e.__svelte_meta=null,Ol()}}function kt(e=""){return document.createTextNode(e)}function Gn(e){return Ui.call(e)}function Mn(e){return Vi.call(e)}function I(e,t){return Gn(e)}function Cl(e,t=!1){{var n=Gn(e);return n instanceof Comment&&n.data===""?Mn(n):n}}function z(e,t=1,n=!1){let r=e;for(;t--;)r=Mn(r);return r}function Rl(e){e.textContent=""}function Yi(){return!1}function ql(e,t,n){return n?document.createElement(e,{is:n}):document.createElement(e)}function Ki(e){S===null&&(x===null&&Ps(e),Is()),ct&&Ns(e)}function Nl(e,t){var n=t.last;n===null?t.last=t.first=e:(n.next=e,e.prev=n,t.last=e)}function et(e,t){for(var n=S;n!==null&&n.f&gn;)n=n.parent;n!==null&&n.f&se&&(e|=se);var r={ctx:A,deps:null,nodes:null,f:e|F|Ee,first:null,fn:t,last:null,next:null,parent:n,b:n&&n.b,prev:null,teardown:null,wv:0,ac:null};r.component_function=$n,w==null||w.register_created_effect(r);var i=r;if(e&pn)Pt!==null?Pt.push(r):At.ensure().schedule(r);else if(t!==null){try{Ot(r)}catch(l){throw ue(r),l}i.deps===null&&i.teardown===null&&i.nodes===null&&i.first===i.last&&!(i.f&Jt)&&(i=i.first,e&Pe&&e&Yt&&i!==null&&(i.f|=Yt))}if(i!==null&&(i.parent=n,n!==null&&Nl(i,n),x!==null&&x.f&K&&!(e&Qe))){var s=x;(s.effects??(s.effects=[])).push(i)}return r}function Hr(){return x!==null&&!be}function Wi(e){const t=et(xn,null);return P(t,L),t.teardown=e,t}function Or(e){Ki("$effect"),ut(e,"name",{value:"$effect"});var t=S.f,n=!x&&(t&xe)!==0&&A!==null&&!A.i;if(n){var r=A;(r.e??(r.e=[])).push(e)}else return Gi(e)}function Gi(e){return et(pn|mi,e)}function Il(e){return Ki("$effect.pre"),ut(e,"name",{value:"$effect.pre"}),et(xn|mi,e)}function Pl(e){At.ensure();const t=et(Qe|Jt,e);return(n={})=>new Promise(r=>{n.outro?St(t,()=>{ue(t),r(void 0)}):(ue(t),r(void 0))})}function ni(e,t){var n=A,r={effect:null,ran:!1,deps:e};n.l.$.push(r),r.effect=rr(()=>{if(e(),!r.ran){r.ran=!0;var i=S;try{Ae(i.parent),C(t)}finally{Ae(i)}}})}function Dl(){var e=A;rr(()=>{for(var t of e.l.$){t.deps();var n=t.effect;n.f&L&&n.deps!==null&&P(n,ke),Qt(n)&&Ot(n),t.ran=!1}})}function Ll(e){return et(bt|Jt,e)}function rr(e,t=0){return et(xn|t,e)}function nt(e,t=[],n=[],r=[]){_l(r,t,n,i=>{et(xn,()=>{e(...i.map(_))})})}function Br(e,t=0){var n=et(Pe|t,e);return n.dev_stack=Xe,n}function ye(e){return et(xe|Jt,e)}function Zi(e){var t=e.teardown;if(t!==null){const n=ct,r=x;ri(!0),Te(null);try{t.call(null)}finally{ri(n),Te(r)}}}function zr(e,t=!1){var n=e.first;for(e.first=e.last=null;n!==null;){const i=n.ac;i!==null&&Xt(()=>{i.abort(Tn)});var r=n.next;n.f&Qe?n.parent=null:ue(n,t),n=r}}function Fl(e){for(var t=e.first;t!==null;){var n=t.next;t.f&xe||ue(t),t=n}}function ue(e,t=!0){var n=!1;(t||e.f&Es)&&e.nodes!==null&&e.nodes.end!==null&&(jl(e.nodes.start,e.nodes.end),n=!0),e.f|=Kr,zr(e,t&&!n),wn(e,0);var r=e.nodes&&e.nodes.t;if(r!==null)for(const s of r)s.stop();Zi(e),e.f^=Kr,e.f|=Se;var i=e.parent;i!==null&&i.first!==null&&Ji(e),e.component_function=null,e.next=e.prev=e.teardown=e.ctx=e.deps=e.fn=e.nodes=e.ac=e.b=null}function jl(e,t){for(;e!==null;){var n=e===t?null:Mn(e);e.remove(),e=n}}function Ji(e){var t=e.parent,n=e.prev,r=e.next;n!==null&&(n.next=r),r!==null&&(r.prev=n),t!==null&&(t.first===e&&(t.first=r),t.last===e&&(t.last=n))}function St(e,t,n=!0){var r=[];Xi(e,r,!0);var i=()=>{n&&ue(e),t&&t()},s=r.length;if(s>0){var l=()=>--s||i();for(var a of r)a.out(l)}else i()}function Xi(e,t,n){if(!(e.f&se)){e.f^=se;var r=e.nodes&&e.nodes.t;if(r!==null)for(const a of r)(a.is_global||n)&&t.push(a);for(var i=e.first;i!==null;){var s=i.next;if(!(i.f&Qe)){var l=(i.f&Yt)!==0||(i.f&xe)!==0&&(e.f&Pe)!==0;Xi(i,t,l?n:!1)}i=s}}}function Zn(e){Qi(e,!0)}function Qi(e,t){if(e.f&se){e.f^=se,e.f&L||(P(e,F),At.ensure().schedule(e));for(var n=e.first;n!==null;){var r=n.next,i=(n.f&Yt)!==0||(n.f&xe)!==0;Qi(n,i?t:!1),n=r}var s=e.nodes&&e.nodes.t;if(s!==null)for(const l of s)(l.is_global||t)&&l.in()}}function Ur(e,t){if(e.nodes)for(var n=e.nodes.start,r=e.nodes.end;n!==null;){var i=n===r?null:Mn(n);t.append(n),n=i}}let Yn=!1,ct=!1;function ri(e){ct=e}let x=null,be=!1;function Te(e){x=e}let S=null;function Ae(e){S=e}let Ue=null;function Hl(e){x!==null&&(Ue??(Ue=new Set)).add(e)}let Z=null,oe=0,pe=null;function Bl(e){pe=e}let es=1,pt=0,xt=pt;function ii(e){xt=e}function ts(){return++es}function Qt(e){var t=e.f;if(t&F)return!0;if(t&K&&(e.f&=~Tt),t&ke){for(var n=e.deps,r=n.length,i=0;i<r;i++){var s=n[i];if(Qt(s)&&Ii(s),s.wv>e.wv)return!0}t&Ee&&J===null&&P(e,L)}return!1}function ns(e,t,n=!0){var r=e.reactions;if(r!==null&&!(Ue!==null&&Ue.has(e)))for(var i=0;i<r.length;i++){var s=r[i];s.f&K?ns(s,t,!1):t===s&&(n?P(s,F):s.f&L&&P(s,ke),Lr(s))}}function rs(e){var m;var t=Z,n=oe,r=pe,i=x,s=Ue,l=A,a=be,u=xt,h=e.f;Z=null,oe=0,pe=null,x=h&(xe|Qe)?null:e,Ue=null,Kt(e.ctx),be=!1,xt=++pt,e.ac!==null&&(Xt(()=>{e.ac.abort(Tn)}),e.ac=null);try{e.f|=mn;var d=e.fn,v=d();e.f|=Zt;var f=e.deps,c=w==null?void 0:w.is_fork;if(Z!==null){var p;if(c||wn(e,oe),f!==null&&oe>0)for(f.length=oe+Z.length,p=0;p<Z.length;p++)f[oe+p]=Z[p];else e.deps=f=Z;if(Hr()&&e.f&Ee)for(p=oe;p<f.length;p++)((m=f[p]).reactions??(m.reactions=[])).push(e)}else!c&&f!==null&&oe<f.length&&(wn(e,oe),f.length=oe);if(On()&&pe!==null&&!be&&f!==null&&!(e.f&(K|ke|F)))for(p=0;p<pe.length;p++)ns(pe[p],e);if(i!==null&&i!==e){if(pt++,i.deps!==null)for(let g=0;g<n;g+=1)i.deps[g].rv=pt;if(t!==null)for(const g of t)g.rv=pt;pe!==null&&(r===null?r=pe:r.push(...pe))}return e.f&ft&&(e.f^=ft),v}catch(g){return Oi(g)}finally{e.f^=mn,Z=t,oe=n,pe=r,x=i,Ue=s,Kt(l),be=a,xt=u}}function zl(e,t){let n=t.reactions;if(n!==null){var r=ps.call(n,e);if(r!==-1){var i=n.length-1;i===0?n=t.reactions=null:(n[r]=n[i],n.pop())}}if(n===null&&t.f&K&&(Z===null||!_n.call(Z,t))){var s=t;s.f&Ee&&(s.f^=Ee,s.f&=~Tt),s.v!==U&&Nr(s),s.ac!==null&&Xt(()=>{s.ac.abort(Tn),s.ac=null,P(s,F)}),yl(s),wn(s,0)}}function wn(e,t){var n=e.deps;if(n!==null)for(var r=t;r<n.length;r++)zl(e,n[r])}function Ot(e){var t=e.f;if(!(t&Se)){P(e,L);var n=S,r=Yn;S=e,Yn=(t&(xe|Qe))===0;{var i=$n;Gr(e.component_function);var s=Xe;Kn(e.dev_stack??Xe)}try{t&(Pe|gi)?Fl(e):zr(e),Zi(e);var l=rs(e);e.teardown=typeof l=="function"?l:null,e.wv=es;var a;vi&&Qs&&e.f&F&&e.deps}finally{Yn=r,S=n,Gr(i),Kn(s)}}}async function Ul(){await Promise.resolve(),kl()}function _(e){var t=e.f,n=(t&K)!==0;if(x!==null&&!be){var r=S!==null&&(S.f&Se)!==0;if(!r&&(Ue===null||!Ue.has(e))){var i=x.deps;if(x.f&mn)e.rv<pt&&(e.rv=pt,Z===null&&i!==null&&i[oe]===e?oe++:Z===null?Z=[e]:Z.push(e));else{x.deps??(x.deps=[]),_n.call(x.deps,e)||x.deps.push(e);var s=e.reactions;s===null?e.reactions=[x]:_n.call(s,x)||s.push(x)}}}{if(!be&&ie&&w===null&&Lt===null&&!ie.warned&&!(ie.effect.f&mn)&&!ie.effect_deps.has(e)){ie.warned=!0,Gs(e.label);var l=xi("traced at");l&&console.warn(l)}gl.delete(e)}if(ct&&ze.has(e))return ze.get(e);if(n){var a=e;if(ct){var u=a.v;return(!(a.f&L)&&a.reactions!==null||ss(a))&&(u=Pr(a)),ze.set(a,u),u}var h=(a.f&Ee)===0&&!be&&x!==null&&(Yn||(x.f&Ee)!==0),d=(a.f&Zt)===0;Qt(a)&&(h&&(a.f|=Ee),Ii(a)),h&&!d&&(Pi(a),is(a))}if(J!=null&&J.has(e))return J.get(e);if(e.f&ft)throw e.v;return e.v}function is(e){if(e.f|=Ee,e.deps!==null)for(const t of e.deps)(t.reactions??(t.reactions=[])).push(e),t.f&K&&!(t.f&Ee)&&(Pi(t),is(t))}function ss(e){if(e.v===U)return!0;if(e.deps===null)return!1;for(const t of e.deps)if(ze.has(t)||t.f&K&&ss(t))return!0;return!1}function C(e){var t=be;try{return be=!0,e()}finally{be=t}}function Vl(e){if(!(typeof e!="object"||!e||e instanceof EventTarget)){if(Et in e)Mr(e);else if(!Array.isArray(e))for(let t in e){const n=e[t];typeof n=="object"&&n&&Et in n&&Mr(n)}}}function Mr(e,t=new Set){if(typeof e=="object"&&e!==null&&!(e instanceof EventTarget)&&!t.has(e)){t.add(e),e instanceof Date&&e.getTime();for(let r in e)try{Mr(e[r],t)}catch{}const n=_i(e);if(n!==Object.prototype&&n!==Array.prototype&&n!==Map.prototype&&n!==Set.prototype&&n!==Date.prototype){const r=gs(n);for(let i in r){const s=r[i].get;if(s)try{s.call(e)}catch{}}}}}const Yl=["touchstart","touchmove"];function Kl(e){return Yl.includes(e)}function le(e,t,n){return(...r)=>{const i=e(...r);var s=i.nodeType===Ts?i.firstChild:i;return ls(s,t,n),i}}function Wl(e,t,n){e.__svelte_meta={parent:Xe,loc:{file:t,line:n[0],column:n[1]}},n[2]&&ls(e.firstChild,t,n[2])}function ls(e,t,n){for(var r=0;e&&r<n.length;)e.nodeType===xs&&Wl(e,t,n[r++]),e=e.nextSibling}const Dn=Symbol("events"),Gl=new Set,si=new Set;function Zl(e,t,n,r={}){function i(s){if(r.capture||Cr.call(t,s),!s.cancelBubble)return Xt(()=>n==null?void 0:n.call(this,s))}return e.startsWith("pointer")||e.startsWith("touch")||e==="wheel"?Je(()=>{t.addEventListener(e,i,r)}):t.addEventListener(e,i,r),i}function Jl(e,t,n,r,i){var s={capture:r,passive:i},l=Zl(e,t,n,s);(t===document.body||t===window||t===document||t instanceof HTMLMediaElement)&&Wi(()=>{t.removeEventListener(e,l,s)})}let dr=null,vr=!1;function Cr(e){var m,g;var t=this,n=t.ownerDocument,r=e.type,i=((m=e.composedPath)==null?void 0:m.call(e))||[],s=i[0]||e.target;dr=e,vr||(vr=!0,setTimeout(()=>{vr=!1,dr=null}));var l=0,a=dr===e&&e[Dn];if(a){var u=i.indexOf(a);if(u!==-1&&(t===document||t===window)){e[Dn]=t;return}var h=i.indexOf(t);if(h===-1)return;u<=h&&(l=u)}if(s=i[l]||e.target,s!==t){ut(e,"currentTarget",{configurable:!0,get(){return s||n}});var d=x,v=S;Te(null),Ae(null);try{for(var f,c=[];s!==null&&s!==t;){try{var p=(g=s[Dn])==null?void 0:g[r];p!=null&&(!s.disabled||e.target===s)&&p.call(s,e)}catch(y){f?c.push(y):f=y}if(e.cancelBubble)break;l++,s=l<i.length?i[l]:null}if(f){for(let y of c)queueMicrotask(()=>{throw y});throw f}}finally{e[Dn]=t,delete e.currentTarget,Te(d),Ae(v)}}}var ci;const hr=((ci=globalThis==null?void 0:globalThis.window)==null?void 0:ci.trustedTypes)&&globalThis.window.trustedTypes.createPolicy("svelte-trusted-html",{createHTML:e=>e});function Xl(e){return(hr==null?void 0:hr.createHTML(e))??e}function Ql(e){var t=ql("template");return t.innerHTML=Xl(e.replaceAll("<!>","\\x3C!---->")),t.content}function li(e,t){var n=S;n.nodes===null&&(n.nodes={start:e,end:t,a:null,t:null})}function ae(e,t){var n=(t&Ks)!==0,r=(t&Ws)!==0,i,s=!e.startsWith("<!>");return()=>{i===void 0&&(i=Ql(s?e:"<!>"+e),n||(i=Gn(i)));var l=r||jr?document.importNode(i,!0):i.cloneNode(!0);if(n){var a=Gn(l),u=l.lastChild;li(a,u)}else li(l,l);return l}}function te(e,t){e!==null&&e.before(t)}function Re(e,t){var n=t==null?"":typeof t=="object"?`${t}`:t;n!==(e[sn]??(e[sn]=e.nodeValue))&&(e[sn]=n,e.nodeValue=`${n}`)}function ea(e,t){return ta(e,t)}const Ln=new Map;function ta(e,{target:t,anchor:n,props:r={},events:i,context:s,intro:l=!0,transformError:a}){Ml();var u=void 0,h=Pl(()=>{var d=n??t.appendChild(kt());ul(d,{pending:()=>{}},c=>{Ti({});var p=A;s&&(p.c=s),i&&(r.$$events=i),u=e(c,r)||{},Ai()},a);var v=new Set,f=c=>{for(var p=0;p<c.length;p++){var m=c[p];if(!v.has(m)){v.add(m);var g=Kl(m);for(const M of[t,document]){var y=Ln.get(M);y===void 0&&(y=new Map,Ln.set(M,y));var H=y.get(m);H===void 0?(M.addEventListener(m,Cr,{passive:g}),y.set(m,1)):y.set(m,H+1)}}}};return f(er(Gl)),si.add(f),()=>{var g;for(var c of v)for(const y of[t,document]){var p=Ln.get(y),m=p.get(c);--m==0?(y.removeEventListener(c,Cr),p.delete(c),p.size===0&&Ln.delete(y)):p.set(c,m)}si.delete(f),d!==n&&((g=d.parentNode)==null||g.removeChild(d))}});return na.set(u,h),u}let na=new WeakMap;function ra(e){e&&Ms(e[j]??"a component",e.name)}function ia(){const e=A==null?void 0:A.function;function t(n){Os(n,e[j])}return{$destroy:()=>t("$destroy()"),$on:()=>t("$on(...)"),$set:()=>t("$set(...)")}}var Ie,He,ve,yt,kn,Sn,Qn;class sa{constructor(t,n=!0){ce(this,"anchor");k(this,Ie,new Map);k(this,He,new Map);k(this,ve,new Map);k(this,yt,new Set);k(this,kn,!0);k(this,Sn,t=>{if(o(this,Ie).has(t)){var n=o(this,Ie).get(t),r=o(this,He).get(n);if(r)Zn(r),o(this,yt).delete(n);else{var i=o(this,ve).get(n);i&&(Zn(i.effect),o(this,He).set(n,i.effect),o(this,ve).delete(n),i.fragment.lastChild[Ss]=this.anchor,i.fragment.lastChild.remove(),this.anchor.before(i.fragment),r=i.effect)}for(const[s,l]of o(this,Ie)){if(o(this,Ie).delete(s),s===t)break;const a=o(this,ve).get(l);a&&(ue(a.effect),o(this,ve).delete(l))}for(const[s,l]of o(this,He)){if(s===n||o(this,yt).has(s))continue;const a=()=>{if(Array.from(o(this,Ie).values()).includes(s)){var h=document.createDocumentFragment();Ur(l,h),h.append(kt()),o(this,ve).set(s,{effect:l,fragment:h})}else ue(l);o(this,yt).delete(s),o(this,He).delete(s)};o(this,kn)||!r?(o(this,yt).add(s),St(l,a,!1)):a()}}});k(this,Qn,t=>{o(this,Ie).delete(t);const n=Array.from(o(this,Ie).values());for(const[r,i]of o(this,ve))n.includes(r)||(ue(i.effect),o(this,ve).delete(r))});this.anchor=t,E(this,kn,n)}ensure(t,n){var r=w,i=Yi();if(n&&!o(this,He).has(t)&&!o(this,ve).has(t))if(i){var s=document.createDocumentFragment(),l=kt();s.append(l),o(this,ve).set(t,{effect:ye(()=>n(l)),fragment:s})}else o(this,He).set(t,ye(()=>n(this.anchor)));if(o(this,Ie).set(r,t),i){for(const[a,u]of o(this,He))a===t?r.unskip_effect(u):r.skip_effect(u);for(const[a,u]of o(this,ve))a===t?r.unskip_effect(u.effect):r.skip_effect(u.effect);r.oncommit(o(this,Sn)),r.ondiscard(o(this,Qn))}else o(this,Sn).call(this,r)}}Ie=new WeakMap,He=new WeakMap,ve=new WeakMap,yt=new WeakMap,kn=new WeakMap,Sn=new WeakMap,Qn=new WeakMap;function rt(e,t,n=!1){var r=new sa(e),i=n?Yt:0;function s(l,a){r.ensure(l,a)}Br(()=>{var l=!1;t((a,u=0)=>{l=!0,s(u,a)}),l||s(-1,null)},i)}function Fn(e,t){return t}function la(e,t,n){for(var r=[],i=t.length,s,l=t.length,a=0;a<i;a++){let v=t[a];St(v,()=>{if(s){if(s.pending.delete(v),s.done.add(v),s.pending.size===0){var f=e.outrogroups;Rr(e,er(s.done)),f.delete(s),f.size===0&&(e.outrogroups=null)}}else l-=1},!1)}if(l===0){var u=r.length===0&&n!==null&&e.pending.size===0;if(u){var h=n,d=h.parentNode;Rl(d),d.append(h),e.items.clear()}Rr(e,t,!u)}else s={pending:new Set(t),done:new Set},(e.outrogroups??(e.outrogroups=new Set)).add(s)}function Rr(e,t,n=!0){var r;if(e.pending.size>0){r=new Set;for(const l of e.pending.values())for(const a of l)r.add(e.items.get(a).e)}for(var i=0;i<t.length;i++){var s=t[i];if(r!=null&&r.has(s)){s.f|=Be;const l=document.createDocumentFragment();Ur(s,l)}else ue(t[i],n)}}var ai;function jn(e,t,n,r,i,s=null){var l=e,a=new Map,u=(t&bi)!==0;if(u){var h=e;l=h.appendChild(kt())}var d=null,v=Ni(()=>{var M=n();return hi(M)?M:M==null?[]:er(M)});G(v,"{#each ...}");var f,c=new Map,p=!0;function m(M){H.effect.f&Se||(H.pending.delete(M),H.fallback=d,aa(H,f,l,t,r),d!==null&&(f.length===0?d.f&Be?(d.f^=Be,un(d,null,l)):Zn(d):St(d,()=>{d=null})))}function g(M){H.pending.delete(M)}var y=Br(()=>{f=_(v);for(var M=f.length,V=new Set,X=w,$e=Yi(),W=0;W<M;W+=1){var De=f[W],b=r(De,W);{var D=r(De,W);b!==D&&qs(String(W),String(b),String(D))}var q=p?null:a.get(b);q?(q.v&&Gt(q.v,De),q.i&&Gt(q.i,W),$e&&X.unskip_effect(q.e)):(q=oa(a,p?l:ai??(ai=kt()),De,b,W,i,t,n),p||(q.e.f|=Be),a.set(b,q)),V.add(b)}if(M===0&&s&&!d&&(p?d=ye(()=>s(l)):(d=ye(()=>s(ai??(ai=kt()))),d.f|=Be)),M>V.size&&fa(f,r),!p)if(c.set(X,V),$e){for(const[Oe,Mt]of a)V.has(Oe)||X.skip_effect(Mt.e);X.oncommit(m),X.ondiscard(g)}else m(X);_(v)}),H={effect:y,items:a,pending:c,outrogroups:null,fallback:d};p=!1}function rn(e){for(;e!==null&&!(e.f&xe);)e=e.next;return e}function aa(e,t,n,r,i){var D,q,Oe,Mt,Cn,Rn,en,tn,qn;var s=(r&Vs)!==0,l=t.length,a=e.items,u=rn(e.effect.first),h,d=null,v,f=[],c=[],p,m,g,y;if(s)for(y=0;y<l;y+=1)p=t[y],m=i(p,y),g=a.get(m).e,g.f&Be||((q=(D=g.nodes)==null?void 0:D.a)==null||q.measure(),(v??(v=new Set)).add(g));for(y=0;y<l;y+=1){if(p=t[y],m=i(p,y),g=a.get(m).e,e.outrogroups!==null)for(const he of e.outrogroups)he.pending.delete(g),he.done.delete(g);if(g.f&se&&(Zn(g),s&&((Mt=(Oe=g.nodes)==null?void 0:Oe.a)==null||Mt.unfix(),(v??(v=new Set)).delete(g))),g.f&Be)if(g.f^=Be,g===u)un(g,null,n);else{var H=d?d.next:u;g===e.effect.last&&(e.effect.last=g.prev),g.prev&&(g.prev.next=g.next),g.next&&(g.next.prev=g.prev),it(e,d,g),it(e,g,H),un(g,H,n),d=g,f=[],c=[],u=rn(d.next);continue}if(g!==u){if(h!==void 0&&h.has(g)){if(f.length<c.length){var M=c[0],V;d=M.prev;var X=f[0],$e=f[f.length-1];for(V=0;V<f.length;V+=1)un(f[V],M,n);for(V=0;V<c.length;V+=1)h.delete(c[V]);it(e,X.prev,$e.next),it(e,d,X),it(e,$e,M),u=M,d=$e,y-=1,f=[],c=[]}else h.delete(g),un(g,u,n),it(e,g.prev,g.next),it(e,g,d===null?e.effect.first:d.next),it(e,d,g),d=g;continue}for(f=[],c=[];u!==null&&u!==g;)(h??(h=new Set)).add(u),c.push(u),u=rn(u.next);if(u===null)continue}g.f&Be||f.push(g),d=g,u=rn(g.next)}if(e.outrogroups!==null){for(const he of e.outrogroups)he.pending.size===0&&(Rr(e,er(he.done)),(Cn=e.outrogroups)==null||Cn.delete(he));e.outrogroups.size===0&&(e.outrogroups=null)}if(u!==null||h!==void 0){var W=[];if(h!==void 0)for(g of h)g.f&se||W.push(g);for(;u!==null;)!(u.f&se)&&u!==e.fallback&&W.push(u),u=rn(u.next);var De=W.length;if(De>0){var b=r&bi&&l===0?n:null;if(s){for(y=0;y<De;y+=1)(en=(Rn=W[y].nodes)==null?void 0:Rn.a)==null||en.measure();for(y=0;y<De;y+=1)(qn=(tn=W[y].nodes)==null?void 0:tn.a)==null||qn.fix()}la(e,W,b)}}s&&Je(()=>{var he,Nn;if(v!==void 0)for(g of v)(Nn=(he=g.nodes)==null?void 0:he.a)==null||Nn.apply()})}function oa(e,t,n,r,i,s,l,a){var u=l&zs?l&Ys?$t(n):Ke(n,!1,!1):null,h=l&Us?$t(i):null;return u&&(u.trace=()=>{a()[(h==null?void 0:h.v)??i]}),{v:u,i:h,e:ye(()=>(s(t,u??n,h??i,a),()=>{e.delete(r)}))}}function un(e,t,n){if(e.nodes)for(var r=e.nodes.start,i=e.nodes.end,s=t&&!(t.f&Be)?t.nodes.start:n;r!==null;){var l=Mn(r);if(s.before(r),r===i)return;r=l}}function it(e,t,n){t===null?e.effect.first=n:t.next=n,n===null?e.effect.last=t:n.prev=t}function fa(e,t){const n=new Map,r=e.length;for(let i=0;i<r;i++){const s=t(e[i],i);if(n.has(s)){const l=String(n.get(s)),a=String(i);let u=String(s);u.startsWith("[object ")&&(u=null),Rs(l,a,u)}n.set(s,i)}}const oi=[...` 	\n\\r\\f \\v\\uFEFF`];function ua(e,t,n){var r=""+e;if(n){for(var i of Object.keys(n))if(n[i])r=r?r+" "+i:i;else if(r.length)for(var s=i.length,l=0;(l=r.indexOf(i,l))>=0;){var a=l+s;(l===0||oi.includes(r[l-1]))&&(a===r.length||oi.includes(r[a]))?r=(l===0?"":r.substring(0,l))+r.substring(a+1):l=a}}return r===""?null:r}function ca(e,t){return e==null?null:String(e)}function da(e,t,n,r,i,s){var l=e[wr];if(l!==n||l===void 0){var a=ua(n,r,s);a==null?e.removeAttribute("class"):e.className=a,e[wr]=n}else if(s&&i!==s)for(var u in s){var h=!!s[u];(i==null||h!==!!i[u])&&e.classList.toggle(u,h)}return s}function va(e,t,n,r){var i=e[yr];if(i!==t){var s=ca(t);s==null?e.removeAttribute("style"):e.style.cssText=s,e[yr]=t}return r}function fi(e,t,n=t){var r=new WeakSet;al(e,"input",async i=>{e.type==="checkbox"&&Wr();var s=i?e.defaultValue:e.value;if(s=_r(e)?pr(s):s,n(s),w!==null&&r.add(w),await Ul(),s!==(s=t())){var l=e.selectionStart,a=e.selectionEnd,u=e.value.length;if(e.value=s??"",a!==null){var h=e.value.length;l===a&&a===u&&h>u?(e.selectionStart=h,e.selectionEnd=h):(e.selectionStart=l,e.selectionEnd=Math.min(a,h))}}}),C(t)==null&&e.value&&(n(_r(e)?pr(e.value):e.value),w!==null&&r.add(w)),rr(()=>{e.type==="checkbox"&&Wr();var i=t();if(e===document.activeElement){var s=w;if(r.has(s))return}_r(e)&&i===pr(e.value)||e.type==="date"&&!i&&!e.value||i!==e.value&&(e.value=i??"")})}function _r(e){var t=e.type;return t==="number"||t==="range"}function pr(e){return e===""?null:+e}function ha(e=!1){const t=A,n=t.l.u;if(!n)return;let r=()=>Vl(t.s);if(e){let i=0,s={};const l=Ir(()=>{let a=!1;const u=t.s;for(const h in u)u[h]!==s[h]&&(s[h]=u[h],a=!0);return a&&i++,i});r=()=>_(l)}n.b.length&&Il(()=>{ui(t,r),gr(n.b)}),Or(()=>{const i=C(()=>n.m.map(bs));return()=>{for(const s of i)typeof s=="function"&&s()}}),n.a.length&&Or(()=>{ui(t,r),gr(n.a)})}function ui(e,t){if(e.l.s)for(const n of e.l.s)_(n);t()}{let e=function(t){if(!(t in globalThis)){let n;Object.defineProperty(globalThis,t,{configurable:!0,get:()=>{if(n!==void 0)return n;Ls(t)},set:r=>{n=r}})}};var Pa=e;e("$state"),e("$effect"),e("$derived"),e("$inspect"),e("$props"),e("$bindable")}function as(e){A===null&&yi("onMount"),An&&A.l!==null?pa(A).m.push(e):Or(()=>{const t=C(e);if(typeof t=="function")return t})}function _a(e){A===null&&yi("onDestroy"),as(()=>()=>C(e))}function pa(e){var t=e.l;return t.u??(t.u={a:[],b:[],m:[]})}const ga="5";var di;typeof window<"u"&&((di=window.__svelte??(window.__svelte={})).v??(di.v=new Set)).add(ga);el();function ma(e){const t=new Map;for(const l of e.questions){let a=t.get(l.round);a||(a={round:l.round,nodes:[]},t.set(l.round,a)),a.nodes.push({id:l.id,title:l.title,answered:!!l.answered,rec:l.rec})}const n=[...t.values()].sort((l,a)=>l.round-a.round);for(const l of n)l.nodes.sort((a,u)=>a.id.localeCompare(u.id));const r=new Set(e.questions.filter(l=>l.answered).map(l=>l.id)),i=[];for(const l of e.questions){if(l.answered)continue;const a=l.deps.filter(u=>!r.has(u));a.length>0&&i.push({node:{id:l.id,title:l.title,rec:l.rec},blockedBy:a})}i.sort((l,a)=>l.node.id.localeCompare(a.node.id));const s=e.edges.map(l=>({from:l.from,to:l.to,type:l.type}));return{rows:n,upcoming:i,edges:s}}$[j]="scripts/grilling-ui/src/App.svelte";var wa=le(ae(\'<span class="page-state svelte-9cqna5"> </span>\'),$[j],[[112,6]]),ya=le(ae("<p>Loading...</p>"),$[j],[[117,4]]),ba=le(ae(\'<p class="error svelte-9cqna5"> </p>\'),$[j],[[119,4]]),Ea=le(ae(\'<div class="summary-text svelte-9cqna5"> </div>\'),$[j],[[131,8]]),ka=le(ae(\'<span class="badge answered-badge svelte-9cqna5">answered</span>\'),$[j],[[154,18]]),Sa=le(ae(\'<input type="text" placeholder="answer..." class="svelte-9cqna5"/>\'),$[j],[[157,18]]),xa=le(ae(\'<div><span class="node-id svelte-9cqna5"> </span> <span class="node-title svelte-9cqna5"> </span> <!> <!></div>\'),$[j],[[150,14,[[151,16],[152,16]]]]),Ta=le(ae(\'<div class="round-row svelte-9cqna5"><h3> </h3> <div class="nodes svelte-9cqna5"></div></div>\'),$[j],[[146,8,[[147,10],[148,10]]]]),Aa=le(ae(\'<li class="svelte-9cqna5"><span class="edge-from"> </span> <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5"></line></svg> <span class="edge-to"> </span> <span class="edge-type svelte-9cqna5"> </span></li>\'),$[j],[[175,14,[[176,16],[177,16,[[177,44]]],[178,16],[179,16]]]]),$a=le(ae(\'<div class="edges svelte-9cqna5"><h3>Edges</h3> <ul class="svelte-9cqna5"></ul></div>\'),$[j],[[171,8,[[172,10],[173,10]]]]),Oa=le(ae(\'<li class="svelte-9cqna5"><span class="node-id svelte-9cqna5"> </span> <span class="blocked-by svelte-9cqna5"> </span></li>\'),$[j],[[192,14,[[193,16],[194,16]]]]),Ma=le(ae(\'<div class="upcoming svelte-9cqna5"><h3>Upcoming (blocked)</h3> <ul class="svelte-9cqna5"></ul></div>\'),$[j],[[188,8,[[189,10],[190,10]]]]),Ca=le(ae(\'<div class="submit-section svelte-9cqna5"><button class="svelte-9cqna5">Send all answers</button></div>\'),$[j],[[203,8,[[204,10]]]]),Ra=le(ae(\'<aside class="summary svelte-9cqna5"><h2>Summary</h2> <textarea placeholder="Free-form summary / feedback..." rows="6" class="svelte-9cqna5"></textarea> <!></aside> <main class="graph svelte-9cqna5"><div class="legend svelte-9cqna5"><span class="legend-item svelte-9cqna5"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: black; stroke-width: 2px;"></line></svg> dependency</span> <span class="legend-item svelte-9cqna5"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: red; stroke-width: 2px;"></line></svg> contradiction</span> <span class="legend-item svelte-9cqna5"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: gray; stroke-width: 1px; stroke-dasharray: 4 4;"></line></svg> reference</span></div> <!> <!> <!> <!></main>\',1),$[j],[[122,4,[[123,6],[124,6]]],[136,4,[[138,6,[[139,8,[[139,34,[[139,61]]]]],[140,8,[[140,34,[[140,61]]]]],[141,8,[[141,34,[[141,61]]]]]]]]]]),qa=le(ae(\'<div class="container svelte-9cqna5"><header class="svelte-9cqna5"><h1>Grilling Visualizer</h1> <!></header> <!></div>\'),$[j],[[108,0,[[109,2,[[110,4]]]]]]);function $(e,t){ra(new.target),Ti(t,!1,$);const n=Ke(),r=Ke();let i=G(Ke(null),"state"),s=G(Ke({rows:[],upcoming:[],edges:[]}),"model"),l=G(Ke(!0),"loading"),a=G(Ke(null),"error"),u=null,h=G(Ke({}),"answers"),d=G(Ke(""),"feedback");async function v(){try{const b=(await Pn(fetch("/state")))();if(!b.ok)throw new Error(`HTTP ${b.status}`);if(Y(i,(await Pn(b.json()))()),Y(s,ma(_(i))),_(i).answers&&Y(h,{..._(i).answers}),Nt(_(i)["page-state"],"in-round")){const D=c(_(s));for(const q of _(s).rows)if(Nt(q.round,D))for(const Oe of q.nodes)Oe.id in _(h)||ei(h,_(h)[Oe.id]="")}Y(a,null)}catch(b){Y(a,b.message)}finally{Y(l,!1)}}async function f(){try{const b=(await Pn(fetch("/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:_(h),feedback:_(d)})})))();if(!b.ok)throw new Error(`HTTP ${b.status}`);(await Pn(v()))()}catch(b){Y(a,b.message)}}as(()=>{v(),u=setInterval(v,2e3)}),_a(()=>{u&&clearInterval(u)});function c(b){if(Nt(b.rows.length,0))return 0;for(const D of b.rows)if(D.nodes.some(q=>!q.answered))return D.round;return b.rows[b.rows.length-1].round}function p(b){switch(b){case"dep":return"stroke: black; stroke-width: 2px;";case"contra":return"stroke: red; stroke-width: 2px;";case"ref":return"stroke: gray; stroke-width: 1px; stroke-dasharray: 4 4;";default:return"stroke: black; stroke-width: 1px;"}}function m(b){switch(b){case"dep":return"dependency";case"contra":return"contradiction";case"ref":return"reference";default:return b}}ni(()=>_(s),()=>{Y(n,c(_(s)))}),ni(()=>_(i),()=>{var b;Y(r,Nt((b=_(i))==null?void 0:b["page-state"],"in-round"))}),Dl();var g={...ia()};ha();var y=qa(),H=I(y),M=z(I(H),2);{var V=b=>{var D=wa(),q=I(D);nt(()=>Re(q,`State: ${_(i),C(()=>_(i)["page-state"])??""}`)),te(b,D)};_e(()=>rt(M,b=>{_(i)&&b(V)}),"if",$,111,4)}var X=z(H,2);{var $e=b=>{var D=ya();te(b,D)},W=b=>{var D=ba(),q=I(D);nt(()=>Re(q,`Error: ${_(a)??""}`)),te(b,D)},De=b=>{var D=Ra(),q=Cl(D),Oe=z(I(q),2),Mt=z(Oe,2);{var Cn=B=>{var N=Ea(),Me=I(N);nt(()=>Re(Me,(_(i),C(()=>_(i).summary)))),te(B,N)};_e(()=>rt(Mt,B=>{_(i),C(()=>{var N;return(N=_(i))==null?void 0:N.summary})&&B(Cn)}),"if",$,130,6)}var Rn=z(q,2),en=z(I(Rn),2);_e(()=>jn(en,1,()=>(_(s),C(()=>_(s).rows)),Fn,(B,N)=>{var Me=Ta(),dt=I(Me),Q=I(dt);var Le=z(dt,2);_e(()=>jn(Le,5,()=>(_(N),C(()=>_(N).nodes)),Fn,(Ve,ee)=>{var Ce=xa();let Ct;var Ye=I(Ce),ir=I(Ye,!0);var Rt=z(Ye,2),sr=I(Rt,!0);var In=z(Rt,2);{var lr=vt=>{var nn=ka();te(vt,nn)};_e(()=>rt(In,vt=>{_(ee),C(()=>_(ee).answered)&&vt(lr)}),"if",$,153,16)}var us=z(In,2);{var cs=vt=>{var nn=Sa();fi(nn,function(){return _(h)[_(ee).id]},function(vs){ei(h,_(h)[_(ee).id]=vs)}),te(vt,nn)};_e(()=>rt(us,vt=>{_(r),_(N),_(n),_(ee),C(()=>_(r)&&Nt(_(N).round,_(n))&&!_(ee).answered)&&vt(cs)}),"if",$,156,16)}nt(()=>{Ct=da(Ce,1,"node svelte-9cqna5",null,Ct,{answered:_(ee).answered,current:_(r)&&Nt(_(N).round,_(n))}),Re(ir,(_(ee),C(()=>_(ee).id))),Re(sr,(_(ee),C(()=>_(ee).title)))}),te(Ve,Ce)}),"each",$,149,12),nt(()=>Re(Q,`Round ${_(N),C(()=>_(N).round)??""}`)),te(B,Me)}),"each",$,145,6);var tn=z(en,2);{var qn=B=>{var N=$a(),Me=z(I(N),2);_e(()=>jn(Me,5,()=>(_(s),C(()=>_(s).edges)),Fn,(dt,Q)=>{var Le=Aa(),Ve=I(Le),ee=I(Ve,!0);var Ce=z(Ve,2),Ct=I(Ce);var Ye=z(Ce,2),ir=I(Ye,!0);var Rt=z(Ye,2),sr=I(Rt);nt((In,lr)=>{Re(ee,(_(Q),C(()=>_(Q).from))),va(Ct,In),Re(ir,(_(Q),C(()=>_(Q).to))),Re(sr,`(${lr??""})`)},[()=>(_(Q),C(()=>p(_(Q).type))),()=>(_(Q),C(()=>m(_(Q).type)))]),te(dt,Le)}),"each",$,174,12),te(B,N)};_e(()=>rt(tn,B=>{_(s),C(()=>_(s).edges.length>0)&&B(qn)}),"if",$,170,6)}var he=z(tn,2);{var Nn=B=>{var N=Ma(),Me=z(I(N),2);_e(()=>jn(Me,5,()=>(_(s),C(()=>_(s).upcoming)),Fn,(dt,Q)=>{var Le=Oa(),Ve=I(Le),ee=I(Ve,!0);var Ce=z(Ve,2),Ct=I(Ce);nt(Ye=>{Re(ee,(_(Q),C(()=>_(Q).node.id))),Re(Ct,`blocked by: ${Ye??""}`)},[()=>(_(Q),C(()=>_(Q).blockedBy.join(", ")))]),te(dt,Le)}),"each",$,191,12),te(B,N)};_e(()=>rt(he,B=>{_(s),C(()=>_(s).upcoming.length>0)&&B(Nn)}),"if",$,187,6)}var os=z(he,2);{var fs=B=>{var N=Ca(),Me=I(N);Jl("click",Me,f),te(B,N)};_e(()=>rt(os,B=>{_(r)&&B(fs)}),"if",$,202,6)}nt(()=>Oe.disabled=!_(r)),fi(Oe,function(){return _(d)},function(N){Y(d,N)}),te(b,D)};_e(()=>rt(X,b=>{_(l)?b($e):_(a)?b(W,1):b(De,-1)}),"if",$,116,2)}return te(e,y),Ai(g)}ea($,{target:document.getElementById("app")});<\/script>\n    <style rel="stylesheet" crossorigin>.container.svelte-9cqna5{display:flex;gap:1rem;font-family:sans-serif;max-width:1200px;margin:0 auto;padding:1rem}header.svelte-9cqna5{grid-column:1 / -1}.page-state.svelte-9cqna5{font-weight:700;color:#555}.summary.svelte-9cqna5{flex:0 0 300px;border-right:1px solid #ccc;padding-right:1rem}.summary.svelte-9cqna5 textarea:where(.svelte-9cqna5){width:100%;box-sizing:border-box}.summary-text.svelte-9cqna5{margin-top:.5rem;font-style:italic;color:#333}.graph.svelte-9cqna5{flex:1}.legend.svelte-9cqna5{display:flex;gap:1rem;margin-bottom:1rem;font-size:.85em}.legend-item.svelte-9cqna5{display:flex;align-items:center;gap:.25rem}.round-row.svelte-9cqna5{margin-bottom:1.5rem;border:1px solid #eee;padding:.5rem;border-radius:4px}.nodes.svelte-9cqna5{display:flex;flex-wrap:wrap;gap:.5rem}.node.svelte-9cqna5{border:1px solid #ccc;padding:.5rem;border-radius:4px;min-width:120px}.node.answered.svelte-9cqna5{background:#e8f5e9}.node.current.svelte-9cqna5{border-color:#2196f3}.node-id.svelte-9cqna5{display:block;font-family:monospace;font-size:.85em;color:#555}.node-title.svelte-9cqna5{font-weight:700}.badge.svelte-9cqna5{font-size:.75em;padding:.1rem .3rem;border-radius:3px}.answered-badge.svelte-9cqna5{background:#4caf50;color:#fff}.node.svelte-9cqna5 input:where(.svelte-9cqna5){margin-top:.25rem;width:100%;box-sizing:border-box}.edges.svelte-9cqna5 ul:where(.svelte-9cqna5),.upcoming.svelte-9cqna5 ul:where(.svelte-9cqna5){list-style:none;padding:0}.edges.svelte-9cqna5 li:where(.svelte-9cqna5),.upcoming.svelte-9cqna5 li:where(.svelte-9cqna5){margin:.25rem 0;display:flex;align-items:center;gap:.25rem}.edge-type.svelte-9cqna5,.blocked-by.svelte-9cqna5{font-size:.85em;color:#666}.submit-section.svelte-9cqna5{margin-top:1rem}.submit-section.svelte-9cqna5 button:where(.svelte-9cqna5){padding:.5rem 1rem;font-size:1em;cursor:pointer}.error.svelte-9cqna5{color:red}</style>\n  </head>\n  <body>\n    <div id="app"></div>\n  </body>\n</html>\n';
const MAP_FILE = ".grilling.json";
function writeKey(cwd, key, dir) {
  const mapPath = join(cwd, MAP_FILE);
  let map = {};
  if (existsSync(mapPath)) {
    try {
      map = JSON.parse(readFileSync(mapPath, "utf-8"));
    } catch {
      throw new Error(`Corrupt ${MAP_FILE} in ${cwd}: failed to parse JSON`);
    }
  }
  map[key] = dir;
  writeFileSync(mapPath, JSON.stringify(map, null, 2), "utf-8");
}
function resolveKey(cwd, key) {
  const mapPath = join(cwd, MAP_FILE);
  if (!existsSync(mapPath)) {
    throw new Error(
      `No .grilling.json found in ${cwd} — no keys registered. Run 'start' first.`
    );
  }
  let map;
  try {
    map = JSON.parse(readFileSync(mapPath, "utf-8"));
  } catch {
    throw new Error(`Corrupt ${MAP_FILE} in ${cwd}: failed to parse JSON`);
  }
  if (!(key in map)) {
    throw new Error(
      `Unknown key "${key}" in ${MAP_FILE}. Available: ${Object.keys(map).join(", ")}`
    );
  }
  return map[key];
}
const PAGE_STATES = [
  "view",
  "in-round",
  "round-done",
  "final-review",
  "accepted",
  "rejected",
  "done"
];
const STATE_FILE = "state.json";
function validateState(state) {
  if (typeof state !== "object" || state === null) {
    throw new Error("Invalid state: expected an object");
  }
  const s = state;
  if (!PAGE_STATES.includes(s["page-state"])) {
    throw new Error(
      `Invalid state: page-state must be one of ${PAGE_STATES.join(", ")}, got: ${String(s["page-state"])}`
    );
  }
  if (!Array.isArray(s.questions)) {
    throw new Error("Invalid state: questions must be an array");
  }
  if (!Array.isArray(s.edges)) {
    throw new Error("Invalid state: edges must be an array");
  }
  if (typeof s.summary !== "string") {
    throw new Error("Invalid state: summary must be a string");
  }
  if (!Array.isArray(s.rounds)) {
    throw new Error("Invalid state: rounds must be an array");
  }
  if (s.answers !== void 0 && typeof s.answers !== "object") {
    throw new Error("Invalid state: answers must be an object or undefined");
  }
}
function createStateDir() {
  const dir = mkdtempSync(join(tmpdir(), "grilling-"));
  const initial = {
    "page-state": "view",
    questions: [],
    edges: [],
    summary: "",
    rounds: [],
    answers: {}
  };
  writeFileSync(join(dir, STATE_FILE), JSON.stringify(initial, null, 2), "utf-8");
  return dir;
}
function loadState(dir) {
  const raw = readFileSync(join(dir, STATE_FILE), "utf-8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Failed to parse state.json in ${dir}: corrupt or partial JSON`
    );
  }
  validateState(parsed);
  return parsed;
}
async function saveState(dir, state) {
  validateState(state);
  const data = JSON.stringify(state, null, 2);
  const targetPath = join(dir, STATE_FILE);
  const tempPath = join(dir, `.state.json.tmp.${randomBytes(8).toString("hex")}`);
  await writeFile(tempPath, data, "utf-8");
  await rename(tempPath, targetPath);
}
async function startServer(input) {
  const serverScript = join(input.stateDir, "server-runner.mjs");
  const runnerScript = buildRunnerScript(input.stateDir, input.html);
  writeFileSync(serverScript, runnerScript, "utf-8");
  const child = spawn(process.execPath, [serverScript], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env }
  });
  child.unref();
  const portFile = join(input.stateDir, "server.port");
  const pid = child.pid;
  writeFileSync(join(input.stateDir, "grilling.pid"), `${pid}
`, "utf-8");
  const port = await waitForPortFile(portFile, 5e3);
  const url = `http://127.0.0.1:${port}`;
  return { url, pid };
}
function buildRunnerScript(stateDir, html) {
  return `#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile, writeFile, rename } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const stateDir = ${JSON.stringify(stateDir)};
const html = ${JSON.stringify(html)};
const STATE_FILE = join(stateDir, "state.json");

async function loadState() {
  const raw = await readFile(STATE_FILE, "utf-8");
  return JSON.parse(raw);
}

async function saveState(state) {
  const data = JSON.stringify(state, null, 2);
  const tempPath = join(stateDir, ".state.json.tmp." + randomBytes(8).toString("hex"));
  await writeFile(tempPath, data, "utf-8");
  await rename(tempPath, STATE_FILE);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = req.url || "/";

  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (method === "GET" && url === "/state") {
    try {
      const state = await loadState();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(state));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (method === "POST" && url === "/submit") {
    try {
      const body = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
      const state = await loadState();
      const newAnswers = parsed.answers || {};
      const existingAnswers = state.answers || {};
      state.answers = { ...existingAnswers, ...newAnswers };
      for (const id of Object.keys(newAnswers)) {
        const q = state.questions.find((q) => q.id === id);
        if (q) q.answered = true;
      }
      if (parsed.feedback) {
        state.summary = parsed.feedback;
      }
      state["page-state"] = "round-done";
      await saveState(state);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, "page-state": "round-done" }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  const port = addr.port;
  // Write the port to a file so the parent can read it.
  writeFile(join(stateDir, "server.port"), String(port), "utf-8").catch(() => {});
});

// Handle SIGHUP (refresh signal): just touch a file to acknowledge.
process.on("SIGHUP", () => {
  writeFile(join(stateDir, "refresh.flag"), String(Date.now()), "utf-8").catch(() => {});
});
`;
}
function waitForPortFile(portFile, timeoutMs) {
  return new Promise((resolve, reject2) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (existsSync(portFile)) {
        const port = parseInt(readFileSync(portFile, "utf-8").trim(), 10);
        if (port > 0) {
          resolve(port);
          return;
        }
      }
      if (Date.now() > deadline) {
        reject2(new Error("Server failed to start: port file not written in time"));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}
function openBinaryForPlatform(platform) {
  switch (platform) {
    case "darwin":
      return "open";
    case "win32":
      return "start";
    case "linux":
      return "xdg-open";
    default:
      return "xdg-open";
  }
}
function openBrowser(url, platform = process.platform) {
  const binary = openBinaryForPlatform(platform);
  try {
    if (platform === "win32") {
      spawn("cmd", ["/c", binary, url], { detached: true, stdio: "ignore" });
    } else {
      spawn(binary, [url], { detached: true, stdio: "ignore" }).unref();
    }
    return true;
  } catch {
    return false;
  }
}
function isEvalMode$1() {
  return process.env.GRILLING_EVAL === "1";
}
async function start(input) {
  const stateDir = createStateDir();
  const key = randomBytes(8).toString("hex");
  writeKey(input.cwd, key, stateDir);
  const { url, pid } = await startServer({ stateDir, html: input.html });
  let opened = false;
  if (!input.noOpen && !isEvalMode$1()) {
    opened = openBrowser(url);
  }
  process.stdout.write(`${url}
opened: ${opened}
state: ${key}
`);
  return { stateDir, key, url, opened };
}
async function get(dir, subset) {
  const state = loadState(dir);
  const result = extractSubset(state, subset);
  return JSON.stringify(result, null, 2);
}
function extractSubset(state, subset) {
  if (!subset) {
    return state;
  }
  const s = subset;
  switch (s) {
    case "answers":
      return state.answers ?? {};
    case "summary":
      return { summary: state.summary };
    case "questions":
      return { questions: state.questions };
    case "edges":
      return { edges: state.edges };
    case "frontier":
      return { frontier: computeFrontier(state) };
    case "state":
      return { "page-state": state["page-state"] };
    default:
      throw new Error(
        `Invalid subset "${subset}". Valid subsets: state, questions, edges, answers, summary, frontier`
      );
  }
}
function computeFrontier(state) {
  const answeredIds = new Set(
    state.questions.filter((q) => q.answered).map((q) => q.id)
  );
  return state.questions.filter(
    (q) => !q.answered && q.deps.every((dep) => answeredIds.has(dep))
  );
}
async function refresh(dir) {
  if (!existsSync(join(dir, "state.json"))) {
    throw new Error(`Invalid state dir: no state.json found in ${dir}`);
  }
  loadState(dir);
  writeFileSync(join(dir, "refresh.flag"), String(Date.now()), "utf-8");
  const pidFile = join(dir, "grilling.pid");
  if (existsSync(pidFile)) {
    const pidStr = readFileSync(pidFile, "utf-8").trim();
    const pid = parseInt(pidStr, 10);
    if (pid > 0) {
      try {
        process.kill(pid, "SIGHUP");
      } catch {
      }
    }
  }
}
const POLL_INTERVAL_MS = 100;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1e3;
function isEvalMode() {
  return process.env.GRILLING_EVAL === "1";
}
async function wait(dir, target, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (isEvalMode()) {
    process.stdout.write(
      `[eval] wait returning immediately — hand back to the user (target was "${target}").
`
    );
    return 0;
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const state = loadState(dir);
      if (state["page-state"] === target) {
        return 0;
      }
    } catch {
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Timeout: waited ${timeoutMs}ms for page-state to reach "${target}" but it did not match.`
  );
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function finalize(dir, cwd, key) {
  const state = loadState(dir);
  if (state.questions.length === 0) {
    throw new Error("Cannot finalize: no questions resolved (empty grilling).");
  }
  const frontier = computeFrontier(state);
  if (frontier.length > 0) {
    const ids = frontier.map((q) => q.id).join(", ");
    throw new Error(
      `Cannot finalize: frontier is non-empty — ${frontier.length} unanswered question(s): ${ids}`
    );
  }
  const unanswered = state.questions.filter((q) => !q.answered);
  if (unanswered.length > 0) {
    const ids = unanswered.map((q) => q.id).join(", ");
    throw new Error(
      `Cannot finalize: ${unanswered.length} unanswered question(s): ${ids}`
    );
  }
  const unresolvedContras = state.edges.filter(
    (e) => e.type === "contra" && !e.resolved
  );
  if (unresolvedContras.length > 0) {
    const ids = unresolvedContras.map((e) => e.id).join(", ");
    throw new Error(
      `Cannot finalize: ${unresolvedContras.length} unresolved contradiction(s): ${ids}`
    );
  }
  const markdown = renderMarkdown(state);
  const slug = "grilling";
  const mdPath = join(cwd, `${slug}-grilling-summary.md`);
  await writeFile(mdPath, markdown, "utf-8");
  stopServer(dir, cwd, key);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
  }
  return { exitCode: 0, markdownPath: mdPath };
}
function stopServer(dir, cwd, key) {
  const pidFile = join(dir, "grilling.pid");
  if (existsSync(pidFile)) {
    const pidStr = readFileSync(pidFile, "utf-8").trim();
    const pid = parseInt(pidStr, 10);
    if (pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
      }
    }
  }
  if (key) {
    const mapPath = join(cwd, ".grilling.json");
    if (existsSync(mapPath)) {
      try {
        const map = JSON.parse(readFileSync(mapPath, "utf-8"));
        delete map[key];
        writeFileSync(mapPath, JSON.stringify(map, null, 2), "utf-8");
      } catch {
      }
    }
  }
}
function renderMarkdown(state) {
  const lines = [];
  lines.push("# Grilling Summary");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(state.summary || "(no summary provided)");
  lines.push("");
  const rounds = [...state.rounds].sort((a, b) => a.number - b.number);
  if (rounds.length === 0 && state.questions.length > 0) {
    lines.push("## Questions & Answers");
    lines.push("");
    for (const q of state.questions) {
      renderQuestion(lines, state, q);
    }
  } else {
    for (const round of rounds) {
      lines.push(`## Round ${round.number}`);
      lines.push("");
      const roundQuestions = state.questions.filter((q) => q.round === round.number).sort((a, b) => a.id.localeCompare(b.id));
      for (const q of roundQuestions) {
        renderQuestion(lines, state, q);
      }
    }
  }
  if (state.edges.length > 0) {
    lines.push("## Edges");
    lines.push("");
    for (const e of state.edges) {
      const status = e.type === "contra" && e.resolved ? " (resolved)" : "";
      lines.push(`- ${e.from} →${e.type}→ ${e.to}${status}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function renderQuestion(lines, state, q) {
  var _a;
  lines.push(`### ${q.title}`);
  lines.push("");
  lines.push(`- **ID:** ${q.id}`);
  lines.push(`- **Recommendation:** ${q.rec}`);
  if (q.deps.length > 0) {
    lines.push(`- **Dependencies:** ${q.deps.join(", ")}`);
  }
  lines.push("");
  lines.push(`**Body:** ${q.body}`);
  lines.push("");
  const answer2 = (_a = state.answers) == null ? void 0 : _a[q.id];
  lines.push(`**Answer:** ${answer2 ?? "(not answered)"}`);
  lines.push("");
}
const ALLOWED = /* @__PURE__ */ new Set([
  "view→in-round",
  "in-round→round-done",
  "round-done→in-round",
  "round-done→final-review",
  "final-review→accepted",
  "final-review→rejected",
  "accepted→done",
  "rejected→in-round"
]);
function canTransition(from, to) {
  return ALLOWED.has(`${from}→${to}`);
}
function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid transition: ${from} → ${to} is not allowed. Allowed transitions from ${from}: ` + getTransitionsFrom(from).join(", ")
    );
  }
}
function getTransitionsFrom(from) {
  return [...ALLOWED].filter((t) => t.startsWith(`${from}→`)).map((t) => t.split("→")[1]);
}
async function addQuestion(dir, input) {
  const state = loadState(dir);
  if (state.questions.some((q) => q.id === input.id)) {
    throw new Error(`Duplicate question id: "${input.id}" already exists`);
  }
  state.questions.push({
    id: input.id,
    title: input.title,
    body: input.body,
    rec: input.rec,
    round: input.round,
    deps: input.deps,
    answered: false
  });
  if (!state.rounds.some((r) => r.number === input.round)) {
    state.rounds.push({ number: input.round });
  }
  await saveState(dir, state);
}
async function addEdge(dir, input) {
  const state = loadState(dir);
  const knownIds = new Set(state.questions.map((q) => q.id));
  if (!knownIds.has(input.from)) {
    throw new Error(`Unknown node id: "${input.from}" does not match any question`);
  }
  if (!knownIds.has(input.to)) {
    throw new Error(`Unknown node id: "${input.to}" does not match any question`);
  }
  state.edges.push({
    id: input.id,
    from: input.from,
    to: input.to,
    type: input.type,
    resolved: false
  });
  await saveState(dir, state);
}
async function promote(dir, input) {
  const state = loadState(dir);
  const question = state.questions.find((q) => q.id === input.id);
  if (!question) {
    throw new Error(`Unknown question id: "${input.id}" not found`);
  }
  question.round = input.toRound;
  if (!state.rounds.some((r) => r.number === input.toRound)) {
    state.rounds.push({ number: input.toRound });
  }
  await saveState(dir, state);
}
async function setState(dir, target) {
  const state = loadState(dir);
  assertTransition(state["page-state"], target);
  state["page-state"] = target;
  await saveState(dir, state);
}
async function setSummary(dir, text) {
  const state = loadState(dir);
  state.summary = text;
  await saveState(dir, state);
}
async function resolveContradiction(dir, input) {
  const state = loadState(dir);
  const edge = state.edges.find((e) => e.id === input.edge);
  if (!edge) {
    throw new Error(`Unknown edge id: "${input.edge}" not found`);
  }
  edge.resolved = true;
  await saveState(dir, state);
}
async function answer(dir, input) {
  const state = loadState(dir);
  const question = state.questions.find((q) => q.id === input.id);
  if (!question) {
    throw new Error(`Unknown question id: "${input.id}" not found`);
  }
  question.answered = true;
  state.answers[input.id] = input.value;
  if (state["page-state"] === "in-round") {
    assertTransition(state["page-state"], "round-done");
    state["page-state"] = "round-done";
  }
  await saveState(dir, state);
}
async function setDeps(dir, input) {
  const state = loadState(dir);
  const question = state.questions.find((q) => q.id === input.id);
  if (!question) {
    throw new Error(`Unknown question id: "${input.id}" not found`);
  }
  const knownIds = new Set(state.questions.map((q) => q.id));
  for (const dep of input.deps) {
    if (dep && !knownIds.has(dep)) {
      throw new Error(`Unknown dep id: "${dep}" does not match any question`);
    }
  }
  question.deps = input.deps;
  await saveState(dir, state);
}
async function accept(dir) {
  const state = loadState(dir);
  assertTransition(state["page-state"], "accepted");
  state["page-state"] = "accepted";
  await saveState(dir, state);
}
async function reject(dir, input) {
  const state = loadState(dir);
  assertTransition(state["page-state"], "rejected");
  state["page-state"] = "rejected";
  assertTransition("rejected", "in-round");
  state["page-state"] = "in-round";
  const feedbackLine = `

[REJECTION FEEDBACK]: ${input.feedback}
`;
  state.summary = (state.summary || "") + feedbackLine;
  await saveState(dir, state);
}
const USAGE = `Usage: grilling-cli.mjs <subcommand> [flags]

Subcommands:
  start                              Start a grilling session
  update <sub>                       Mutate grilling state
  get [subset]                       Read grilling state
  refresh                            Signal the server to re-render
  wait <state>                       Block until page-state matches
  stop                               Stop the server + clean up the key entry
  finalize                           Check coast-clear, emit summary, stop, clean up

Update subcommands:
  add-question --id <5-word> --title --body --rec --round <n> --deps <ids>
  add-edge --from <id> --to <id> --type dep|contra|ref --id <id>
  promote --id <id> --to-round <n>
  set-state --state <one of 7>
  set-summary --text "running summary"
  resolve-contradiction --edge <id>
  answer --id <qid> --value <text>            (record a user's answer)
  set-deps --id <qid> --deps <ids>           (rewrite a question's deps)
  accept                                     (record final-review acceptance)
  reject --feedback <text>                   (record rejection, resume in-round)

Options:
  --help, -h                        Show this help message
  --state <key>                     State key (required for all subcommands except start)
  --timeout <ms>                     Timeout for wait (default: 30 min)
  --open                            Auto-open the browser (opt-in; default: no open)
  --no-open                         (deprecated, no-op) kept for back-compat

The inlined SPA HTML is embedded in this bundle (${spaHtml.length} bytes).
`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(USAGE);
    process.exit(args.length === 0 ? 1 : 0);
  }
  const subcommand = args[0];
  const rest = args.slice(1);
  try {
    switch (subcommand) {
      case "start":
        await cmdStart(rest);
        break;
      case "update":
        await cmdUpdate(rest);
        break;
      case "get":
        await cmdGet(rest);
        break;
      case "refresh":
        await cmdRefresh(rest);
        break;
      case "wait":
        await cmdWait(rest);
        break;
      case "finalize":
        await cmdFinalize(rest);
        break;
      case "stop":
        await cmdStop(rest);
        break;
      default:
        process.stderr.write(`Unknown subcommand: ${subcommand}
`);
        process.stderr.write(USAGE);
        process.exit(1);
    }
  } catch (e) {
    process.stderr.write(`${e.message}
`);
    process.exit(1);
  }
  process.exit(0);
}
async function cmdStart(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      "open": { type: "boolean", default: false },
      "no-open": { type: "boolean", default: false }
    },
    allowPositionals: true
  });
  const noOpen = values["open"] !== true;
  await start({
    cwd: process.cwd(),
    noOpen,
    html: spaHtml
  });
}
async function cmdUpdate(rest) {
  const sub = rest[0];
  if (!sub) {
    throw new Error("Missing update subcommand. See --help for usage.");
  }
  const subArgs = rest.slice(1);
  switch (sub) {
    case "add-question":
      await cmdAddQuestion(subArgs);
      break;
    case "add-edge":
      await cmdAddEdge(subArgs);
      break;
    case "promote":
      await cmdPromote(subArgs);
      break;
    case "set-state":
      await cmdSetState(subArgs);
      break;
    case "set-summary":
      await cmdSetSummary(subArgs);
      break;
    case "resolve-contradiction":
      await cmdResolveContradiction(subArgs);
      break;
    case "answer":
      await cmdAnswer(subArgs);
      break;
    case "set-deps":
      await cmdSetDeps(subArgs);
      break;
    case "accept":
      await cmdAccept(subArgs);
      break;
    case "reject":
      await cmdReject(subArgs);
      break;
    default:
      throw new Error(`Unknown update subcommand: ${sub}. See --help.`);
  }
}
async function cmdAddQuestion(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
      rec: { type: "string" },
      round: { type: "string" },
      deps: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  const deps = values.deps ? values.deps.split(",").map((d) => d.trim()).filter(Boolean) : [];
  await addQuestion(dir, {
    id: values.id,
    title: values.title ?? "",
    body: values.body ?? "",
    rec: values.rec ?? "",
    round: parseInt(values.round ?? "1", 10),
    deps
  });
}
async function cmdAddEdge(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      type: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await addEdge(dir, {
    id: values.id,
    from: values.from,
    to: values.to,
    type: values.type
  });
}
async function cmdPromote(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      "to-round": { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await promote(dir, {
    id: values.id,
    toRound: parseInt(values["to-round"], 10)
  });
}
async function cmdSetState(rest) {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  const target = positionals[0];
  if (!target) {
    throw new Error("Missing target state. Usage: update set-state --state <key> <target-state>");
  }
  await setState(dir, target);
}
async function cmdSetSummary(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      text: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await setSummary(dir, values.text ?? "");
}
async function cmdResolveContradiction(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      edge: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await resolveContradiction(dir, { edge: values.edge });
}
async function cmdGet(rest) {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  const subset = positionals[0];
  const output = await get(dir, subset);
  process.stdout.write(output + "\n");
}
async function cmdRefresh(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await refresh(dir);
}
async function cmdWait(rest) {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      timeout: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  const target = positionals[0];
  if (!target) {
    throw new Error("Missing target state. Usage: wait <state> --state <key>");
  }
  const timeoutMs = values.timeout ? parseInt(values.timeout, 10) : void 0;
  await wait(dir, target, timeoutMs);
}
async function cmdFinalize(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" }
    },
    allowPositionals: true
  });
  const key = values.state;
  const dir = resolveKey(process.cwd(), key);
  const result = await finalize(dir, process.cwd(), key);
  process.stdout.write(`Finalized: ${result.markdownPath}
`);
}
async function cmdStop(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" }
    },
    allowPositionals: true
  });
  const key = values.state;
  const dir = resolveKey(process.cwd(), key);
  stopServer(dir, process.cwd(), key);
  process.stdout.write("Stopped.\n");
}
async function cmdAnswer(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      value: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await answer(dir, { id: values.id, value: values.value ?? "" });
}
async function cmdSetDeps(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      deps: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  const deps = values.deps ? values.deps.split(",").map((d) => d.trim()).filter(Boolean) : [];
  await setDeps(dir, { id: values.id, deps });
}
async function cmdAccept(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await accept(dir);
}
async function cmdReject(rest) {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      feedback: { type: "string" }
    },
    allowPositionals: true
  });
  const dir = resolveKey(process.cwd(), values.state);
  await reject(dir, { feedback: values.feedback ?? "" });
}
main().catch((e) => {
  process.stderr.write(`${e.message}
`);
  process.exit(1);
});
