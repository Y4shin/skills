import { parseArgs } from "node:util";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { writeFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import "node:http";
import { spawn } from "node:child_process";
const spaHtml = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Grilling Visualizer</title>\n    <script type="module" crossorigin>var vs=Object.defineProperty;var Vr=e=>{throw TypeError(e)};var hs=(e,t,n)=>t in e?vs(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var de=(e,t,n)=>hs(e,typeof t!="symbol"?t+"":t,n),ar=(e,t,n)=>t.has(e)||Vr("Cannot "+n);var o=(e,t,n)=>(ar(e,t,"read from private field"),n?n.call(e):t.get(e)),k=(e,t,n)=>t.has(e)?Vr("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,n),b=(e,t,n,r)=>(ar(e,t,"write to private field"),r?r.call(e,n):t.set(e,n),n),T=(e,t,n)=>(ar(e,t,"access private method"),n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll(\'link[rel="modulepreload"]\'))r(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&r(l)}).observe(document,{childList:!0,subtree:!0});function n(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(i){if(i.ep)return;i.ep=!0;const s=n(i);fetch(i.href,s)}})();const vi=!0;var hi=Array.isArray,_s=Array.prototype.indexOf,pn=Array.prototype.includes,er=Array.from,ft=Object.defineProperty,Pt=Object.getOwnPropertyDescriptor,ps=Object.getOwnPropertyDescriptors,gs=Object.prototype,ms=Array.prototype,_i=Object.getPrototypeOf,Yr=Object.isExtensible;const ws=()=>{};function ys(e){return e()}function gr(e){for(var t=0;t<e.length;t++)e[t]()}function pi(){var e,t,n=new Promise((r,i)=>{e=r,t=i});return{promise:n,resolve:e,reject:t}}const K=2,gn=4,Tn=8,gi=1<<24,Pe=16,xe=32,Xe=64,mr=128,Ee=512,D=1024,L=2048,ke=4096,le=8192,Se=16384,Gt=32768,Kr=1<<25,Vt=65536,mn=1<<17,bs=1<<18,Zt=1<<19,mi=1<<20,He=1<<25,xt=65536,wn=1<<21,yt=1<<22,ot=1<<23,bt=Symbol("$state"),wi=Symbol("proxy path"),Es=Symbol("attributes"),wr=Symbol("class"),yr=Symbol("style"),ln=Symbol("text"),Hn=Symbol("form reset"),ks=Symbol("hmr anchor"),An=new class extends Error{constructor(){super(...arguments);de(this,"name","StaleReactionError");de(this,"message","The reaction that called `getAbortSignal()` was re-run or destroyed")}},Ss=1,xs=11;function Ts(e){{const t=new Error(`invariant_violation\nAn invariant violation occurred, meaning Svelte\'s internal assumptions were flawed. This is a bug in Svelte, not your app — please open an issue at https://github.com/sveltejs/svelte, citing the following message: "${e}"\nhttps://svelte.dev/e/invariant_violation`);throw t.name="Svelte error",t}}function yi(e){{const t=new Error(`lifecycle_outside_component\n\\`${e}(...)\\` can only be used during component initialisation\nhttps://svelte.dev/e/lifecycle_outside_component`);throw t.name="Svelte error",t}}function As(){{const e=new Error("async_derived_orphan\\nCannot create a `$derived(...)` with an `await` expression outside of an effect tree\\nhttps://svelte.dev/e/async_derived_orphan");throw e.name="Svelte error",e}}function Wr(){{const e=new Error("bind_invalid_checkbox_value\\nUsing `bind:value` together with a checkbox input is not allowed. Use `bind:checked` instead\\nhttps://svelte.dev/e/bind_invalid_checkbox_value");throw e.name="Svelte error",e}}function $s(e,t){{const n=new Error(`component_api_changed\nCalling \\`${e}\\` on a component instance (of ${t}) is no longer valid in Svelte 5\nhttps://svelte.dev/e/component_api_changed`);throw n.name="Svelte error",n}}function Os(e,t){{const n=new Error(`component_api_invalid_new\nAttempted to instantiate ${e} with \\`new ${t}\\`, which is no longer valid in Svelte 5. If this component is not under your control, set the \\`compatibility.componentApi\\` compiler option to \\`4\\` to keep it working.\nhttps://svelte.dev/e/component_api_invalid_new`);throw n.name="Svelte error",n}}function Ms(){{const e=new Error(`derived_references_self\nA derived value cannot reference itself recursively\nhttps://svelte.dev/e/derived_references_self`);throw e.name="Svelte error",e}}function Cs(e,t,n){{const r=new Error(`each_key_duplicate\n${n?`Keyed each block has duplicate key \\`${n}\\` at indexes ${e} and ${t}`:`Keyed each block has duplicate key at indexes ${e} and ${t}`}\nhttps://svelte.dev/e/each_key_duplicate`);throw r.name="Svelte error",r}}function Rs(e,t,n){{const r=new Error(`each_key_volatile\nKeyed each block has key that is not idempotent — the key for item at index ${e} was \\`${t}\\` but is now \\`${n}\\`. Keys must be the same each time for a given item\nhttps://svelte.dev/e/each_key_volatile`);throw r.name="Svelte error",r}}function qs(e){{const t=new Error(`effect_in_teardown\n\\`${e}\\` cannot be used inside an effect cleanup function\nhttps://svelte.dev/e/effect_in_teardown`);throw t.name="Svelte error",t}}function Ns(){{const e=new Error("effect_in_unowned_derived\\nEffect cannot be created inside a `$derived` value that was not itself created inside an effect\\nhttps://svelte.dev/e/effect_in_unowned_derived");throw e.name="Svelte error",e}}function Is(e){{const t=new Error(`effect_orphan\n\\`${e}\\` can only be used inside an effect (e.g. during component initialisation)\nhttps://svelte.dev/e/effect_orphan`);throw t.name="Svelte error",t}}function Ps(){{const e=new Error(`effect_update_depth_exceeded\nMaximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state\nhttps://svelte.dev/e/effect_update_depth_exceeded`);throw e.name="Svelte error",e}}function Ds(e){{const t=new Error(`rune_outside_svelte\nThe \\`${e}\\` rune is only available inside \\`.svelte\\` and \\`.svelte.js/ts\\` files\nhttps://svelte.dev/e/rune_outside_svelte`);throw t.name="Svelte error",t}}function Ls(){{const e=new Error("state_descriptors_fixed\\nProperty descriptors defined on `$state` objects must contain `value` and always be `enumerable`, `configurable` and `writable`.\\nhttps://svelte.dev/e/state_descriptors_fixed");throw e.name="Svelte error",e}}function Fs(){{const e=new Error("state_prototype_fixed\\nCannot set prototype of `$state` object\\nhttps://svelte.dev/e/state_prototype_fixed");throw e.name="Svelte error",e}}function js(){{const e=new Error("state_unsafe_mutation\\nUpdating state inside `$derived(...)`, `$inspect(...)` or a template expression is forbidden. If the value should not be reactive, declare it without `$state`\\nhttps://svelte.dev/e/state_unsafe_mutation");throw e.name="Svelte error",e}}function Hs(){{const e=new Error("svelte_boundary_reset_onerror\\nA `<svelte:boundary>` `reset` function cannot be called while an error is still being handled\\nhttps://svelte.dev/e/svelte_boundary_reset_onerror");throw e.name="Svelte error",e}}const Bs=1,zs=2,bi=4,Us=8,Vs=16,Ys=1,Ks=2,z=Symbol("uninitialized"),F=Symbol("filename");var tr="font-weight: bold",nr="font-weight: normal";function Ws(e){console.warn(`%c[svelte] await_reactivity_loss\n%cDetected reactivity loss when reading \\`${e}\\`. This happens when state is read in an async function after an earlier \\`await\\`\nhttps://svelte.dev/e/await_reactivity_loss`,tr,nr)}function Gs(){console.warn(`%c[svelte] derived_inert\n%cReading a derived belonging to a now-destroyed effect may result in stale values\nhttps://svelte.dev/e/derived_inert`,tr,nr)}function Bn(e){console.warn(`%c[svelte] state_proxy_equality_mismatch\n%cReactive \\`$state(...)\\` proxies and the values they proxy have different identities. Because of this, comparisons with \\`${e}\\` will produce unexpected results\nhttps://svelte.dev/e/state_proxy_equality_mismatch`,tr,nr)}function Zs(){console.warn("%c[svelte] svelte_boundary_reset_noop\\n%cA `<svelte:boundary>` `reset` function only resets the boundary the first time it is called\\nhttps://svelte.dev/e/svelte_boundary_reset_noop",tr,nr)}function Ei(e){return e===this.v}function Js(e,t){return e!=e?t==t:e!==t||e!==null&&typeof e=="object"||typeof e=="function"}function ki(e){return!Js(e,this.v)}let $n=!1,Xs=!1;function Qs(){$n=!0}function G(e,t){return e.label=t,Si(e.v,t),e}function Si(e,t){var n;return(n=e==null?void 0:e[wi])==null||n.call(e,t),e}function xi(e){const t=new Error,n=el();return n.length===0?null:(n.unshift(`\n`),ft(t,"stack",{value:n.join(`\n`)}),ft(t,"name",{value:e}),t)}function el(){const e=Error.stackTraceLimit;Error.stackTraceLimit=1/0;const t=new Error().stack;if(Error.stackTraceLimit=e,!t)return[];const n=t.split(`\n`),r=[];for(let i=0;i<n.length;i++){const s=n[i],l=s.replaceAll("\\\\","/");if(s.trim()!=="Error"){if(s.includes("validate_each_keys"))return[];l.includes("svelte/src/internal")||l.includes("node_modules/.vite")||r.push(s)}}return r}function tl(e,t){e||Ts(t)}let A=null;function Yt(e){A=e}let Je=null;function Kn(e){Je=e}function _e(e,t,n,r,i,s){const l=Je;Je={type:t,file:n[F],line:r,column:i,parent:l,...s};try{return e()}finally{Je=l}}let On=null;function Gr(e){On=e}function Ti(e,t=!1,n){A={p:A,i:!1,c:null,e:null,s:e,x:null,r:S,l:$n&&!t?{s:null,u:null,$:[]}:null},A.function=n,On=n}function Ai(e){var t=A,n=t.e;if(n!==null){t.e=null;for(var r of n)Gi(r)}return e!==void 0&&(t.x=e),t.i=!0,A=t.p,On=(A==null?void 0:A.function)??null,e??{}}function Mn(){return!$n||A!==null&&A.l===null}let ht=[];function $i(){var e=ht;ht=[],gr(e)}function Ze(e){if(ht.length===0&&!vn){var t=ht;queueMicrotask(()=>{t===ht&&$i()})}ht.push(e)}function nl(){for(;ht.length>0;)$i()}const br=new WeakMap;function Oi(e){var t=S;if(t===null)return x.f|=ot,e;if(e instanceof Error&&!br.has(e)&&br.set(e,rl(e,t)),!(t.f&Gt)&&!(t.f&gn))throw!t.parent&&e instanceof Error&&Mi(e),e;at(e,t)}function at(e,t){if(!(t!==null&&t.f&Se)){for(;t!==null;){if(t.f&mr){if(!(t.f&Gt))throw e;try{t.b.error(e);return}catch(n){e=n}}t=t.parent}throw e instanceof Error&&Mi(e),e}}function rl(e,t){var l,a,u;const n=Pt(e,"message");if(!(n&&!n.configurable)){for(var r=jr?"  ":"	",i=`\n${r}in ${((l=t.fn)==null?void 0:l.name)||"<unknown>"}`,s=t.ctx;s!==null;)i+=`\n${r}in ${(a=s.function)==null?void 0:a[F].split("/").pop()}`,s=s.p;return{message:e.message+`\n${i}\n`,stack:(u=e.stack)==null?void 0:u.split(`\n`).filter(_=>!_.includes("svelte/src/internal")).join(`\n`)}}}function Mi(e){const t=br.get(e);t&&(ft(e,"message",{value:t.message}),ft(e,"stack",{value:t.stack}))}const il=-7169;function I(e,t){e.f=e.f&il|t}function Nr(e){e.f&Ee||e.deps===null?I(e,D):I(e,ke)}function Ci(e){if(e!==null)for(const t of e)!(t.f&K)||!(t.f&xt)||(t.f^=xt,Ci(t.deps))}function Ri(e,t,n){e.f&L?t.add(e):e.f&ke&&n.add(e),Ci(e.deps),I(e,D)}let Zr=!1;function sl(){Zr||(Zr=!0,document.addEventListener("reset",e=>{Promise.resolve().then(()=>{var t;if(!e.defaultPrevented)for(const n of e.target.elements)(t=n[Hn])==null||t.call(n)})},{capture:!0}))}function Jt(e){var t=x,n=S;Te(null),Ae(null);try{return e()}finally{Te(t),Ae(n)}}function ll(e,t,n,r=n){e.addEventListener(t,()=>Jt(n));const i=e[Hn];i?e[Hn]=()=>{i(),r(!0)}:e[Hn]=()=>r(!0),sl()}function al(e){let t=0,n=At(0),r;return G(n,"createSubscriber version"),()=>{Hr()&&(h(n),rr(()=>(t===0&&(r=C(()=>e(()=>hn(n)))),t+=1,()=>{Ze(()=>{t-=1,t===0&&(r==null||r(),r=void 0,hn(n))})})))}}var ol=Vt|Zt;function fl(e,t,n,r){new ul(e,t,n,r)}var ge,qr,me,pt,ue,we,re,ve,Ke,gt,it,Lt,bn,En,Le,Jn,R,cl,dl,Er,vl,kr,zn,Un,Sr,xr;class ul{constructor(t,n,r,i){k(this,R);de(this,"parent");de(this,"is_pending",!1);de(this,"transform_error");k(this,ge);k(this,qr,null);k(this,me);k(this,pt);k(this,ue);k(this,we,null);k(this,re,null);k(this,ve,null);k(this,Ke,null);k(this,gt,0);k(this,it,0);k(this,Lt,!1);k(this,bn,new Set);k(this,En,new Set);k(this,Le,null);k(this,Jn,al(()=>(b(this,Le,At(o(this,gt))),G(o(this,Le),"$effect.pending()"),()=>{b(this,Le,null)})));var s;b(this,ge,t),b(this,me,n),b(this,pt,l=>{var a=S;a.b=this,a.f|=mr,r(l)}),this.parent=S.b,this.transform_error=i??((s=this.parent)==null?void 0:s.transform_error)??(l=>l),b(this,ue,Br(()=>{T(this,R,kr).call(this)},ol))}defer_effect(t){Ri(t,o(this,bn),o(this,En))}is_rendered(){return!this.is_pending&&(!this.parent||this.parent.is_rendered())}has_pending_snippet(){return!!o(this,me).pending}update_pending_count(t,n){T(this,R,Sr).call(this,t,n),b(this,gt,o(this,gt)+t),!(!o(this,Le)||o(this,Lt))&&(b(this,Lt,!0),Ze(()=>{b(this,Lt,!1),o(this,Le)&&Wt(o(this,Le),o(this,gt))}))}get_effect_pending(){return o(this,Jn).call(this),h(o(this,Le))}error(t){if(!o(this,me).onerror&&!o(this,me).failed)throw t;w!=null&&w.is_fork?(o(this,we)&&w.skip_effect(o(this,we)),o(this,re)&&w.skip_effect(o(this,re)),o(this,ve)&&w.skip_effect(o(this,ve)),w.oncommit(()=>{T(this,R,xr).call(this,t)})):T(this,R,xr).call(this,t)}}ge=new WeakMap,qr=new WeakMap,me=new WeakMap,pt=new WeakMap,ue=new WeakMap,we=new WeakMap,re=new WeakMap,ve=new WeakMap,Ke=new WeakMap,gt=new WeakMap,it=new WeakMap,Lt=new WeakMap,bn=new WeakMap,En=new WeakMap,Le=new WeakMap,Jn=new WeakMap,R=new WeakSet,cl=function(){try{b(this,we,ye(()=>o(this,pt).call(this,o(this,ge))))}catch(t){this.error(t)}},dl=function(t){const n=o(this,me).failed,{reset:r,invoke_onerror:i}=T(this,R,Er).call(this,t);Ze(i),n&&b(this,ve,ye(()=>{n(o(this,ge),()=>t,()=>r)}))},Er=function(t){var n=!1,r=!1;const i=()=>{if(n){Zs();return}n=!0,r&&Hs(),o(this,ve)!==null&&kt(o(this,ve),()=>{b(this,ve,null)}),T(this,R,Un).call(this,()=>{T(this,R,kr).call(this)})};return{reset:i,invoke_onerror:()=>{var l,a;try{r=!0,(a=(l=o(this,me)).onerror)==null||a.call(l,t,i),r=!1}catch(u){at(u,o(this,ue)&&o(this,ue).parent)}}}},vl=function(){const t=o(this,me).pending;t&&(this.is_pending=!0,b(this,re,ye(()=>t(o(this,ge)))),Ze(()=>{var n=b(this,Ke,document.createDocumentFragment()),r=Et();n.append(r),b(this,we,T(this,R,Un).call(this,()=>ye(()=>o(this,pt).call(this,r)))),o(this,it)===0&&(o(this,ge).before(n),b(this,Ke,null),kt(o(this,re),()=>{b(this,re,null)}),T(this,R,zn).call(this,w))}))},kr=function(){try{if(this.is_pending=this.has_pending_snippet(),b(this,it,0),b(this,gt,0),b(this,we,ye(()=>{o(this,pt).call(this,o(this,ge))})),o(this,it)>0){var t=b(this,Ke,document.createDocumentFragment());Ur(o(this,we),t);const n=o(this,me).pending;b(this,re,ye(()=>n(o(this,ge))))}else T(this,R,zn).call(this,w)}catch(n){this.error(n)}},zn=function(t){this.is_pending=!1,t.transfer_effects(o(this,bn),o(this,En))},Un=function(t){var n=S,r=x,i=A;Ae(o(this,ue)),Te(o(this,ue)),Yt(o(this,ue).ctx);try{return Tt.ensure(),t()}catch(s){return Oi(s),null}finally{Ae(n),Te(r),Yt(i)}},Sr=function(t,n){var r;if(!this.has_pending_snippet()){this.parent&&T(r=this.parent,R,Sr).call(r,t,n);return}b(this,it,o(this,it)+t),o(this,it)===0&&(T(this,R,zn).call(this,n),o(this,re)&&kt(o(this,re),()=>{b(this,re,null)}),o(this,Ke)&&(o(this,ge).before(o(this,Ke)),b(this,Ke,null)))},xr=function(t){o(this,we)&&(ce(o(this,we)),b(this,we,null)),o(this,re)&&(ce(o(this,re)),b(this,re,null)),o(this,ve)&&(ce(o(this,ve)),b(this,ve,null));let n=o(this,me).failed;const r=i=>{const{reset:s,invoke_onerror:l}=T(this,R,Er).call(this,i);l(),n&&b(this,ve,T(this,R,Un).call(this,()=>{try{return ye(()=>{var a=S;a.b=this,a.f|=mr,n(o(this,ge),()=>i,()=>s)})}catch(a){return at(a,o(this,ue).parent),null}}))};Ze(()=>{var i;try{i=this.transform_error(t)}catch(s){at(s,o(this,ue)&&o(this,ue).parent);return}i!==null&&typeof i=="object"&&typeof i.then=="function"?i.then(r,s=>at(s,o(this,ue)&&o(this,ue).parent)):r(i)})};function hl(e,t,n,r){const i=Mn()?Ir:Ni;var s=e.filter(c=>!c.settled),l=t.map(i);if(l.forEach((c,p)=>{c.label=t[p].toString().replace("() => ","").replaceAll("$.eager(() => ","$state.eager(").replace(/\\$\\.get\\((.+?)\\)/g,(m,g)=>g)}),n.length===0&&s.length===0){r(l);return}var a=S,u=_l(),_=s.length===1?s[0].promise:s.length>1?Promise.all(s.map(c=>c.promise)):null;function d(c){if(!(a.f&Se)){u();try{r([...l,...c])}catch(p){at(p,a)}Wn()}}var v=qi();if(n.length===0){_.then(()=>d([])).finally(v);return}function f(){Promise.all(n.map(c=>gl(c))).then(d).catch(c=>at(c,a)).finally(v)}_?_.then(()=>{u(),f(),Wn()}):f()}function _l(){var e=S,t=x,n=A,r=w,i=Je;return function(l=!0){Ae(e),Te(t),Yt(n),l&&!(e.f&Se)&&(r==null||r.activate(),r==null||r.apply()),dn(null),Kn(i)}}async function Pn(e){var t=se;queueMicrotask(()=>{se===t&&dn(null)});var n=await e;return()=>(dn(t),queueMicrotask(()=>{se===t&&dn(null)}),n)}function Wn(e=!0){Ae(null),Te(null),Yt(null),e&&(w==null||w.deactivate()),dn(null),Kn(null)}function qi(){var e=S,t=e.b,n=w,r=!!(t!=null&&t.is_rendered());return t==null||t.update_pending_count(1,n),n.increment(r,e),()=>{t==null||t.update_pending_count(-1,n),n.decrement(r,e)}}let se=null;function dn(e){se=e}const pl=new Set;function Ir(e){var t=K|L;return S!==null&&(S.f|=Zt),{ctx:A,deps:null,effects:null,equals:Ei,f:t,fn:e,reactions:null,rv:0,v:z,wv:0,parent:S,ac:null}}const an=Symbol("obsolete");function gl(e,t,n){let r=S;r===null&&As();var i=void 0,s=At(z);s.label=e.toString();var l=!x,a=new Set;return Dl(()=>{var c,p;var u=S;se={effect:u,effect_deps:new Set,warned:!1};var _=pi();i=_.promise;try{Promise.resolve(e()).then(_.resolve,m=>{m!==An&&_.reject(m)}).finally(Wn)}catch(m){_.reject(m),Wn()}{if(se){if(u.deps!==null)for(let m=0;m<fe;m+=1)se.effect_deps.add(u.deps[m]);if(Z!==null)for(let m=0;m<Z.length;m+=1)se.effect_deps.add(Z[m])}se=null}var d=w;if(l){if(u.f&Gt)var v=qi();if((c=r.b)!=null&&c.is_rendered())(p=d.async_deriveds.get(u))==null||p.reject(an);else for(const m of a.values())m.reject(an);a.add(_),d.async_deriveds.set(u,_)}const f=(m,g=void 0)=>{se=null,v==null||v(),a.delete(_),g!==an&&(d.activate(),g?(s.f|=ot,Wt(s,g)):(s.f&ot&&(s.f^=ot),Wt(s,m)),d.deactivate())};_.promise.then(f,m=>f(null,m||"unknown"))}),Wi(()=>{for(const u of a)u.reject(an)}),s.f|=yt,new Promise(u=>{function _(d){function v(){d===i?u(s):_(i)}d.then(v,v)}_(i)})}function Ni(e){const t=Ir(e);return t.equals=ki,t}function ml(e){var t=e.effects;if(t!==null){e.effects=null;for(var n=0;n<t.length;n+=1)ce(t[n])}}let or=[];function Pr(e){var t,n=S,r=e.parent;if(!ut&&r!==null&&e.v!==z&&r.f&(Se|le))return Gs(),e.v;Ae(r);{let i=Kt;Qr(new Set);try{pn.call(or,e)&&Ms(),or.push(e),e.f&=~xt,ml(e),t=rs(e)}finally{Ae(n),Qr(i),or.pop()}}return t}function Ii(e){var t=Pr(e);if(!e.equals(t)&&(e.wv=ts(),(!(w!=null&&w.is_fork)||e.deps===null)&&(w!==null?(w.capture(e,t,!0),Dt==null||Dt.capture(e,t,!0)):e.v=t,e.deps===null))){I(e,D);return}ut||(J!==null?(Hr()||w!=null&&w.is_fork)&&J.set(e,t):Nr(e))}function wl(e){var t;if(e.effects!==null)for(const n of e.effects)(n.teardown||n.ac)&&((t=n.teardown)==null||t.call(n),n.ac!==null&&Jt(()=>{n.ac.abort(An),n.ac=null}),n.fn!==null&&(n.teardown=ws),yn(n,0),zr(n))}function Pi(e){if(e.effects!==null)for(const t of e.effects)t.teardown&&t.fn!==null&&$t(t)}let fr=null,qt=null,w=null,Dt=null,J=null,Tr=null,vn=!1,ur=!1,It=null,Vn=null;var Jr=0,cr=new Set;let yl=1;var Ft,st,mt,jt,Ht,Bt,We,zt,ie,kn,Ge,Ne,Fe,Ut,lt,O,Ar,on,$r,Di,Li,Nt,bl,fn;const Xn=class Xn{constructor(){k(this,O);de(this,"id",yl++);k(this,Ft,!1);de(this,"linked",!0);k(this,st,null);k(this,mt,null);de(this,"async_deriveds",new Map);de(this,"current",new Map);de(this,"previous",new Map);k(this,jt,new Set);k(this,Ht,new Set);k(this,Bt,0);k(this,We,new Map);k(this,zt,null);k(this,ie,[]);k(this,kn,[]);k(this,Ge,new Set);k(this,Ne,new Set);k(this,Fe,new Map);k(this,Ut,new Set);de(this,"is_fork",!1);k(this,lt,!1);qt===null?fr=qt=this:(b(qt,mt,this),b(this,st,qt)),qt=this}skip_effect(t){o(this,Fe).has(t)||o(this,Fe).set(t,{d:[],m:[]}),o(this,Ut).delete(t)}unskip_effect(t,n=r=>this.schedule(r)){var r=o(this,Fe).get(t);if(r){o(this,Fe).delete(t);for(var i of r.d)I(i,L),n(i);for(i of r.m)I(i,ke),n(i)}o(this,Ut).add(t)}capture(t,n,r=!1){t.v!==z&&!this.previous.has(t)&&this.previous.set(t,t.v),t.f&ot||(this.current.set(t,[n,r]),J==null||J.set(t,n)),this.is_fork||(t.v=n)}activate(){w=this}deactivate(){w=null,J=null}flush(){try{vi&&cr.clear(),ur=!0,w=this,T(this,O,on).call(this)}finally{Jr=0,Tr=null,It=null,Vn=null,ur=!1,w=null,J=null,Be.clear();for(const t of cr)t.updated=null}}discard(){var t;for(const n of o(this,Ht))n(this);o(this,Ht).clear();for(const n of this.async_deriveds.values())n.reject(an);T(this,O,fn).call(this),(t=o(this,zt))==null||t.resolve()}register_created_effect(t){o(this,kn).push(t)}increment(t,n){if(b(this,Bt,o(this,Bt)+1),t){let r=o(this,We).get(n)??0;o(this,We).set(n,r+1)}}decrement(t,n){if(b(this,Bt,o(this,Bt)-1),t){let r=o(this,We).get(n)??0;r===1?o(this,We).delete(n):o(this,We).set(n,r-1)}o(this,lt)||(b(this,lt,!0),Ze(()=>{b(this,lt,!1),this.linked&&this.flush()}))}transfer_effects(t,n){for(const r of t)o(this,Ge).add(r);for(const r of n)o(this,Ne).add(r);t.clear(),n.clear()}oncommit(t){o(this,jt).add(t)}ondiscard(t){o(this,Ht).add(t)}settled(){return(o(this,zt)??b(this,zt,pi())).promise}static ensure(){if(w===null){const t=w=new Xn;!ur&&!vn&&Ze(()=>{o(t,Ft)||t.flush()})}return w}apply(){{J=null;return}}schedule(t){var i;if(Tr=t,(i=t.b)!=null&&i.is_pending&&t.f&(gn|Tn|gi)&&!(t.f&Gt)){t.b.defer_effect(t);return}for(var n=t;n.parent!==null;){n=n.parent;var r=n.f;if(It!==null&&n===S&&(x===null||!(x.f&K)))return;if(r&(Xe|xe)){if(!(r&D))return;n.f^=D}}o(this,ie).push(n)}};Ft=new WeakMap,st=new WeakMap,mt=new WeakMap,jt=new WeakMap,Ht=new WeakMap,Bt=new WeakMap,We=new WeakMap,zt=new WeakMap,ie=new WeakMap,kn=new WeakMap,Ge=new WeakMap,Ne=new WeakMap,Fe=new WeakMap,Ut=new WeakMap,lt=new WeakMap,O=new WeakSet,Ar=function(){if(this.is_fork)return!0;for(const r of o(this,We).keys()){for(var t=r,n=!1;t.parent!==null;){if(o(this,Fe).has(t)){n=!0;break}t=t.parent}if(!n)return!0}return!1},on=function(){var u,_,d,v;b(this,Ft,!0),Jr++>1e3&&(T(this,O,fn).call(this),kl());for(const f of this.current.keys())cr.add(f);for(const f of o(this,Ge))o(this,Ne).delete(f),I(f,L),this.schedule(f);for(const f of o(this,Ne))I(f,ke),this.schedule(f);const t=o(this,ie);b(this,ie,[]),this.apply();var n=It=[],r=[],i=Vn=[];for(const f of t)try{T(this,O,$r).call(this,f,n,r)}catch(c){throw Hi(f),T(this,O,Ar).call(this)||this.discard(),c}if(w=null,i.length>0){var s=Xn.ensure();for(const f of i)s.schedule(f)}if(It=null,Vn=null,T(this,O,Ar).call(this)){T(this,O,Nt).call(this,r),T(this,O,Nt).call(this,n);for(const[f,c]of o(this,Fe))ji(f,c);i.length>0&&T(u=w,O,on).call(u);return}const l=T(this,O,Di).call(this);if(l){T(this,O,Nt).call(this,r),T(this,O,Nt).call(this,n),T(_=l,O,Li).call(_,this);return}o(this,Ge).clear(),o(this,Ne).clear();for(const f of o(this,jt))f(this);o(this,jt).clear(),Dt=this,Xr(r),Xr(n),Dt=null,(d=o(this,zt))==null||d.resolve();var a=w;if(o(this,Bt)===0&&(o(this,ie).length===0||a!==null)&&T(this,O,fn).call(this),o(this,ie).length>0)if(a!==null){const f=a;o(f,ie).push(...o(this,ie).filter(c=>!o(f,ie).includes(c)))}else a=this;a!==null&&(Be.clear(),T(v=a,O,on).call(v))},$r=function(t,n,r){t.f^=D;for(var i=t.first;i!==null;){var s=i.f,l=(s&(xe|Xe))!==0,a=l&&(s&D)!==0,u=a||(s&le)!==0||o(this,Fe).has(i);if(!u&&i.fn!==null){l?i.f^=D:s&gn?n.push(i):Xt(i)&&(s&Pe&&o(this,Ne).add(i),$t(i));var _=i.first;if(_!==null){i=_;continue}}for(;i!==null;){var d=i.next;if(d!==null){i=d;break}i=i.parent}}},Di=function(){for(var t=o(this,st);t!==null;){if(!t.is_fork){for(const[n,[,r]]of this.current)if(t.current.has(n)&&!r)return t}t=o(t,st)}return null},Li=function(t){var r;for(const[i,s]of t.current)!this.previous.has(i)&&t.previous.has(i)&&this.previous.set(i,t.previous.get(i)),this.current.set(i,s);for(const[i,s]of t.async_deriveds){const l=this.async_deriveds.get(i);l&&s.promise.then(l.resolve).catch(l.reject)}t.async_deriveds.clear(),this.transfer_effects(o(t,Ge),o(t,Ne));const n=i=>{var s=i.reactions;if(s!==null&&!(i.f&K&&!(i.f&(L|ke))))for(const u of s){var l=u.f;if(l&K)n(u);else{var a=u;l&(yt|Pe)&&!this.async_deriveds.has(a)&&(o(this,Ne).delete(a),I(a,L),this.schedule(a))}}};for(const i of this.current.keys())n(i);this.oncommit(()=>t.discard()),T(r=t,O,fn).call(r),w=this,T(this,O,on).call(this)},Nt=function(t){for(var n=0;n<t.length;n+=1)Ri(t[n],o(this,Ge),o(this,Ne))},bl=function(){var v;for(let f=fr;f!==null;f=o(f,mt)){var t=f.id<this.id,n=[];for(const[c,[p,m]]of this.current){if(f.current.has(c)){var r=f.current.get(c)[0];if(t&&p!==r)f.current.set(c,[p,m]);else continue}n.push(c)}if(t)for(const[c,p]of this.async_deriveds){const m=f.async_deriveds.get(c);m&&p.promise.then(m.resolve).catch(m.reject)}var i=[...f.current.keys()].filter(c=>!f.current.get(c)[1]);if(!(!o(f,Ft)||i.length===0)){var s=i.filter(c=>!this.current.has(c));if(s.length===0)t&&f.discard();else if(n.length>0){if(o(f,lt)||tl(o(f,ie).length===0,"Batch has scheduled roots"),t)for(const c of o(this,Ut))f.unskip_effect(c,p=>{var m;p.f&(Pe|yt)?f.schedule(p):T(m=f,O,Nt).call(m,[p])});f.activate();var l=new Set,a=new Map;for(var u of n)Fi(u,s,l,a);a=new Map;var _=[...f.current].filter(([c,p])=>{const m=this.current.get(c);return m?m[0]!==p[0]||m[1]!==p[1]:!0}).map(([c])=>c);if(_.length>0)for(const c of o(this,kn))!(c.f&(Se|le|mn))&&Dr(c,_,a)&&(c.f&(yt|Pe)?(I(c,L),f.schedule(c)):o(f,Ge).add(c));if(o(f,ie).length>0&&!o(f,lt)){f.apply();for(var d of o(f,ie))T(v=f,O,$r).call(v,d,[],[]);b(f,ie,[])}f.deactivate()}}}},fn=function(){if(this.linked){var t=o(this,st),n=o(this,mt);t===null?fr=n:b(t,mt,n),n===null?qt=t:b(n,st,t),this.linked=!1}};let Tt=Xn;function El(e){var t=vn;vn=!0;try{for(var n;;){if(nl(),w===null)return n;w.flush()}}finally{vn=t}}function kl(){{var e=new Map;for(const n of w.current.keys())for(const[r,i]of n.updated??[]){var t=e.get(r);t||(t={error:i.error,count:0},e.set(r,t)),t.count+=i.count}for(const n of e.values())n.error&&console.error(n.error)}try{Ps()}catch(n){ft(n,"stack",{value:""}),at(n,Tr)}}let qe=null;function Xr(e){var t=e.length;if(t!==0){for(var n=0;n<t;){var r=e[n++];if(!(r.f&(Se|le))&&Xt(r)&&(qe=new Set,$t(r),r.deps===null&&r.first===null&&r.nodes===null&&r.teardown===null&&r.ac===null&&Ji(r),(qe==null?void 0:qe.size)>0)){Be.clear();for(const i of qe){if(i.f&(Se|le))continue;const s=[i];let l=i.parent;for(;l!==null;)qe.has(l)&&(qe.delete(l),s.push(l)),l=l.parent;for(let a=s.length-1;a>=0;a--){const u=s[a];u.f&(Se|le)||$t(u)}}qe.clear()}}qe=null}}function Fi(e,t,n,r){if(!n.has(e)&&(n.add(e),e.reactions!==null))for(const i of e.reactions){const s=i.f;s&K?Fi(i,t,n,r):s&(yt|Pe)&&!(s&L)&&Dr(i,t,r)&&(I(i,L),Lr(i))}}function Dr(e,t,n){const r=n.get(e);if(r!==void 0)return r;if(e.deps!==null)for(const i of e.deps){if(pn.call(t,i))return!0;if(i.f&K&&Dr(i,t,n))return n.set(i,!0),!0}return n.set(e,!1),!1}function Lr(e){w.schedule(e)}function ji(e,t){if(!(e.f&xe&&e.f&D)){e.f&L?t.d.push(e):e.f&ke&&t.m.push(e),I(e,D);for(var n=e.first;n!==null;)ji(n,t),n=n.next}}function Hi(e){I(e,D);for(var t=e.first;t!==null;)Hi(t),t=t.next}let Kt=new Set;const Be=new Map;function Qr(e){Kt=e}let Fr=!1;function Sl(){Fr=!0}function At(e,t){var n={f:0,v:e,reactions:null,equals:Ei,rv:0,wv:0};return n}function et(e,t){const n=At(e);return jl(n),n}function Ye(e,t=!1,n=!0){var i;const r=At(e);return t||(r.equals=ki),$n&&n&&A!==null&&A.l!==null&&((i=A.l).s??(i.s=[])).push(r),r}function ei(e,t){return Y(e,C(()=>h(e))),t}function Y(e,t,n=!1){x!==null&&(!be||x.f&mn)&&Mn()&&x.f&(K|Pe|yt|mn)&&(ze===null||!ze.has(e))&&js();let r=n?un(t):t;return Si(r,e.label),Wt(e,r,Vn)}function Wt(e,t,n=null){var i;if(!e.equals(t)){ut?Be.set(e,t):Be.has(e)||Be.set(e,e.v);var r=Tt.ensure();r.capture(e,t);{if(S!==null){e.updated??(e.updated=new Map);const s=(((i=e.updated.get(""))==null?void 0:i.count)??0)+1;if(e.updated.set("",{error:null,count:s}),s>5){const l=xi("updated at");if(l!==null){let a=e.updated.get(l.stack);a||(a={error:l,count:0},e.updated.set(l.stack,a)),a.count++}}}S!==null&&(e.set_during_effect=!0)}if(e.f&K){const s=e;e.f&L&&Pr(s),J===null&&Nr(s)}e.wv=ts(),zi(e,L,n),Mn()&&S!==null&&S.f&D&&!(S.f&(xe|Xe))&&(pe===null?Hl([e]):pe.push(e)),!r.is_fork&&Kt.size>0&&!Fr&&Bi()}return t}function Bi(){Fr=!1;for(const e of Kt){e.f&D&&I(e,ke);let t;try{t=Xt(e)}catch{t=!0}t&&$t(e)}Kt.clear()}function hn(e){Y(e,e.v+1)}function zi(e,t,n){var r=e.reactions;if(r!==null)for(var i=Mn(),s=r.length,l=0;l<s;l++){var a=r[l],u=a.f;if(!(!i&&a===S)){var _=(u&L)===0;if(_&&I(a,t),u&mn)Kt.add(a);else if(u&K){var d=a;J==null||J.delete(d),u&xt||(u&Ee&&(S===null||!(S.f&wn))&&(a.f|=xt),zi(d,ke,n))}else if(_){var v=a;u&Pe&&qe!==null&&qe.add(v),n!==null?n.push(v):Lr(v)}}}}const xl=/^[a-zA-Z_$][a-zA-Z_$0-9]*$/;function un(e){if(typeof e!="object"||e===null||bt in e)return e;const t=_i(e);if(t!==gs&&t!==ms)return e;var n=new Map,r=hi(e),i=et(0),s=St,l=d=>{if(St===s)return d();var v=x,f=St;Te(null),ii(s);var c=d();return Te(v),ii(f),c};r&&(n.set("length",et(e.length)),e=Al(e));var a="";let u=!1;function _(d){if(!u){u=!0,a=d,G(i,`${a} version`);for(const[v,f]of n)G(f,vt(a,v));u=!1}}return new Proxy(e,{defineProperty(d,v,f){(!("value"in f)||f.configurable===!1||f.enumerable===!1||f.writable===!1)&&Ls();var c=n.get(v);return c===void 0?l(()=>{var p=et(f.value);return n.set(v,p),typeof v=="string"&&G(p,vt(a,v)),p}):Y(c,f.value,!0),!0},deleteProperty(d,v){var f=n.get(v);if(f===void 0){if(v in d){const c=l(()=>et(z));n.set(v,c),hn(i),G(c,vt(a,v))}}else Y(f,z),hn(i);return!0},get(d,v,f){var g;if(v===bt)return e;if(v===wi)return _;var c=n.get(v),p=v in d;if(c===void 0&&(!p||(g=Pt(d,v))!=null&&g.writable)&&(c=l(()=>{var y=un(p?d[v]:z),U=et(y);return G(U,vt(a,v)),U}),n.set(v,c)),c!==void 0){var m=h(c);return m===z?void 0:m}return Reflect.get(d,v,f)},getOwnPropertyDescriptor(d,v){var f=Reflect.getOwnPropertyDescriptor(d,v);if(f&&"value"in f){var c=n.get(v);c&&(f.value=h(c))}else if(f===void 0){var p=n.get(v),m=p==null?void 0:p.v;if(p!==void 0&&m!==z)return{enumerable:!0,configurable:!0,value:m,writable:!0}}return f},has(d,v){var m;if(v===bt)return!0;var f=n.get(v),c=f!==void 0&&f.v!==z||Reflect.has(d,v);if(f!==void 0||S!==null&&(!c||(m=Pt(d,v))!=null&&m.writable)){f===void 0&&(f=l(()=>{var g=c?un(d[v]):z,y=et(g);return G(y,vt(a,v)),y}),n.set(v,f));var p=h(f);if(p===z)return!1}return c},set(d,v,f,c){var $e;var p=n.get(v),m=v in d;if(r&&v==="length")for(var g=f;g<p.v;g+=1){var y=n.get(g+"");y!==void 0?Y(y,z):g in d&&(y=l(()=>et(z)),n.set(g+"",y),G(y,vt(a,g)))}if(p===void 0)(!m||($e=Pt(d,v))!=null&&$e.writable)&&(p=l(()=>et(void 0)),G(p,vt(a,v)),Y(p,un(f)),n.set(v,p));else{m=p.v!==z;var U=l(()=>un(f));Y(p,U)}var M=Reflect.getOwnPropertyDescriptor(d,v);if(M!=null&&M.set&&M.set.call(c,f),!m){if(r&&typeof v=="string"){var V=n.get("length"),X=Number(v);Number.isInteger(X)&&X>=V.v&&Y(V,X+1)}hn(i)}return!0},ownKeys(d){h(i);var v=Reflect.ownKeys(d).filter(p=>{var m=n.get(p);return m===void 0||m.v!==z});for(var[f,c]of n)c.v!==z&&!(f in d)&&v.push(f);return v},setPrototypeOf(){Fs()}})}function vt(e,t){return typeof t=="symbol"?`${e}[Symbol(${t.description??""})]`:xl.test(t)?`${e}.${t}`:/^\\d+$/.test(t)?`${e}[${t}]`:`${e}[\'${t}\']`}function _n(e){try{if(e!==null&&typeof e=="object"&&bt in e)return e[bt]}catch{}return e}const Tl=new Set(["copyWithin","fill","pop","push","reverse","shift","sort","splice","unshift"]);function Al(e){return new Proxy(e,{get(t,n,r){var i=Reflect.get(t,n,r);return Tl.has(n)?function(...s){Sl();var l=i.apply(this,s);return Bi(),l}:i}})}function $l(){const e=Array.prototype,t=Array.__svelte_cleanup;t&&t();const{indexOf:n,lastIndexOf:r,includes:i}=e;e.indexOf=function(s,l){const a=n.call(this,s,l);if(a===-1){for(let u=l??0;u<this.length;u+=1)if(_n(this[u])===s){Bn("array.indexOf(...)");break}}return a},e.lastIndexOf=function(s,l){const a=r.call(this,s,l??this.length-1);if(a===-1){for(let u=0;u<=(l??this.length-1);u+=1)if(_n(this[u])===s){Bn("array.lastIndexOf(...)");break}}return a},e.includes=function(s,l){const a=i.call(this,s,l);if(!a){for(let u=0;u<this.length;u+=1)if(_n(this[u])===s){Bn("array.includes(...)");break}}return a},Array.__svelte_cleanup=()=>{e.indexOf=n,e.lastIndexOf=r,e.includes=i}}function rn(e,t,n=!0){try{e===t!=(_n(e)===_n(t))&&Bn(n?"===":"!==")}catch{}return e===t===n}var ti,jr,Ui,Vi;function Ol(){if(ti===void 0){ti=window,jr=/Firefox/.test(navigator.userAgent);var e=Element.prototype,t=Node.prototype,n=Text.prototype;Ui=Pt(t,"firstChild").get,Vi=Pt(t,"nextSibling").get,Yr(e)&&(e[wr]=void 0,e[Es]=null,e[yr]=void 0,e.__e=void 0),Yr(n)&&(n[ln]=void 0),e.__svelte_meta=null,$l()}}function Et(e=""){return document.createTextNode(e)}function Gn(e){return Ui.call(e)}function Cn(e){return Vi.call(e)}function N(e,t){return Gn(e)}function Ml(e,t=!1){{var n=Gn(e);return n instanceof Comment&&n.data===""?Cn(n):n}}function B(e,t=1,n=!1){let r=e;for(;t--;)r=Cn(r);return r}function Cl(e){e.textContent=""}function Yi(){return!1}function Rl(e,t,n){return n?document.createElement(e,{is:n}):document.createElement(e)}function Ki(e){S===null&&(x===null&&Is(e),Ns()),ut&&qs(e)}function ql(e,t){var n=t.last;n===null?t.last=t.first=e:(n.next=e,e.prev=n,t.last=e)}function Qe(e,t){for(var n=S;n!==null&&n.f&mn;)n=n.parent;n!==null&&n.f&le&&(e|=le);var r={ctx:A,deps:null,nodes:null,f:e|L|Ee,first:null,fn:t,last:null,next:null,parent:n,b:n&&n.b,prev:null,teardown:null,wv:0,ac:null};r.component_function=On,w==null||w.register_created_effect(r);var i=r;if(e&gn)It!==null?It.push(r):Tt.ensure().schedule(r);else if(t!==null){try{$t(r)}catch(l){throw ce(r),l}i.deps===null&&i.teardown===null&&i.nodes===null&&i.first===i.last&&!(i.f&Zt)&&(i=i.first,e&Pe&&e&Vt&&i!==null&&(i.f|=Vt))}if(i!==null&&(i.parent=n,n!==null&&ql(i,n),x!==null&&x.f&K&&!(e&Xe))){var s=x;(s.effects??(s.effects=[])).push(i)}return r}function Hr(){return x!==null&&!be}function Wi(e){const t=Qe(Tn,null);return I(t,D),t.teardown=e,t}function Or(e){Ki("$effect"),ft(e,"name",{value:"$effect"});var t=S.f,n=!x&&(t&xe)!==0&&A!==null&&!A.i;if(n){var r=A;(r.e??(r.e=[])).push(e)}else return Gi(e)}function Gi(e){return Qe(gn|mi,e)}function Nl(e){return Ki("$effect.pre"),ft(e,"name",{value:"$effect.pre"}),Qe(Tn|mi,e)}function Il(e){Tt.ensure();const t=Qe(Xe|Zt,e);return(n={})=>new Promise(r=>{n.outro?kt(t,()=>{ce(t),r(void 0)}):(ce(t),r(void 0))})}function ni(e,t){var n=A,r={effect:null,ran:!1,deps:e};n.l.$.push(r),r.effect=rr(()=>{if(e(),!r.ran){r.ran=!0;var i=S;try{Ae(i.parent),C(t)}finally{Ae(i)}}})}function Pl(){var e=A;rr(()=>{for(var t of e.l.$){t.deps();var n=t.effect;n.f&D&&n.deps!==null&&I(n,ke),Xt(n)&&$t(n),t.ran=!1}})}function Dl(e){return Qe(yt|Zt,e)}function rr(e,t=0){return Qe(Tn|t,e)}function tt(e,t=[],n=[],r=[]){hl(r,t,n,i=>{Qe(Tn,()=>{e(...i.map(h))})})}function Br(e,t=0){var n=Qe(Pe|t,e);return n.dev_stack=Je,n}function ye(e){return Qe(xe|Zt,e)}function Zi(e){var t=e.teardown;if(t!==null){const n=ut,r=x;ri(!0),Te(null);try{t.call(null)}finally{ri(n),Te(r)}}}function zr(e,t=!1){var n=e.first;for(e.first=e.last=null;n!==null;){const i=n.ac;i!==null&&Jt(()=>{i.abort(An)});var r=n.next;n.f&Xe?n.parent=null:ce(n,t),n=r}}function Ll(e){for(var t=e.first;t!==null;){var n=t.next;t.f&xe||ce(t),t=n}}function ce(e,t=!0){var n=!1;(t||e.f&bs)&&e.nodes!==null&&e.nodes.end!==null&&(Fl(e.nodes.start,e.nodes.end),n=!0),e.f|=Kr,zr(e,t&&!n),yn(e,0);var r=e.nodes&&e.nodes.t;if(r!==null)for(const s of r)s.stop();Zi(e),e.f^=Kr,e.f|=Se;var i=e.parent;i!==null&&i.first!==null&&Ji(e),e.component_function=null,e.next=e.prev=e.teardown=e.ctx=e.deps=e.fn=e.nodes=e.ac=e.b=null}function Fl(e,t){for(;e!==null;){var n=e===t?null:Cn(e);e.remove(),e=n}}function Ji(e){var t=e.parent,n=e.prev,r=e.next;n!==null&&(n.next=r),r!==null&&(r.prev=n),t!==null&&(t.first===e&&(t.first=r),t.last===e&&(t.last=n))}function kt(e,t,n=!0){var r=[];Xi(e,r,!0);var i=()=>{n&&ce(e),t&&t()},s=r.length;if(s>0){var l=()=>--s||i();for(var a of r)a.out(l)}else i()}function Xi(e,t,n){if(!(e.f&le)){e.f^=le;var r=e.nodes&&e.nodes.t;if(r!==null)for(const a of r)(a.is_global||n)&&t.push(a);for(var i=e.first;i!==null;){var s=i.next;if(!(i.f&Xe)){var l=(i.f&Vt)!==0||(i.f&xe)!==0&&(e.f&Pe)!==0;Xi(i,t,l?n:!1)}i=s}}}function Zn(e){Qi(e,!0)}function Qi(e,t){if(e.f&le){e.f^=le,e.f&D||(I(e,L),Tt.ensure().schedule(e));for(var n=e.first;n!==null;){var r=n.next,i=(n.f&Vt)!==0||(n.f&xe)!==0;Qi(n,i?t:!1),n=r}var s=e.nodes&&e.nodes.t;if(s!==null)for(const l of s)(l.is_global||t)&&l.in()}}function Ur(e,t){if(e.nodes)for(var n=e.nodes.start,r=e.nodes.end;n!==null;){var i=n===r?null:Cn(n);t.append(n),n=i}}let Yn=!1,ut=!1;function ri(e){ut=e}let x=null,be=!1;function Te(e){x=e}let S=null;function Ae(e){S=e}let ze=null;function jl(e){x!==null&&(ze??(ze=new Set)).add(e)}let Z=null,fe=0,pe=null;function Hl(e){pe=e}let es=1,_t=0,St=_t;function ii(e){St=e}function ts(){return++es}function Xt(e){var t=e.f;if(t&L)return!0;if(t&K&&(e.f&=~xt),t&ke){for(var n=e.deps,r=n.length,i=0;i<r;i++){var s=n[i];if(Xt(s)&&Ii(s),s.wv>e.wv)return!0}t&Ee&&J===null&&I(e,D)}return!1}function ns(e,t,n=!0){var r=e.reactions;if(r!==null&&!(ze!==null&&ze.has(e)))for(var i=0;i<r.length;i++){var s=r[i];s.f&K?ns(s,t,!1):t===s&&(n?I(s,L):s.f&D&&I(s,ke),Lr(s))}}function rs(e){var m;var t=Z,n=fe,r=pe,i=x,s=ze,l=A,a=be,u=St,_=e.f;Z=null,fe=0,pe=null,x=_&(xe|Xe)?null:e,ze=null,Yt(e.ctx),be=!1,St=++_t,e.ac!==null&&(Jt(()=>{e.ac.abort(An)}),e.ac=null);try{e.f|=wn;var d=e.fn,v=d();e.f|=Gt;var f=e.deps,c=w==null?void 0:w.is_fork;if(Z!==null){var p;if(c||yn(e,fe),f!==null&&fe>0)for(f.length=fe+Z.length,p=0;p<Z.length;p++)f[fe+p]=Z[p];else e.deps=f=Z;if(Hr()&&e.f&Ee)for(p=fe;p<f.length;p++)((m=f[p]).reactions??(m.reactions=[])).push(e)}else!c&&f!==null&&fe<f.length&&(yn(e,fe),f.length=fe);if(Mn()&&pe!==null&&!be&&f!==null&&!(e.f&(K|ke|L)))for(p=0;p<pe.length;p++)ns(pe[p],e);if(i!==null&&i!==e){if(_t++,i.deps!==null)for(let g=0;g<n;g+=1)i.deps[g].rv=_t;if(t!==null)for(const g of t)g.rv=_t;pe!==null&&(r===null?r=pe:r.push(...pe))}return e.f&ot&&(e.f^=ot),v}catch(g){return Oi(g)}finally{e.f^=wn,Z=t,fe=n,pe=r,x=i,ze=s,Yt(l),be=a,St=u}}function Bl(e,t){let n=t.reactions;if(n!==null){var r=_s.call(n,e);if(r!==-1){var i=n.length-1;i===0?n=t.reactions=null:(n[r]=n[i],n.pop())}}if(n===null&&t.f&K&&(Z===null||!pn.call(Z,t))){var s=t;s.f&Ee&&(s.f^=Ee,s.f&=~xt),s.v!==z&&Nr(s),s.ac!==null&&Jt(()=>{s.ac.abort(An),s.ac=null,I(s,L)}),wl(s),yn(s,0)}}function yn(e,t){var n=e.deps;if(n!==null)for(var r=t;r<n.length;r++)Bl(e,n[r])}function $t(e){var t=e.f;if(!(t&Se)){I(e,D);var n=S,r=Yn;S=e,Yn=(t&(xe|Xe))===0;{var i=On;Gr(e.component_function);var s=Je;Kn(e.dev_stack??Je)}try{t&(Pe|gi)?Ll(e):zr(e),Zi(e);var l=rs(e);e.teardown=typeof l=="function"?l:null,e.wv=es;var a;vi&&Xs&&e.f&L&&e.deps}finally{Yn=r,S=n,Gr(i),Kn(s)}}}async function zl(){await Promise.resolve(),El()}function h(e){var t=e.f,n=(t&K)!==0;if(x!==null&&!be){var r=S!==null&&(S.f&Se)!==0;if(!r&&(ze===null||!ze.has(e))){var i=x.deps;if(x.f&wn)e.rv<_t&&(e.rv=_t,Z===null&&i!==null&&i[fe]===e?fe++:Z===null?Z=[e]:Z.push(e));else{x.deps??(x.deps=[]),pn.call(x.deps,e)||x.deps.push(e);var s=e.reactions;s===null?e.reactions=[x]:pn.call(s,x)||s.push(x)}}}{if(!be&&se&&w===null&&Dt===null&&!se.warned&&!(se.effect.f&wn)&&!se.effect_deps.has(e)){se.warned=!0,Ws(e.label);var l=xi("traced at");l&&console.warn(l)}pl.delete(e)}if(ut&&Be.has(e))return Be.get(e);if(n){var a=e;if(ut){var u=a.v;return(!(a.f&D)&&a.reactions!==null||ss(a))&&(u=Pr(a)),Be.set(a,u),u}var _=(a.f&Ee)===0&&!be&&x!==null&&(Yn||(x.f&Ee)!==0),d=(a.f&Gt)===0;Xt(a)&&(_&&(a.f|=Ee),Ii(a)),_&&!d&&(Pi(a),is(a))}if(J!=null&&J.has(e))return J.get(e);if(e.f&ot)throw e.v;return e.v}function is(e){if(e.f|=Ee,e.deps!==null)for(const t of e.deps)(t.reactions??(t.reactions=[])).push(e),t.f&K&&!(t.f&Ee)&&(Pi(t),is(t))}function ss(e){if(e.v===z)return!0;if(e.deps===null)return!1;for(const t of e.deps)if(Be.has(t)||t.f&K&&ss(t))return!0;return!1}function C(e){var t=be;try{return be=!0,e()}finally{be=t}}function Ul(e){if(!(typeof e!="object"||!e||e instanceof EventTarget)){if(bt in e)Mr(e);else if(!Array.isArray(e))for(let t in e){const n=e[t];typeof n=="object"&&n&&bt in n&&Mr(n)}}}function Mr(e,t=new Set){if(typeof e=="object"&&e!==null&&!(e instanceof EventTarget)&&!t.has(e)){t.add(e),e instanceof Date&&e.getTime();for(let r in e)try{Mr(e[r],t)}catch{}const n=_i(e);if(n!==Object.prototype&&n!==Array.prototype&&n!==Map.prototype&&n!==Set.prototype&&n!==Date.prototype){const r=ps(n);for(let i in r){const s=r[i].get;if(s)try{s.call(e)}catch{}}}}}const Vl=["touchstart","touchmove"];function Yl(e){return Vl.includes(e)}function ae(e,t,n){return(...r)=>{const i=e(...r);var s=i.nodeType===xs?i.firstChild:i;return ls(s,t,n),i}}function Kl(e,t,n){e.__svelte_meta={parent:Je,loc:{file:t,line:n[0],column:n[1]}},n[2]&&ls(e.firstChild,t,n[2])}function ls(e,t,n){for(var r=0;e&&r<n.length;)e.nodeType===Ss&&Kl(e,t,n[r++]),e=e.nextSibling}const Dn=Symbol("events"),Wl=new Set,si=new Set;function Gl(e,t,n,r={}){function i(s){if(r.capture||Cr.call(t,s),!s.cancelBubble)return Jt(()=>n==null?void 0:n.call(this,s))}return e.startsWith("pointer")||e.startsWith("touch")||e==="wheel"?Ze(()=>{t.addEventListener(e,i,r)}):t.addEventListener(e,i,r),i}function Zl(e,t,n,r,i){var s={capture:r,passive:i},l=Gl(e,t,n,s);(t===document.body||t===window||t===document||t instanceof HTMLMediaElement)&&Wi(()=>{t.removeEventListener(e,l,s)})}let dr=null,vr=!1;function Cr(e){var m,g;var t=this,n=t.ownerDocument,r=e.type,i=((m=e.composedPath)==null?void 0:m.call(e))||[],s=i[0]||e.target;dr=e,vr||(vr=!0,setTimeout(()=>{vr=!1,dr=null}));var l=0,a=dr===e&&e[Dn];if(a){var u=i.indexOf(a);if(u!==-1&&(t===document||t===window)){e[Dn]=t;return}var _=i.indexOf(t);if(_===-1)return;u<=_&&(l=u)}if(s=i[l]||e.target,s!==t){ft(e,"currentTarget",{configurable:!0,get(){return s||n}});var d=x,v=S;Te(null),Ae(null);try{for(var f,c=[];s!==null&&s!==t;){try{var p=(g=s[Dn])==null?void 0:g[r];p!=null&&(!s.disabled||e.target===s)&&p.call(s,e)}catch(y){f?c.push(y):f=y}if(e.cancelBubble)break;l++,s=l<i.length?i[l]:null}if(f){for(let y of c)queueMicrotask(()=>{throw y});throw f}}finally{e[Dn]=t,delete e.currentTarget,Te(d),Ae(v)}}}var ci;const hr=((ci=globalThis==null?void 0:globalThis.window)==null?void 0:ci.trustedTypes)&&globalThis.window.trustedTypes.createPolicy("svelte-trusted-html",{createHTML:e=>e});function Jl(e){return(hr==null?void 0:hr.createHTML(e))??e}function Xl(e){var t=Rl("template");return t.innerHTML=Jl(e.replaceAll("<!>","\\x3C!---->")),t.content}function li(e,t){var n=S;n.nodes===null&&(n.nodes={start:e,end:t,a:null,t:null})}function oe(e,t){var n=(t&Ys)!==0,r=(t&Ks)!==0,i,s=!e.startsWith("<!>");return()=>{i===void 0&&(i=Xl(s?e:"<!>"+e),n||(i=Gn(i)));var l=r||jr?document.importNode(i,!0):i.cloneNode(!0);if(n){var a=Gn(l),u=l.lastChild;li(a,u)}else li(l,l);return l}}function ne(e,t){e!==null&&e.before(t)}function Re(e,t){var n=t==null?"":typeof t=="object"?`${t}`:t;n!==(e[ln]??(e[ln]=e.nodeValue))&&(e[ln]=n,e.nodeValue=`${n}`)}function Ql(e,t){return ea(e,t)}const Ln=new Map;function ea(e,{target:t,anchor:n,props:r={},events:i,context:s,intro:l=!0,transformError:a}){Ol();var u=void 0,_=Il(()=>{var d=n??t.appendChild(Et());fl(d,{pending:()=>{}},c=>{Ti({});var p=A;s&&(p.c=s),i&&(r.$$events=i),u=e(c,r)||{},Ai()},a);var v=new Set,f=c=>{for(var p=0;p<c.length;p++){var m=c[p];if(!v.has(m)){v.add(m);var g=Yl(m);for(const M of[t,document]){var y=Ln.get(M);y===void 0&&(y=new Map,Ln.set(M,y));var U=y.get(m);U===void 0?(M.addEventListener(m,Cr,{passive:g}),y.set(m,1)):y.set(m,U+1)}}}};return f(er(Wl)),si.add(f),()=>{var g;for(var c of v)for(const y of[t,document]){var p=Ln.get(y),m=p.get(c);--m==0?(y.removeEventListener(c,Cr),p.delete(c),p.size===0&&Ln.delete(y)):p.set(c,m)}si.delete(f),d!==n&&((g=d.parentNode)==null||g.removeChild(d))}});return ta.set(u,_),u}let ta=new WeakMap;function na(e){e&&Os(e[F]??"a component",e.name)}function ra(){const e=A==null?void 0:A.function;function t(n){$s(n,e[F])}return{$destroy:()=>t("$destroy()"),$on:()=>t("$on(...)"),$set:()=>t("$set(...)")}}var Ie,je,he,wt,Sn,xn,Qn;class ia{constructor(t,n=!0){de(this,"anchor");k(this,Ie,new Map);k(this,je,new Map);k(this,he,new Map);k(this,wt,new Set);k(this,Sn,!0);k(this,xn,t=>{if(o(this,Ie).has(t)){var n=o(this,Ie).get(t),r=o(this,je).get(n);if(r)Zn(r),o(this,wt).delete(n);else{var i=o(this,he).get(n);i&&(Zn(i.effect),o(this,je).set(n,i.effect),o(this,he).delete(n),i.fragment.lastChild[ks]=this.anchor,i.fragment.lastChild.remove(),this.anchor.before(i.fragment),r=i.effect)}for(const[s,l]of o(this,Ie)){if(o(this,Ie).delete(s),s===t)break;const a=o(this,he).get(l);a&&(ce(a.effect),o(this,he).delete(l))}for(const[s,l]of o(this,je)){if(s===n||o(this,wt).has(s))continue;const a=()=>{if(Array.from(o(this,Ie).values()).includes(s)){var _=document.createDocumentFragment();Ur(l,_),_.append(Et()),o(this,he).set(s,{effect:l,fragment:_})}else ce(l);o(this,wt).delete(s),o(this,je).delete(s)};o(this,Sn)||!r?(o(this,wt).add(s),kt(l,a,!1)):a()}}});k(this,Qn,t=>{o(this,Ie).delete(t);const n=Array.from(o(this,Ie).values());for(const[r,i]of o(this,he))n.includes(r)||(ce(i.effect),o(this,he).delete(r))});this.anchor=t,b(this,Sn,n)}ensure(t,n){var r=w,i=Yi();if(n&&!o(this,je).has(t)&&!o(this,he).has(t))if(i){var s=document.createDocumentFragment(),l=Et();s.append(l),o(this,he).set(t,{effect:ye(()=>n(l)),fragment:s})}else o(this,je).set(t,ye(()=>n(this.anchor)));if(o(this,Ie).set(r,t),i){for(const[a,u]of o(this,je))a===t?r.unskip_effect(u):r.skip_effect(u);for(const[a,u]of o(this,he))a===t?r.unskip_effect(u.effect):r.skip_effect(u.effect);r.oncommit(o(this,xn)),r.ondiscard(o(this,Qn))}else o(this,xn).call(this,r)}}Ie=new WeakMap,je=new WeakMap,he=new WeakMap,wt=new WeakMap,Sn=new WeakMap,xn=new WeakMap,Qn=new WeakMap;function nt(e,t,n=!1){var r=new ia(e),i=n?Vt:0;function s(l,a){r.ensure(l,a)}Br(()=>{var l=!1;t((a,u=0)=>{l=!0,s(u,a)}),l||s(-1,null)},i)}function Fn(e,t){return t}function sa(e,t,n){for(var r=[],i=t.length,s,l=t.length,a=0;a<i;a++){let v=t[a];kt(v,()=>{if(s){if(s.pending.delete(v),s.done.add(v),s.pending.size===0){var f=e.outrogroups;Rr(e,er(s.done)),f.delete(s),f.size===0&&(e.outrogroups=null)}}else l-=1},!1)}if(l===0){var u=r.length===0&&n!==null&&e.pending.size===0;if(u){var _=n,d=_.parentNode;Cl(d),d.append(_),e.items.clear()}Rr(e,t,!u)}else s={pending:new Set(t),done:new Set},(e.outrogroups??(e.outrogroups=new Set)).add(s)}function Rr(e,t,n=!0){var r;if(e.pending.size>0){r=new Set;for(const l of e.pending.values())for(const a of l)r.add(e.items.get(a).e)}for(var i=0;i<t.length;i++){var s=t[i];if(r!=null&&r.has(s)){s.f|=He;const l=document.createDocumentFragment();Ur(s,l)}else ce(t[i],n)}}var ai;function jn(e,t,n,r,i,s=null){var l=e,a=new Map,u=(t&bi)!==0;if(u){var _=e;l=_.appendChild(Et())}var d=null,v=Ni(()=>{var M=n();return hi(M)?M:M==null?[]:er(M)});G(v,"{#each ...}");var f,c=new Map,p=!0;function m(M){U.effect.f&Se||(U.pending.delete(M),U.fallback=d,la(U,f,l,t,r),d!==null&&(f.length===0?d.f&He?(d.f^=He,cn(d,null,l)):Zn(d):kt(d,()=>{d=null})))}function g(M){U.pending.delete(M)}var y=Br(()=>{f=h(v);for(var M=f.length,V=new Set,X=w,$e=Yi(),W=0;W<M;W+=1){var E=f[W],P=r(E,W);{var Q=r(E,W);P!==Q&&Rs(String(W),String(P),String(Q))}var j=p?null:a.get(P);j?(j.v&&Wt(j.v,E),j.i&&Wt(j.i,W),$e&&X.unskip_effect(j.e)):(j=aa(a,p?l:ai??(ai=Et()),E,P,W,i,t,n),p||(j.e.f|=He),a.set(P,j)),V.add(P)}if(M===0&&s&&!d&&(p?d=ye(()=>s(l)):(d=ye(()=>s(ai??(ai=Et()))),d.f|=He)),M>V.size&&oa(f,r),!p)if(c.set(X,V),$e){for(const[Ot,Mt]of a)V.has(Ot)||X.skip_effect(Mt.e);X.oncommit(m),X.ondiscard(g)}else m(X);h(v)}),U={effect:y,items:a,pending:c,outrogroups:null,fallback:d};p=!1}function sn(e){for(;e!==null&&!(e.f&xe);)e=e.next;return e}function la(e,t,n,r,i){var Q,j,Ot,Mt,Rn,Qt,en,qn,tn;var s=(r&Us)!==0,l=t.length,a=e.items,u=sn(e.effect.first),_,d=null,v,f=[],c=[],p,m,g,y;if(s)for(y=0;y<l;y+=1)p=t[y],m=i(p,y),g=a.get(m).e,g.f&He||((j=(Q=g.nodes)==null?void 0:Q.a)==null||j.measure(),(v??(v=new Set)).add(g));for(y=0;y<l;y+=1){if(p=t[y],m=i(p,y),g=a.get(m).e,e.outrogroups!==null)for(const Oe of e.outrogroups)Oe.pending.delete(g),Oe.done.delete(g);if(g.f&le&&(Zn(g),s&&((Mt=(Ot=g.nodes)==null?void 0:Ot.a)==null||Mt.unfix(),(v??(v=new Set)).delete(g))),g.f&He)if(g.f^=He,g===u)cn(g,null,n);else{var U=d?d.next:u;g===e.effect.last&&(e.effect.last=g.prev),g.prev&&(g.prev.next=g.next),g.next&&(g.next.prev=g.prev),rt(e,d,g),rt(e,g,U),cn(g,U,n),d=g,f=[],c=[],u=sn(d.next);continue}if(g!==u){if(_!==void 0&&_.has(g)){if(f.length<c.length){var M=c[0],V;d=M.prev;var X=f[0],$e=f[f.length-1];for(V=0;V<f.length;V+=1)cn(f[V],M,n);for(V=0;V<c.length;V+=1)_.delete(c[V]);rt(e,X.prev,$e.next),rt(e,d,X),rt(e,$e,M),u=M,d=$e,y-=1,f=[],c=[]}else _.delete(g),cn(g,u,n),rt(e,g.prev,g.next),rt(e,g,d===null?e.effect.first:d.next),rt(e,d,g),d=g;continue}for(f=[],c=[];u!==null&&u!==g;)(_??(_=new Set)).add(u),c.push(u),u=sn(u.next);if(u===null)continue}g.f&He||f.push(g),d=g,u=sn(g.next)}if(e.outrogroups!==null){for(const Oe of e.outrogroups)Oe.pending.size===0&&(Rr(e,er(Oe.done)),(Rn=e.outrogroups)==null||Rn.delete(Oe));e.outrogroups.size===0&&(e.outrogroups=null)}if(u!==null||_!==void 0){var W=[];if(_!==void 0)for(g of _)g.f&le||W.push(g);for(;u!==null;)!(u.f&le)&&u!==e.fallback&&W.push(u),u=sn(u.next);var E=W.length;if(E>0){var P=r&bi&&l===0?n:null;if(s){for(y=0;y<E;y+=1)(en=(Qt=W[y].nodes)==null?void 0:Qt.a)==null||en.measure();for(y=0;y<E;y+=1)(tn=(qn=W[y].nodes)==null?void 0:qn.a)==null||tn.fix()}sa(e,W,P)}}s&&Ze(()=>{var Oe,Nn;if(v!==void 0)for(g of v)(Nn=(Oe=g.nodes)==null?void 0:Oe.a)==null||Nn.apply()})}function aa(e,t,n,r,i,s,l,a){var u=l&Bs?l&Vs?At(n):Ye(n,!1,!1):null,_=l&zs?At(i):null;return u&&(u.trace=()=>{a()[(_==null?void 0:_.v)??i]}),{v:u,i:_,e:ye(()=>(s(t,u??n,_??i,a),()=>{e.delete(r)}))}}function cn(e,t,n){if(e.nodes)for(var r=e.nodes.start,i=e.nodes.end,s=t&&!(t.f&He)?t.nodes.start:n;r!==null;){var l=Cn(r);if(s.before(r),r===i)return;r=l}}function rt(e,t,n){t===null?e.effect.first=n:t.next=n,n===null?e.effect.last=t:n.prev=t}function oa(e,t){const n=new Map,r=e.length;for(let i=0;i<r;i++){const s=t(e[i],i);if(n.has(s)){const l=String(n.get(s)),a=String(i);let u=String(s);u.startsWith("[object ")&&(u=null),Cs(l,a,u)}n.set(s,i)}}const oi=[...` 	\n\\r\\f \\v\\uFEFF`];function fa(e,t,n){var r=""+e;if(n){for(var i of Object.keys(n))if(n[i])r=r?r+" "+i:i;else if(r.length)for(var s=i.length,l=0;(l=r.indexOf(i,l))>=0;){var a=l+s;(l===0||oi.includes(r[l-1]))&&(a===r.length||oi.includes(r[a]))?r=(l===0?"":r.substring(0,l))+r.substring(a+1):l=a}}return r===""?null:r}function ua(e,t){return e==null?null:String(e)}function ca(e,t,n,r,i,s){var l=e[wr];if(l!==n||l===void 0){var a=fa(n,r,s);a==null?e.removeAttribute("class"):e.className=a,e[wr]=n}else if(s&&i!==s)for(var u in s){var _=!!s[u];(i==null||_!==!!i[u])&&e.classList.toggle(u,_)}return s}function da(e,t,n,r){var i=e[yr];if(i!==t){var s=ua(t);s==null?e.removeAttribute("style"):e.style.cssText=s,e[yr]=t}return r}function fi(e,t,n=t){var r=new WeakSet;ll(e,"input",async i=>{e.type==="checkbox"&&Wr();var s=i?e.defaultValue:e.value;if(s=_r(e)?pr(s):s,n(s),w!==null&&r.add(w),await zl(),s!==(s=t())){var l=e.selectionStart,a=e.selectionEnd,u=e.value.length;if(e.value=s??"",a!==null){var _=e.value.length;l===a&&a===u&&_>u?(e.selectionStart=_,e.selectionEnd=_):(e.selectionStart=l,e.selectionEnd=Math.min(a,_))}}}),C(t)==null&&e.value&&(n(_r(e)?pr(e.value):e.value),w!==null&&r.add(w)),rr(()=>{e.type==="checkbox"&&Wr();var i=t();if(e===document.activeElement){var s=w;if(r.has(s))return}_r(e)&&i===pr(e.value)||e.type==="date"&&!i&&!e.value||i!==e.value&&(e.value=i??"")})}function _r(e){var t=e.type;return t==="number"||t==="range"}function pr(e){return e===""?null:+e}function va(e=!1){const t=A,n=t.l.u;if(!n)return;let r=()=>Ul(t.s);if(e){let i=0,s={};const l=Ir(()=>{let a=!1;const u=t.s;for(const _ in u)u[_]!==s[_]&&(s[_]=u[_],a=!0);return a&&i++,i});r=()=>h(l)}n.b.length&&Nl(()=>{ui(t,r),gr(n.b)}),Or(()=>{const i=C(()=>n.m.map(ys));return()=>{for(const s of i)typeof s=="function"&&s()}}),n.a.length&&Or(()=>{ui(t,r),gr(n.a)})}function ui(e,t){if(e.l.s)for(const n of e.l.s)h(n);t()}{let e=function(t){if(!(t in globalThis)){let n;Object.defineProperty(globalThis,t,{configurable:!0,get:()=>{if(n!==void 0)return n;Ds(t)},set:r=>{n=r}})}};var Ia=e;e("$state"),e("$effect"),e("$derived"),e("$inspect"),e("$props"),e("$bindable")}function as(e){A===null&&yi("onMount"),$n&&A.l!==null?_a(A).m.push(e):Or(()=>{const t=C(e);if(typeof t=="function")return t})}function ha(e){A===null&&yi("onDestroy"),as(()=>()=>C(e))}function _a(e){var t=e.l;return t.u??(t.u={a:[],b:[],m:[]})}const pa="5";var di;typeof window<"u"&&((di=window.__svelte??(window.__svelte={})).v??(di.v=new Set)).add(pa);Qs();function ga(e){const t=new Map;for(const l of e.questions){let a=t.get(l.round);a||(a={round:l.round,nodes:[]},t.set(l.round,a)),a.nodes.push({id:l.id,title:l.title,answered:!!l.answered,rec:l.rec})}const n=[...t.values()].sort((l,a)=>l.round-a.round);for(const l of n)l.nodes.sort((a,u)=>a.id.localeCompare(u.id));const r=new Set(e.questions.filter(l=>l.answered).map(l=>l.id)),i=[];for(const l of e.questions){if(l.answered)continue;const a=l.deps.filter(u=>!r.has(u));a.length>0&&i.push({node:{id:l.id,title:l.title,rec:l.rec},blockedBy:a})}i.sort((l,a)=>l.node.id.localeCompare(a.node.id));const s=e.edges.map(l=>({from:l.from,to:l.to,type:l.type}));return{rows:n,upcoming:i,edges:s}}$[F]="scripts/grilling-ui/src/App.svelte";var ma=ae(oe(\'<span class="page-state svelte-9cqna5"> </span>\'),$[F],[[98,6]]),wa=ae(oe("<p>Loading...</p>"),$[F],[[103,4]]),ya=ae(oe(\'<p class="error svelte-9cqna5"> </p>\'),$[F],[[105,4]]),ba=ae(oe(\'<div class="summary-text svelte-9cqna5"> </div>\'),$[F],[[117,8]]),Ea=ae(oe(\'<span class="badge answered-badge svelte-9cqna5">answered</span>\'),$[F],[[140,18]]),ka=ae(oe(\'<input type="text" placeholder="answer..." class="svelte-9cqna5"/>\'),$[F],[[143,18]]),Sa=ae(oe(\'<div><span class="node-id svelte-9cqna5"> </span> <span class="node-title svelte-9cqna5"> </span> <!> <!></div>\'),$[F],[[136,14,[[137,16],[138,16]]]]),xa=ae(oe(\'<div class="round-row svelte-9cqna5"><h3> </h3> <div class="nodes svelte-9cqna5"></div></div>\'),$[F],[[132,8,[[133,10],[134,10]]]]),Ta=ae(oe(\'<li class="svelte-9cqna5"><span class="edge-from"> </span> <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5"></line></svg> <span class="edge-to"> </span> <span class="edge-type svelte-9cqna5"> </span></li>\'),$[F],[[161,14,[[162,16],[163,16,[[163,44]]],[164,16],[165,16]]]]),Aa=ae(oe(\'<div class="edges svelte-9cqna5"><h3>Edges</h3> <ul class="svelte-9cqna5"></ul></div>\'),$[F],[[157,8,[[158,10],[159,10]]]]),$a=ae(oe(\'<li class="svelte-9cqna5"><span class="node-id svelte-9cqna5"> </span> <span class="blocked-by svelte-9cqna5"> </span></li>\'),$[F],[[178,14,[[179,16],[180,16]]]]),Oa=ae(oe(\'<div class="upcoming svelte-9cqna5"><h3>Upcoming (blocked)</h3> <ul class="svelte-9cqna5"></ul></div>\'),$[F],[[174,8,[[175,10],[176,10]]]]),Ma=ae(oe(\'<div class="submit-section svelte-9cqna5"><button class="svelte-9cqna5">Send all answers</button></div>\'),$[F],[[189,8,[[190,10]]]]),Ca=ae(oe(\'<aside class="summary svelte-9cqna5"><h2>Summary</h2> <textarea placeholder="Free-form summary / feedback..." rows="6" class="svelte-9cqna5"></textarea> <!></aside> <main class="graph svelte-9cqna5"><div class="legend svelte-9cqna5"><span class="legend-item svelte-9cqna5"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: black; stroke-width: 2px;"></line></svg> dependency</span> <span class="legend-item svelte-9cqna5"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: red; stroke-width: 2px;"></line></svg> contradiction</span> <span class="legend-item svelte-9cqna5"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: gray; stroke-width: 1px; stroke-dasharray: 4 4;"></line></svg> reference</span></div> <!> <!> <!> <!></main>\',1),$[F],[[108,4,[[109,6],[110,6]]],[122,4,[[124,6,[[125,8,[[125,34,[[125,61]]]]],[126,8,[[126,34,[[126,61]]]]],[127,8,[[127,34,[[127,61]]]]]]]]]]),Ra=ae(oe(\'<div class="container svelte-9cqna5"><header class="svelte-9cqna5"><h1>Grilling Visualizer</h1> <!></header> <!></div>\'),$[F],[[94,0,[[95,2,[[96,4]]]]]]);function $(e,t){na(new.target),Ti(t,!1,$);const n=Ye(),r=Ye();let i=G(Ye(null),"state"),s=G(Ye({rows:[],upcoming:[],edges:[]}),"model"),l=G(Ye(!0),"loading"),a=G(Ye(null),"error"),u=null,_=G(Ye({}),"answers"),d=G(Ye(""),"feedback");async function v(){try{const E=(await Pn(fetch("/state")))();if(!E.ok)throw new Error(`HTTP ${E.status}`);if(Y(i,(await Pn(E.json()))()),Y(s,ga(h(i))),h(i).answers&&Y(_,{...h(i).answers}),rn(h(i)["page-state"],"in-round")){const P=h(s).rows.length>0?h(s).rows[h(s).rows.length-1].round:1;for(const Q of h(s).rows)if(rn(Q.round,P))for(const j of Q.nodes)j.id in h(_)||ei(_,h(_)[j.id]="")}Y(a,null)}catch(E){Y(a,E.message)}finally{Y(l,!1)}}async function f(){try{const E=(await Pn(fetch("/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:h(_),feedback:h(d)})})))();if(!E.ok)throw new Error(`HTTP ${E.status}`);(await Pn(v()))()}catch(E){Y(a,E.message)}}as(()=>{v(),u=setInterval(v,2e3)}),ha(()=>{u&&clearInterval(u)});function c(E){switch(E){case"dep":return"stroke: black; stroke-width: 2px;";case"contra":return"stroke: red; stroke-width: 2px;";case"ref":return"stroke: gray; stroke-width: 1px; stroke-dasharray: 4 4;";default:return"stroke: black; stroke-width: 1px;"}}function p(E){switch(E){case"dep":return"dependency";case"contra":return"contradiction";case"ref":return"reference";default:return E}}ni(()=>h(s),()=>{Y(n,h(s).rows.length>0?h(s).rows[h(s).rows.length-1].round:0)}),ni(()=>h(i),()=>{var E;Y(r,rn((E=h(i))==null?void 0:E["page-state"],"in-round"))}),Pl();var m={...ra()};va();var g=Ra(),y=N(g),U=B(N(y),2);{var M=E=>{var P=ma(),Q=N(P);tt(()=>Re(Q,`State: ${h(i),C(()=>h(i)["page-state"])??""}`)),ne(E,P)};_e(()=>nt(U,E=>{h(i)&&E(M)}),"if",$,97,4)}var V=B(y,2);{var X=E=>{var P=wa();ne(E,P)},$e=E=>{var P=ya(),Q=N(P);tt(()=>Re(Q,`Error: ${h(a)??""}`)),ne(E,P)},W=E=>{var P=Ca(),Q=Ml(P),j=B(N(Q),2),Ot=B(j,2);{var Mt=H=>{var q=ba(),Me=N(q);tt(()=>Re(Me,(h(i),C(()=>h(i).summary)))),ne(H,q)};_e(()=>nt(Ot,H=>{h(i),C(()=>{var q;return(q=h(i))==null?void 0:q.summary})&&H(Mt)}),"if",$,116,6)}var Rn=B(Q,2),Qt=B(N(Rn),2);_e(()=>jn(Qt,1,()=>(h(s),C(()=>h(s).rows)),Fn,(H,q)=>{var Me=xa(),ct=N(Me),ee=N(ct);var De=B(ct,2);_e(()=>jn(De,5,()=>(h(q),C(()=>h(q).nodes)),Fn,(Ue,te)=>{var Ce=Sa();let Ct;var Ve=N(Ce),ir=N(Ve,!0);var Rt=B(Ve,2),sr=N(Rt,!0);var In=B(Rt,2);{var lr=dt=>{var nn=Ea();ne(dt,nn)};_e(()=>nt(In,dt=>{h(te),C(()=>h(te).answered)&&dt(lr)}),"if",$,139,16)}var fs=B(In,2);{var us=dt=>{var nn=ka();fi(nn,function(){return h(_)[h(te).id]},function(ds){ei(_,h(_)[h(te).id]=ds)}),ne(dt,nn)};_e(()=>nt(fs,dt=>{h(r),h(q),h(n),h(te),C(()=>h(r)&&rn(h(q).round,h(n))&&!h(te).answered)&&dt(us)}),"if",$,142,16)}tt(()=>{Ct=ca(Ce,1,"node svelte-9cqna5",null,Ct,{answered:h(te).answered,current:h(r)&&rn(h(q).round,h(n))}),Re(ir,(h(te),C(()=>h(te).id))),Re(sr,(h(te),C(()=>h(te).title)))}),ne(Ue,Ce)}),"each",$,135,12),tt(()=>Re(ee,`Round ${h(q),C(()=>h(q).round)??""}`)),ne(H,Me)}),"each",$,131,6);var en=B(Qt,2);{var qn=H=>{var q=Aa(),Me=B(N(q),2);_e(()=>jn(Me,5,()=>(h(s),C(()=>h(s).edges)),Fn,(ct,ee)=>{var De=Ta(),Ue=N(De),te=N(Ue,!0);var Ce=B(Ue,2),Ct=N(Ce);var Ve=B(Ce,2),ir=N(Ve,!0);var Rt=B(Ve,2),sr=N(Rt);tt((In,lr)=>{Re(te,(h(ee),C(()=>h(ee).from))),da(Ct,In),Re(ir,(h(ee),C(()=>h(ee).to))),Re(sr,`(${lr??""})`)},[()=>(h(ee),C(()=>c(h(ee).type))),()=>(h(ee),C(()=>p(h(ee).type)))]),ne(ct,De)}),"each",$,160,12),ne(H,q)};_e(()=>nt(en,H=>{h(s),C(()=>h(s).edges.length>0)&&H(qn)}),"if",$,156,6)}var tn=B(en,2);{var Oe=H=>{var q=Oa(),Me=B(N(q),2);_e(()=>jn(Me,5,()=>(h(s),C(()=>h(s).upcoming)),Fn,(ct,ee)=>{var De=$a(),Ue=N(De),te=N(Ue,!0);var Ce=B(Ue,2),Ct=N(Ce);tt(Ve=>{Re(te,(h(ee),C(()=>h(ee).node.id))),Re(Ct,`blocked by: ${Ve??""}`)},[()=>(h(ee),C(()=>h(ee).blockedBy.join(", ")))]),ne(ct,De)}),"each",$,177,12),ne(H,q)};_e(()=>nt(tn,H=>{h(s),C(()=>h(s).upcoming.length>0)&&H(Oe)}),"if",$,173,6)}var Nn=B(tn,2);{var os=H=>{var q=Ma(),Me=N(q);Zl("click",Me,f),ne(H,q)};_e(()=>nt(Nn,H=>{h(r)&&H(os)}),"if",$,188,6)}tt(()=>j.disabled=!h(r)),fi(j,function(){return h(d)},function(q){Y(d,q)}),ne(E,P)};_e(()=>nt(V,E=>{h(l)?E(X):h(a)?E($e,1):E(W,-1)}),"if",$,102,2)}return ne(e,g),Ai(m)}Ql($,{target:document.getElementById("app")});<\/script>\n    <style rel="stylesheet" crossorigin>.container.svelte-9cqna5{display:flex;gap:1rem;font-family:sans-serif;max-width:1200px;margin:0 auto;padding:1rem}header.svelte-9cqna5{grid-column:1 / -1}.page-state.svelte-9cqna5{font-weight:700;color:#555}.summary.svelte-9cqna5{flex:0 0 300px;border-right:1px solid #ccc;padding-right:1rem}.summary.svelte-9cqna5 textarea:where(.svelte-9cqna5){width:100%;box-sizing:border-box}.summary-text.svelte-9cqna5{margin-top:.5rem;font-style:italic;color:#333}.graph.svelte-9cqna5{flex:1}.legend.svelte-9cqna5{display:flex;gap:1rem;margin-bottom:1rem;font-size:.85em}.legend-item.svelte-9cqna5{display:flex;align-items:center;gap:.25rem}.round-row.svelte-9cqna5{margin-bottom:1.5rem;border:1px solid #eee;padding:.5rem;border-radius:4px}.nodes.svelte-9cqna5{display:flex;flex-wrap:wrap;gap:.5rem}.node.svelte-9cqna5{border:1px solid #ccc;padding:.5rem;border-radius:4px;min-width:120px}.node.answered.svelte-9cqna5{background:#e8f5e9}.node.current.svelte-9cqna5{border-color:#2196f3}.node-id.svelte-9cqna5{display:block;font-family:monospace;font-size:.85em;color:#555}.node-title.svelte-9cqna5{font-weight:700}.badge.svelte-9cqna5{font-size:.75em;padding:.1rem .3rem;border-radius:3px}.answered-badge.svelte-9cqna5{background:#4caf50;color:#fff}.node.svelte-9cqna5 input:where(.svelte-9cqna5){margin-top:.25rem;width:100%;box-sizing:border-box}.edges.svelte-9cqna5 ul:where(.svelte-9cqna5),.upcoming.svelte-9cqna5 ul:where(.svelte-9cqna5){list-style:none;padding:0}.edges.svelte-9cqna5 li:where(.svelte-9cqna5),.upcoming.svelte-9cqna5 li:where(.svelte-9cqna5){margin:.25rem 0;display:flex;align-items:center;gap:.25rem}.edge-type.svelte-9cqna5,.blocked-by.svelte-9cqna5{font-size:.85em;color:#666}.submit-section.svelte-9cqna5{margin-top:1rem}.submit-section.svelte-9cqna5 button:where(.svelte-9cqna5){padding:.5rem 1rem;font-size:1em;cursor:pointer}.error.svelte-9cqna5{color:red}</style>\n  </head>\n  <body>\n    <div id="app"></div>\n  </body>\n</html>\n';
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
