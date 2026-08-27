import { parseArgs } from "node:util";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { writeFile, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
const spaHtml = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Grilling Visualizer</title>\n    <script type="module" crossorigin>var ar=Object.defineProperty;var hn=e=>{throw TypeError(e)};var ur=(e,t,n)=>t in e?ar(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var B=(e,t,n)=>ur(e,typeof t!="symbol"?t+"":t,n),Nt=(e,t,n)=>t.has(e)||hn("Cannot "+n);var l=(e,t,n)=>(Nt(e,t,"read from private field"),n?n.call(e):t.get(e)),y=(e,t,n)=>t.has(e)?hn("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,n),p=(e,t,n,i)=>(Nt(e,t,"write to private field"),i?i.call(e,n):t.set(e,n),n),m=(e,t,n)=>(Nt(e,t,"access private method"),n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll(\'link[rel="modulepreload"]\'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=n(r);fetch(r.href,s)}})();const On=!0;var cr=Array.isArray,dr=Array.prototype.indexOf,et=Array.prototype.includes,hr=Array.from,Ye=Object.defineProperty,Fe=Object.getOwnPropertyDescriptor,_r=Object.prototype,vr=Array.prototype,pr=Object.getPrototypeOf,_n=Object.isExtensible;const gr=()=>{};function yr(e){for(var t=0;t<e.length;t++)e[t]()}function mr(){var e,t,n=new Promise((i,r)=>{e=i,t=r});return{promise:n,resolve:e,reject:t}}const M=2,tt=4,$n=8,Rn=1<<24,K=16,ae=32,ue=64,Ut=128,z=512,N=1024,O=2048,Z=4096,ee=8192,oe=16384,at=32768,vn=1<<25,bt=65536,nt=1<<17,wr=1<<18,Tt=1<<19,br=1<<20,Ae=65536,Et=1<<21,Ze=1<<22,rt=1<<23,Xe=Symbol("$state"),Cn=Symbol("proxy path"),Er=Symbol("attributes"),kr=Symbol("class"),xr=Symbol("style"),Sr=Symbol("text"),At=new class extends Error{constructor(){super(...arguments);B(this,"name","StaleReactionError");B(this,"message","The reaction that called `getAbortSignal()` was re-run or destroyed")}},Tr=1,Ar=11;function Or(e){{const t=new Error(`invariant_violation\nAn invariant violation occurred, meaning Svelte\'s internal assumptions were flawed. This is a bug in Svelte, not your app — please open an issue at https://github.com/sveltejs/svelte, citing the following message: "${e}"\nhttps://svelte.dev/e/invariant_violation`);throw t.name="Svelte error",t}}function $r(e,t){{const n=new Error(`component_api_changed\nCalling \\`${e}\\` on a component instance (of ${t}) is no longer valid in Svelte 5\nhttps://svelte.dev/e/component_api_changed`);throw n.name="Svelte error",n}}function Rr(e,t){{const n=new Error(`component_api_invalid_new\nAttempted to instantiate ${e} with \\`new ${t}\\`, which is no longer valid in Svelte 5. If this component is not under your control, set the \\`compatibility.componentApi\\` compiler option to \\`4\\` to keep it working.\nhttps://svelte.dev/e/component_api_invalid_new`);throw n.name="Svelte error",n}}function Cr(){{const e=new Error(`derived_references_self\nA derived value cannot reference itself recursively\nhttps://svelte.dev/e/derived_references_self`);throw e.name="Svelte error",e}}function Nr(){{const e=new Error(`effect_update_depth_exceeded\nMaximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state\nhttps://svelte.dev/e/effect_update_depth_exceeded`);throw e.name="Svelte error",e}}function Mr(e){{const t=new Error(`rune_outside_svelte\nThe \\`${e}\\` rune is only available inside \\`.svelte\\` and \\`.svelte.js/ts\\` files\nhttps://svelte.dev/e/rune_outside_svelte`);throw t.name="Svelte error",t}}function Ir(){{const e=new Error("state_descriptors_fixed\\nProperty descriptors defined on `$state` objects must contain `value` and always be `enumerable`, `configurable` and `writable`.\\nhttps://svelte.dev/e/state_descriptors_fixed");throw e.name="Svelte error",e}}function Fr(){{const e=new Error("state_prototype_fixed\\nCannot set prototype of `$state` object\\nhttps://svelte.dev/e/state_prototype_fixed");throw e.name="Svelte error",e}}function Pr(){{const e=new Error("state_unsafe_mutation\\nUpdating state inside `$derived(...)`, `$inspect(...)` or a template expression is forbidden. If the value should not be reactive, declare it without `$state`\\nhttps://svelte.dev/e/state_unsafe_mutation");throw e.name="Svelte error",e}}function Dr(){{const e=new Error("svelte_boundary_reset_onerror\\nA `<svelte:boundary>` `reset` function cannot be called while an error is still being handled\\nhttps://svelte.dev/e/svelte_boundary_reset_onerror");throw e.name="Svelte error",e}}const Lr=2,R=Symbol("uninitialized"),ut=Symbol("filename");var Jt="font-weight: bold",Qt="font-weight: normal";function jr(){console.warn(`%c[svelte] derived_inert\n%cReading a derived belonging to a now-destroyed effect may result in stale values\nhttps://svelte.dev/e/derived_inert`,Jt,Qt)}function Mt(e){console.warn(`%c[svelte] state_proxy_equality_mismatch\n%cReactive \\`$state(...)\\` proxies and the values they proxy have different identities. Because of this, comparisons with \\`${e}\\` will produce unexpected results\nhttps://svelte.dev/e/state_proxy_equality_mismatch`,Jt,Qt)}function Br(){console.warn("%c[svelte] svelte_boundary_reset_noop\\n%cA `<svelte:boundary>` `reset` function only resets the boundary the first time it is called\\nhttps://svelte.dev/e/svelte_boundary_reset_noop",Jt,Qt)}function qr(e){return e===this.v}let en=!1,Ur=!1;function Yr(){en=!0}function X(e,t){return e.label=t,Nn(e.v,t),e}function Nn(e,t){var n;return(n=e==null?void 0:e[Cn])==null||n.call(e,t),e}function Hr(e){const t=new Error,n=zr();return n.length===0?null:(n.unshift(`\n`),Ye(t,"stack",{value:n.join(`\n`)}),Ye(t,"name",{value:e}),t)}function zr(){const e=Error.stackTraceLimit;Error.stackTraceLimit=1/0;const t=new Error().stack;if(Error.stackTraceLimit=e,!t)return[];const n=t.split(`\n`),i=[];for(let r=0;r<n.length;r++){const s=n[r],o=s.replaceAll("\\\\","/");if(s.trim()!=="Error"){if(s.includes("validate_each_keys"))return[];o.includes("svelte/src/internal")||o.includes("node_modules/.vite")||i.push(s)}}return i}function Gr(e,t){e||Or(t)}let $=null;function kt(e){$=e}let it=null;function pn(e){it=e}let ct=null;function gn(e){ct=e}function Mn(e,t=!1,n){$={p:$,i:!1,c:null,e:null,s:e,x:null,r:k,l:en&&!t?{s:null,u:null,$:[]}:null},$.function=n,ct=n}function In(e){var t=$,n=t.e;if(n!==null){t.e=null;for(var i of n)mi(i)}return e!==void 0&&(t.x=e),t.i=!0,$=t.p,ct=($==null?void 0:$.function)??null,e??{}}function Ot(){return!en||$!==null&&$.l===null}let Ce=[];function Vr(){var e=Ce;Ce=[],yr(e)}function be(e){if(Ce.length===0){var t=Ce;queueMicrotask(()=>{t===Ce&&Vr()})}Ce.push(e)}const Yt=new WeakMap;function Fn(e){var t=k;if(t===null)return w.f|=rt,e;if(e instanceof Error&&!Yt.has(e)&&Yt.set(e,Kr(e,t)),!(t.f&at)&&!(t.f&tt))throw!t.parent&&e instanceof Error&&Pn(e),e;Ne(e,t)}function Ne(e,t){if(!(t!==null&&t.f&oe)){for(;t!==null;){if(t.f&Ut){if(!(t.f&at))throw e;try{t.b.error(e);return}catch(n){e=n}}t=t.parent}throw e instanceof Error&&Pn(e),e}}function Kr(e,t){var o,a,h;const n=Fe(e,"message");if(!(n&&!n.configurable)){for(var i=on?"  ":"	",r=`\n${i}in ${((o=t.fn)==null?void 0:o.name)||"<unknown>"}`,s=t.ctx;s!==null;)r+=`\n${i}in ${(a=s.function)==null?void 0:a[ut].split("/").pop()}`,s=s.p;return{message:e.message+`\n${r}\n`,stack:(h=e.stack)==null?void 0:h.split(`\n`).filter(T=>!T.includes("svelte/src/internal")).join(`\n`)}}}function Pn(e){const t=Yt.get(e);t&&(Ye(e,"message",{value:t.message}),Ye(e,"stack",{value:t.stack}))}const Wr=-7169;function A(e,t){e.f=e.f&Wr|t}function tn(e){e.f&z||e.deps===null?A(e,N):A(e,Z)}function Dn(e){if(e!==null)for(const t of e)!(t.f&M)||!(t.f&Ae)||(t.f^=Ae,Dn(t.deps))}function Ln(e,t,n){e.f&O?t.add(e):e.f&Z&&n.add(e),Dn(e.deps),A(e,N)}function $t(e){var t=w,n=k;ie(null),pe(null);try{return e()}finally{ie(t),pe(n)}}function Zr(e){let t=0,n=fn(0),i;return X(n,"createSubscriber version"),()=>{an()&&(Ie(n),bi(()=>(t===0&&(i=$i(()=>e(()=>Qe(n)))),t+=1,()=>{be(()=>{t-=1,t===0&&(i==null||i(),i=void 0,Qe(n))})})))}}var Xr=bt|Tt;function Jr(e,t,n,i){new Qr(e,t,n,i)}var U,Xt,Y,ke,P,H,I,j,se,xe,he,Pe,lt,ft,J,xt,S,ei,ti,Ht,ni,zt,pt,gt,Gt,Vt;class Qr{constructor(t,n,i,r){y(this,S);B(this,"parent");B(this,"is_pending",!1);B(this,"transform_error");y(this,U);y(this,Xt,null);y(this,Y);y(this,ke);y(this,P);y(this,H,null);y(this,I,null);y(this,j,null);y(this,se,null);y(this,xe,0);y(this,he,0);y(this,Pe,!1);y(this,lt,new Set);y(this,ft,new Set);y(this,J,null);y(this,xt,Zr(()=>(p(this,J,fn(l(this,xe))),X(l(this,J),"$effect.pending()"),()=>{p(this,J,null)})));var s;p(this,U,t),p(this,Y,n),p(this,ke,o=>{var a=k;a.b=this,a.f|=Ut,i(o)}),this.parent=k.b,this.transform_error=r??((s=this.parent)==null?void 0:s.transform_error)??(o=>o),p(this,P,Ei(()=>{m(this,S,zt).call(this)},Xr))}defer_effect(t){Ln(t,l(this,lt),l(this,ft))}is_rendered(){return!this.is_pending&&(!this.parent||this.parent.is_rendered())}has_pending_snippet(){return!!l(this,Y).pending}update_pending_count(t,n){m(this,S,Gt).call(this,t,n),p(this,xe,l(this,xe)+t),!(!l(this,J)||l(this,Pe))&&(p(this,Pe,!0),be(()=>{p(this,Pe,!1),l(this,J)&&Gn(l(this,J),l(this,xe))}))}get_effect_pending(){return l(this,xt).call(this),Ie(l(this,J))}error(t){if(!l(this,Y).onerror&&!l(this,Y).failed)throw t;g!=null&&g.is_fork?(l(this,H)&&g.skip_effect(l(this,H)),l(this,I)&&g.skip_effect(l(this,I)),l(this,j)&&g.skip_effect(l(this,j)),g.oncommit(()=>{m(this,S,Vt).call(this,t)})):m(this,S,Vt).call(this,t)}}U=new WeakMap,Xt=new WeakMap,Y=new WeakMap,ke=new WeakMap,P=new WeakMap,H=new WeakMap,I=new WeakMap,j=new WeakMap,se=new WeakMap,xe=new WeakMap,he=new WeakMap,Pe=new WeakMap,lt=new WeakMap,ft=new WeakMap,J=new WeakMap,xt=new WeakMap,S=new WeakSet,ei=function(){try{p(this,H,me(()=>l(this,ke).call(this,l(this,U))))}catch(t){this.error(t)}},ti=function(t){const n=l(this,Y).failed,{reset:i,invoke_onerror:r}=m(this,S,Ht).call(this,t);be(r),n&&p(this,j,me(()=>{n(l(this,U),()=>t,()=>i)}))},Ht=function(t){var n=!1,i=!1;const r=()=>{if(n){Br();return}n=!0,i&&Dr(),l(this,j)!==null&&mt(l(this,j),()=>{p(this,j,null)}),m(this,S,gt).call(this,()=>{m(this,S,zt).call(this)})};return{reset:r,invoke_onerror:()=>{var o,a;try{i=!0,(a=(o=l(this,Y)).onerror)==null||a.call(o,t,r),i=!1}catch(h){Ne(h,l(this,P)&&l(this,P).parent)}}}},ni=function(){const t=l(this,Y).pending;t&&(this.is_pending=!0,p(this,I,me(()=>t(l(this,U)))),be(()=>{var n=p(this,se,document.createDocumentFragment()),i=Xn();n.append(i),p(this,H,m(this,S,gt).call(this,()=>me(()=>l(this,ke).call(this,i)))),l(this,he)===0&&(l(this,U).before(n),p(this,se,null),mt(l(this,I),()=>{p(this,I,null)}),m(this,S,pt).call(this,g))}))},zt=function(){try{if(this.is_pending=this.has_pending_snippet(),p(this,he,0),p(this,xe,0),p(this,H,me(()=>{l(this,ke).call(this,l(this,U))})),l(this,he)>0){var t=p(this,se,document.createDocumentFragment());Si(l(this,H),t);const n=l(this,Y).pending;p(this,I,me(()=>n(l(this,U))))}else m(this,S,pt).call(this,g)}catch(n){this.error(n)}},pt=function(t){this.is_pending=!1,t.transfer_effects(l(this,lt),l(this,ft))},gt=function(t){var n=k,i=w,r=$;pe(l(this,P)),ie(l(this,P)),kt(l(this,P).ctx);try{return He.ensure(),t()}catch(s){return Fn(s),null}finally{pe(n),ie(i),kt(r)}},Gt=function(t,n){var i;if(!this.has_pending_snippet()){this.parent&&m(i=this.parent,S,Gt).call(i,t,n);return}p(this,he,l(this,he)+t),l(this,he)===0&&(m(this,S,pt).call(this,n),l(this,I)&&mt(l(this,I),()=>{p(this,I,null)}),l(this,se)&&(l(this,U).before(l(this,se)),p(this,se,null)))},Vt=function(t){l(this,H)&&(ne(l(this,H)),p(this,H,null)),l(this,I)&&(ne(l(this,I)),p(this,I,null)),l(this,j)&&(ne(l(this,j)),p(this,j,null));let n=l(this,Y).failed;const i=r=>{const{reset:s,invoke_onerror:o}=m(this,S,Ht).call(this,r);o(),n&&p(this,j,m(this,S,gt).call(this,()=>{try{return me(()=>{var a=k;a.b=this,a.f|=Ut,n(l(this,U),()=>r,()=>s)})}catch(a){return Ne(a,l(this,P).parent),null}}))};be(()=>{var r;try{r=this.transform_error(t)}catch(s){Ne(s,l(this,P)&&l(this,P).parent);return}r!==null&&typeof r=="object"&&typeof r.then=="function"?r.then(i,s=>Ne(s,l(this,P)&&l(this,P).parent)):i(r)})};const ri=new Set,ii=Symbol("obsolete");function si(e){var t=e.effects;if(t!==null){e.effects=null;for(var n=0;n<t.length;n+=1)ne(t[n])}}let It=[];function nn(e){var t,n=k,i=e.parent;if(!Oe&&i!==null&&e.v!==R&&i.f&(oe|ee))return jr(),e.v;pe(i);{let r=ze;wn(new Set);try{et.call(It,e)&&Cr(),It.push(e),e.f&=~Ae,si(e),t=sr(e)}finally{pe(n),wn(r),It.pop()}}return t}function jn(e){var t=nn(e);if(!e.equals(t)&&(e.wv=rr(),(!(g!=null&&g.is_fork)||e.deps===null)&&(g!==null?(g.capture(e,t,!0),Je==null||Je.capture(e,t,!0)):e.v=t,e.deps===null))){A(e,N);return}Oe||(C!==null?(an()||g!=null&&g.is_fork)&&C.set(e,t):tn(e))}function li(e){var t;if(e.effects!==null)for(const n of e.effects)(n.teardown||n.ac)&&((t=n.teardown)==null||t.call(n),n.ac!==null&&$t(()=>{n.ac.abort(At),n.ac=null}),n.fn!==null&&(n.teardown=gr),st(n,0),un(n))}function Bn(e){if(e.effects!==null)for(const t of e.effects)t.teardown&&t.fn!==null&&Ge(t)}let Ft=null,$e=null,g=null,Je=null,C=null,Kt=null,Pt=!1,Me=null,yt=null;var yn=0,Dt=new Set;let fi=1;var De,_e,Se,Le,je,Be,le,qe,F,ot,fe,V,Q,Ue,ve,b,Wt,Ve,Zt,qn,Un,Re,oi,Ke;const St=class St{constructor(){y(this,b);B(this,"id",fi++);y(this,De,!1);B(this,"linked",!0);y(this,_e,null);y(this,Se,null);B(this,"async_deriveds",new Map);B(this,"current",new Map);B(this,"previous",new Map);y(this,Le,new Set);y(this,je,new Set);y(this,Be,0);y(this,le,new Map);y(this,qe,null);y(this,F,[]);y(this,ot,[]);y(this,fe,new Set);y(this,V,new Set);y(this,Q,new Map);y(this,Ue,new Set);B(this,"is_fork",!1);y(this,ve,!1);$e===null?Ft=$e=this:(p($e,Se,this),p(this,_e,$e)),$e=this}skip_effect(t){l(this,Q).has(t)||l(this,Q).set(t,{d:[],m:[]}),l(this,Ue).delete(t)}unskip_effect(t,n=i=>this.schedule(i)){var i=l(this,Q).get(t);if(i){l(this,Q).delete(t);for(var r of i.d)A(r,O),n(r);for(r of i.m)A(r,Z),n(r)}l(this,Ue).add(t)}capture(t,n,i=!1){t.v!==R&&!this.previous.has(t)&&this.previous.set(t,t.v),t.f&rt||(this.current.set(t,[n,i]),C==null||C.set(t,n)),this.is_fork||(t.v=n)}activate(){g=this}deactivate(){g=null,C=null}flush(){try{On&&Dt.clear(),Pt=!0,g=this,m(this,b,Ve).call(this)}finally{yn=0,Kt=null,Me=null,yt=null,Pt=!1,g=null,C=null,te.clear();for(const t of Dt)t.updated=null}}discard(){var t;for(const n of l(this,je))n(this);l(this,je).clear();for(const n of this.async_deriveds.values())n.reject(ii);m(this,b,Ke).call(this),(t=l(this,qe))==null||t.resolve()}register_created_effect(t){l(this,ot).push(t)}increment(t,n){if(p(this,Be,l(this,Be)+1),t){let i=l(this,le).get(n)??0;l(this,le).set(n,i+1)}}decrement(t,n){if(p(this,Be,l(this,Be)-1),t){let i=l(this,le).get(n)??0;i===1?l(this,le).delete(n):l(this,le).set(n,i-1)}l(this,ve)||(p(this,ve,!0),be(()=>{p(this,ve,!1),this.linked&&this.flush()}))}transfer_effects(t,n){for(const i of t)l(this,fe).add(i);for(const i of n)l(this,V).add(i);t.clear(),n.clear()}oncommit(t){l(this,Le).add(t)}ondiscard(t){l(this,je).add(t)}settled(){return(l(this,qe)??p(this,qe,mr())).promise}static ensure(){if(g===null){const t=g=new St;Pt||be(()=>{l(t,De)||t.flush()})}return g}apply(){{C=null;return}}schedule(t){var r;if(Kt=t,(r=t.b)!=null&&r.is_pending&&t.f&(tt|$n|Rn)&&!(t.f&at)){t.b.defer_effect(t);return}for(var n=t;n.parent!==null;){n=n.parent;var i=n.f;if(Me!==null&&n===k&&(w===null||!(w.f&M)))return;if(i&(ue|ae)){if(!(i&N))return;n.f^=N}}l(this,F).push(n)}};De=new WeakMap,_e=new WeakMap,Se=new WeakMap,Le=new WeakMap,je=new WeakMap,Be=new WeakMap,le=new WeakMap,qe=new WeakMap,F=new WeakMap,ot=new WeakMap,fe=new WeakMap,V=new WeakMap,Q=new WeakMap,Ue=new WeakMap,ve=new WeakMap,b=new WeakSet,Wt=function(){if(this.is_fork)return!0;for(const i of l(this,le).keys()){for(var t=i,n=!1;t.parent!==null;){if(l(this,Q).has(t)){n=!0;break}t=t.parent}if(!n)return!0}return!1},Ve=function(){var h,T,_,c;p(this,De,!0),yn++>1e3&&(m(this,b,Ke).call(this),ai());for(const f of this.current.keys())Dt.add(f);for(const f of l(this,fe))l(this,V).delete(f),A(f,O),this.schedule(f);for(const f of l(this,V))A(f,Z),this.schedule(f);const t=l(this,F);p(this,F,[]),this.apply();var n=Me=[],i=[],r=yt=[];for(const f of t)try{m(this,b,Zt).call(this,f,n,i)}catch(u){throw zn(f),m(this,b,Wt).call(this)||this.discard(),u}if(g=null,r.length>0){var s=St.ensure();for(const f of r)s.schedule(f)}if(Me=null,yt=null,m(this,b,Wt).call(this)){m(this,b,Re).call(this,i),m(this,b,Re).call(this,n);for(const[f,u]of l(this,Q))Hn(f,u);r.length>0&&m(h=g,b,Ve).call(h);return}const o=m(this,b,qn).call(this);if(o){m(this,b,Re).call(this,i),m(this,b,Re).call(this,n),m(T=o,b,Un).call(T,this);return}l(this,fe).clear(),l(this,V).clear();for(const f of l(this,Le))f(this);l(this,Le).clear(),Je=this,mn(i),mn(n),Je=null,(_=l(this,qe))==null||_.resolve();var a=g;if(l(this,Be)===0&&(l(this,F).length===0||a!==null)&&m(this,b,Ke).call(this),l(this,F).length>0)if(a!==null){const f=a;l(f,F).push(...l(this,F).filter(u=>!l(f,F).includes(u)))}else a=this;a!==null&&(te.clear(),m(c=a,b,Ve).call(c))},Zt=function(t,n,i){t.f^=N;for(var r=t.first;r!==null;){var s=r.f,o=(s&(ae|ue))!==0,a=o&&(s&N)!==0,h=a||(s&ee)!==0||l(this,Q).has(r);if(!h&&r.fn!==null){o?r.f^=N:s&tt?n.push(r):ht(r)&&(s&K&&l(this,V).add(r),Ge(r));var T=r.first;if(T!==null){r=T;continue}}for(;r!==null;){var _=r.next;if(_!==null){r=_;break}r=r.parent}}},qn=function(){for(var t=l(this,_e);t!==null;){if(!t.is_fork){for(const[n,[,i]]of this.current)if(t.current.has(n)&&!i)return t}t=l(t,_e)}return null},Un=function(t){var i;for(const[r,s]of t.current)!this.previous.has(r)&&t.previous.has(r)&&this.previous.set(r,t.previous.get(r)),this.current.set(r,s);for(const[r,s]of t.async_deriveds){const o=this.async_deriveds.get(r);o&&s.promise.then(o.resolve).catch(o.reject)}t.async_deriveds.clear(),this.transfer_effects(l(t,fe),l(t,V));const n=r=>{var s=r.reactions;if(s!==null&&!(r.f&M&&!(r.f&(O|Z))))for(const h of s){var o=h.f;if(o&M)n(h);else{var a=h;o&(Ze|K)&&!this.async_deriveds.has(a)&&(l(this,V).delete(a),A(a,O),this.schedule(a))}}};for(const r of this.current.keys())n(r);this.oncommit(()=>t.discard()),m(i=t,b,Ke).call(i),g=this,m(this,b,Ve).call(this)},Re=function(t){for(var n=0;n<t.length;n+=1)Ln(t[n],l(this,fe),l(this,V))},oi=function(){var c;for(let f=Ft;f!==null;f=l(f,Se)){var t=f.id<this.id,n=[];for(const[u,[d,v]]of this.current){if(f.current.has(u)){var i=f.current.get(u)[0];if(t&&d!==i)f.current.set(u,[d,v]);else continue}n.push(u)}if(t)for(const[u,d]of this.async_deriveds){const v=f.async_deriveds.get(u);v&&d.promise.then(v.resolve).catch(v.reject)}var r=[...f.current.keys()].filter(u=>!f.current.get(u)[1]);if(!(!l(f,De)||r.length===0)){var s=r.filter(u=>!this.current.has(u));if(s.length===0)t&&f.discard();else if(n.length>0){if(l(f,ve)||Gr(l(f,F).length===0,"Batch has scheduled roots"),t)for(const u of l(this,Ue))f.unskip_effect(u,d=>{var v;d.f&(K|Ze)?f.schedule(d):m(v=f,b,Re).call(v,[d])});f.activate();var o=new Set,a=new Map;for(var h of n)Yn(h,s,o,a);a=new Map;var T=[...f.current].filter(([u,d])=>{const v=this.current.get(u);return v?v[0]!==d[0]||v[1]!==d[1]:!0}).map(([u])=>u);if(T.length>0)for(const u of l(this,ot))!(u.f&(oe|ee|nt))&&rn(u,T,a)&&(u.f&(Ze|K)?(A(u,O),f.schedule(u)):l(f,fe).add(u));if(l(f,F).length>0&&!l(f,ve)){f.apply();for(var _ of l(f,F))m(c=f,b,Zt).call(c,_,[],[]);p(f,F,[])}f.deactivate()}}}},Ke=function(){if(this.linked){var t=l(this,_e),n=l(this,Se);t===null?Ft=n:p(t,Se,n),n===null?$e=t:p(n,_e,t),this.linked=!1}};let He=St;function ai(){{var e=new Map;for(const n of g.current.keys())for(const[i,r]of n.updated??[]){var t=e.get(i);t||(t={error:r.error,count:0},e.set(i,t)),t.count+=r.count}for(const n of e.values())n.error&&console.error(n.error)}try{Nr()}catch(n){Ye(n,"stack",{value:""}),Ne(n,Kt)}}let G=null;function mn(e){var t=e.length;if(t!==0){for(var n=0;n<t;){var i=e[n++];if(!(i.f&(oe|ee))&&ht(i)&&(G=new Set,Ge(i),i.deps===null&&i.first===null&&i.nodes===null&&i.teardown===null&&i.ac===null&&er(i),(G==null?void 0:G.size)>0)){te.clear();for(const r of G){if(r.f&(oe|ee))continue;const s=[r];let o=r.parent;for(;o!==null;)G.has(o)&&(G.delete(o),s.push(o)),o=o.parent;for(let a=s.length-1;a>=0;a--){const h=s[a];h.f&(oe|ee)||Ge(h)}}G.clear()}}G=null}}function Yn(e,t,n,i){if(!n.has(e)&&(n.add(e),e.reactions!==null))for(const r of e.reactions){const s=r.f;s&M?Yn(r,t,n,i):s&(Ze|K)&&!(s&O)&&rn(r,t,i)&&(A(r,O),sn(r))}}function rn(e,t,n){const i=n.get(e);if(i!==void 0)return i;if(e.deps!==null)for(const r of e.deps){if(et.call(t,r))return!0;if(r.f&M&&rn(r,t,n))return n.set(r,!0),!0}return n.set(e,!1),!1}function sn(e){g.schedule(e)}function Hn(e,t){if(!(e.f&ae&&e.f&N)){e.f&O?t.d.push(e):e.f&Z&&t.m.push(e),A(e,N);for(var n=e.first;n!==null;)Hn(n,t),n=n.next}}function zn(e){A(e,N);for(var t=e.first;t!==null;)zn(t),t=t.next}let ze=new Set;const te=new Map;function wn(e){ze=e}let ln=!1;function ui(){ln=!0}function fn(e,t){var n={f:0,v:e,reactions:null,equals:qr,rv:0,wv:0};return n}function de(e,t){const n=fn(e);return Ti(n),n}function we(e,t,n=!1){w!==null&&(!W||w.f&nt)&&Ot()&&w.f&(M|K|Ze|nt)&&(re===null||!re.has(e))&&Pr();let i=n?We(t):t;return Nn(i,e.label),Gn(e,i,yt)}function Gn(e,t,n=null){var r;if(!e.equals(t)){Oe?te.set(e,t):te.has(e)||te.set(e,e.v);var i=He.ensure();i.capture(e,t);{if(k!==null){e.updated??(e.updated=new Map);const s=(((r=e.updated.get(""))==null?void 0:r.count)??0)+1;if(e.updated.set("",{error:null,count:s}),s>5){const o=Hr("updated at");if(o!==null){let a=e.updated.get(o.stack);a||(a={error:o,count:0},e.updated.set(o.stack,a)),a.count++}}}k!==null&&(e.set_during_effect=!0)}if(e.f&M){const s=e;e.f&O&&nn(s),C===null&&tn(s)}e.wv=rr(),Kn(e,O,n),Ot()&&k!==null&&k.f&N&&!(k.f&(ae|ue))&&(q===null?Ai([e]):q.push(e)),!i.is_fork&&ze.size>0&&!ln&&Vn()}return t}function Vn(){ln=!1;for(const e of ze){e.f&N&&A(e,Z);let t;try{t=ht(e)}catch{t=!0}t&&Ge(e)}ze.clear()}function Qe(e){we(e,e.v+1)}function Kn(e,t,n){var i=e.reactions;if(i!==null)for(var r=Ot(),s=i.length,o=0;o<s;o++){var a=i[o],h=a.f;if(!(!r&&a===k)){var T=(h&O)===0;if(T&&A(a,t),h&nt)ze.add(a);else if(h&M){var _=a;C==null||C.delete(_),h&Ae||(h&z&&(k===null||!(k.f&Et))&&(a.f|=Ae),Kn(_,Z,n))}else if(T){var c=a;h&K&&G!==null&&G.add(c),n!==null?n.push(c):sn(c)}}}}const ci=/^[a-zA-Z_$][a-zA-Z_$0-9]*$/;function We(e){if(typeof e!="object"||e===null||Xe in e)return e;const t=pr(e);if(t!==_r&&t!==vr)return e;var n=new Map,i=cr(e),r=de(0),s=Te,o=_=>{if(Te===s)return _();var c=w,f=Te;ie(null),kn(s);var u=_();return ie(c),kn(f),u};i&&(n.set("length",de(e.length)),e=hi(e));var a="";let h=!1;function T(_){if(!h){h=!0,a=_,X(r,`${a} version`);for(const[c,f]of n)X(f,ye(a,c));h=!1}}return new Proxy(e,{defineProperty(_,c,f){(!("value"in f)||f.configurable===!1||f.enumerable===!1||f.writable===!1)&&Ir();var u=n.get(c);return u===void 0?o(()=>{var d=de(f.value);return n.set(c,d),typeof c=="string"&&X(d,ye(a,c)),d}):we(u,f.value,!0),!0},deleteProperty(_,c){var f=n.get(c);if(f===void 0){if(c in _){const u=o(()=>de(R));n.set(c,u),Qe(r),X(u,ye(a,c))}}else we(f,R),Qe(r);return!0},get(_,c,f){var E;if(c===Xe)return e;if(c===Cn)return T;var u=n.get(c),d=c in _;if(u===void 0&&(!d||(E=Fe(_,c))!=null&&E.writable)&&(u=o(()=>{var x=We(d?_[c]:R),ge=de(x);return X(ge,ye(a,c)),ge}),n.set(c,u)),u!==void 0){var v=Ie(u);return v===R?void 0:v}return Reflect.get(_,c,f)},getOwnPropertyDescriptor(_,c){var f=Reflect.getOwnPropertyDescriptor(_,c);if(f&&"value"in f){var u=n.get(c);u&&(f.value=Ie(u))}else if(f===void 0){var d=n.get(c),v=d==null?void 0:d.v;if(d!==void 0&&v!==R)return{enumerable:!0,configurable:!0,value:v,writable:!0}}return f},has(_,c){var v;if(c===Xe)return!0;var f=n.get(c),u=f!==void 0&&f.v!==R||Reflect.has(_,c);if(f!==void 0||k!==null&&(!u||(v=Fe(_,c))!=null&&v.writable)){f===void 0&&(f=o(()=>{var E=u?We(_[c]):R,x=de(E);return X(x,ye(a,c)),x}),n.set(c,f));var d=Ie(f);if(d===R)return!1}return u},set(_,c,f,u){var dn;var d=n.get(c),v=c in _;if(i&&c==="length")for(var E=f;E<d.v;E+=1){var x=n.get(E+"");x!==void 0?we(x,R):E in _&&(x=o(()=>de(R)),n.set(E+"",x),X(x,ye(a,E)))}if(d===void 0)(!v||(dn=Fe(_,c))!=null&&dn.writable)&&(d=o(()=>de(void 0)),X(d,ye(a,c)),we(d,We(f)),n.set(c,d));else{v=d.v!==R;var ge=o(()=>We(f));we(d,ge)}var ce=Reflect.getOwnPropertyDescriptor(_,c);if(ce!=null&&ce.set&&ce.set.call(u,f),!v){if(i&&typeof c=="string"){var cn=n.get("length"),Ct=Number(c);Number.isInteger(Ct)&&Ct>=cn.v&&we(cn,Ct+1)}Qe(r)}return!0},ownKeys(_){Ie(r);var c=Reflect.ownKeys(_).filter(d=>{var v=n.get(d);return v===void 0||v.v!==R});for(var[f,u]of n)u.v!==R&&!(f in _)&&c.push(f);return c},setPrototypeOf(){Fr()}})}function ye(e,t){return typeof t=="symbol"?`${e}[Symbol(${t.description??""})]`:ci.test(t)?`${e}.${t}`:/^\\d+$/.test(t)?`${e}[${t}]`:`${e}[\'${t}\']`}function Lt(e){try{if(e!==null&&typeof e=="object"&&Xe in e)return e[Xe]}catch{}return e}const di=new Set(["copyWithin","fill","pop","push","reverse","shift","sort","splice","unshift"]);function hi(e){return new Proxy(e,{get(t,n,i){var r=Reflect.get(t,n,i);return di.has(n)?function(...s){ui();var o=r.apply(this,s);return Vn(),o}:r}})}function _i(){const e=Array.prototype,t=Array.__svelte_cleanup;t&&t();const{indexOf:n,lastIndexOf:i,includes:r}=e;e.indexOf=function(s,o){const a=n.call(this,s,o);if(a===-1){for(let h=o??0;h<this.length;h+=1)if(Lt(this[h])===s){Mt("array.indexOf(...)");break}}return a},e.lastIndexOf=function(s,o){const a=i.call(this,s,o??this.length-1);if(a===-1){for(let h=0;h<=(o??this.length-1);h+=1)if(Lt(this[h])===s){Mt("array.lastIndexOf(...)");break}}return a},e.includes=function(s,o){const a=r.call(this,s,o);if(!a){for(let h=0;h<this.length;h+=1)if(Lt(this[h])===s){Mt("array.includes(...)");break}}return a},Array.__svelte_cleanup=()=>{e.indexOf=n,e.lastIndexOf=i,e.includes=r}}var bn,on,Wn,Zn;function vi(){if(bn===void 0){bn=window,on=/Firefox/.test(navigator.userAgent);var e=Element.prototype,t=Node.prototype,n=Text.prototype;Wn=Fe(t,"firstChild").get,Zn=Fe(t,"nextSibling").get,_n(e)&&(e[kr]=void 0,e[Er]=null,e[xr]=void 0,e.__e=void 0),_n(n)&&(n[Sr]=void 0),e.__svelte_meta=null,_i()}}function Xn(e=""){return document.createTextNode(e)}function pi(e){return Wn.call(e)}function Jn(e){return Zn.call(e)}function gi(e,t,n){return n?document.createElement(e,{is:n}):document.createElement(e)}function yi(e,t){var n=t.last;n===null?t.last=t.first=e:(n.next=e,e.prev=n,t.last=e)}function dt(e,t){for(var n=k;n!==null&&n.f&nt;)n=n.parent;n!==null&&n.f&ee&&(e|=ee);var i={ctx:$,deps:null,nodes:null,f:e|O|z,first:null,fn:t,last:null,next:null,parent:n,b:n&&n.b,prev:null,teardown:null,wv:0,ac:null};i.component_function=ct,g==null||g.register_created_effect(i);var r=i;if(e&tt)Me!==null?Me.push(i):He.ensure().schedule(i);else if(t!==null){try{Ge(i)}catch(o){throw ne(i),o}r.deps===null&&r.teardown===null&&r.nodes===null&&r.first===r.last&&!(r.f&Tt)&&(r=r.first,e&K&&e&bt&&r!==null&&(r.f|=bt))}if(r!==null&&(r.parent=n,n!==null&&yi(r,n),w!==null&&w.f&M&&!(e&ue))){var s=w;(s.effects??(s.effects=[])).push(r)}return i}function an(){return w!==null&&!W}function mi(e){return dt(tt|br,e)}function wi(e){He.ensure();const t=dt(ue|Tt,e);return(n={})=>new Promise(i=>{n.outro?mt(t,()=>{ne(t),i(void 0)}):(ne(t),i(void 0))})}function bi(e,t=0){return dt($n|t,e)}function Ei(e,t=0){var n=dt(K|t,e);return n.dev_stack=it,n}function me(e){return dt(ae|Tt,e)}function Qn(e){var t=e.teardown;if(t!==null){const n=Oe,i=w;En(!0),ie(null);try{t.call(null)}finally{En(n),ie(i)}}}function un(e,t=!1){var n=e.first;for(e.first=e.last=null;n!==null;){const r=n.ac;r!==null&&$t(()=>{r.abort(At)});var i=n.next;n.f&ue?n.parent=null:ne(n,t),n=i}}function ki(e){for(var t=e.first;t!==null;){var n=t.next;t.f&ae||ne(t),t=n}}function ne(e,t=!0){var n=!1;(t||e.f&wr)&&e.nodes!==null&&e.nodes.end!==null&&(xi(e.nodes.start,e.nodes.end),n=!0),e.f|=vn,un(e,t&&!n),st(e,0);var i=e.nodes&&e.nodes.t;if(i!==null)for(const s of i)s.stop();Qn(e),e.f^=vn,e.f|=oe;var r=e.parent;r!==null&&r.first!==null&&er(e),e.component_function=null,e.next=e.prev=e.teardown=e.ctx=e.deps=e.fn=e.nodes=e.ac=e.b=null}function xi(e,t){for(;e!==null;){var n=e===t?null:Jn(e);e.remove(),e=n}}function er(e){var t=e.parent,n=e.prev,i=e.next;n!==null&&(n.next=i),i!==null&&(i.prev=n),t!==null&&(t.first===e&&(t.first=i),t.last===e&&(t.last=n))}function mt(e,t,n=!0){var i=[];tr(e,i,!0);var r=()=>{n&&ne(e),t&&t()},s=i.length;if(s>0){var o=()=>--s||r();for(var a of i)a.out(o)}else r()}function tr(e,t,n){if(!(e.f&ee)){e.f^=ee;var i=e.nodes&&e.nodes.t;if(i!==null)for(const a of i)(a.is_global||n)&&t.push(a);for(var r=e.first;r!==null;){var s=r.next;if(!(r.f&ue)){var o=(r.f&bt)!==0||(r.f&ae)!==0&&(e.f&K)!==0;tr(r,t,o?n:!1)}r=s}}}function Si(e,t){if(e.nodes)for(var n=e.nodes.start,i=e.nodes.end;n!==null;){var r=n===i?null:Jn(n);t.append(n),n=r}}let wt=!1,Oe=!1;function En(e){Oe=e}let w=null,W=!1;function ie(e){w=e}let k=null;function pe(e){k=e}let re=null;function Ti(e){w!==null&&(re??(re=new Set)).add(e)}let D=null,L=0,q=null;function Ai(e){q=e}let nr=1,Ee=0,Te=Ee;function kn(e){Te=e}function rr(){return++nr}function ht(e){var t=e.f;if(t&O)return!0;if(t&M&&(e.f&=~Ae),t&Z){for(var n=e.deps,i=n.length,r=0;r<i;r++){var s=n[r];if(ht(s)&&jn(s),s.wv>e.wv)return!0}t&z&&C===null&&A(e,N)}return!1}function ir(e,t,n=!0){var i=e.reactions;if(i!==null&&!(re!==null&&re.has(e)))for(var r=0;r<i.length;r++){var s=i[r];s.f&M?ir(s,t,!1):t===s&&(n?A(s,O):s.f&N&&A(s,Z),sn(s))}}function sr(e){var v;var t=D,n=L,i=q,r=w,s=re,o=$,a=W,h=Te,T=e.f;D=null,L=0,q=null,w=T&(ae|ue)?null:e,re=null,kt(e.ctx),W=!1,Te=++Ee,e.ac!==null&&($t(()=>{e.ac.abort(At)}),e.ac=null);try{e.f|=Et;var _=e.fn,c=_();e.f|=at;var f=e.deps,u=g==null?void 0:g.is_fork;if(D!==null){var d;if(u||st(e,L),f!==null&&L>0)for(f.length=L+D.length,d=0;d<D.length;d++)f[L+d]=D[d];else e.deps=f=D;if(an()&&e.f&z)for(d=L;d<f.length;d++)((v=f[d]).reactions??(v.reactions=[])).push(e)}else!u&&f!==null&&L<f.length&&(st(e,L),f.length=L);if(Ot()&&q!==null&&!W&&f!==null&&!(e.f&(M|Z|O)))for(d=0;d<q.length;d++)ir(q[d],e);if(r!==null&&r!==e){if(Ee++,r.deps!==null)for(let E=0;E<n;E+=1)r.deps[E].rv=Ee;if(t!==null)for(const E of t)E.rv=Ee;q!==null&&(i===null?i=q:i.push(...q))}return e.f&rt&&(e.f^=rt),c}catch(E){return Fn(E)}finally{e.f^=Et,D=t,L=n,q=i,w=r,re=s,kt(o),W=a,Te=h}}function Oi(e,t){let n=t.reactions;if(n!==null){var i=dr.call(n,e);if(i!==-1){var r=n.length-1;r===0?n=t.reactions=null:(n[i]=n[r],n.pop())}}if(n===null&&t.f&M&&(D===null||!et.call(D,t))){var s=t;s.f&z&&(s.f^=z,s.f&=~Ae),s.v!==R&&tn(s),s.ac!==null&&$t(()=>{s.ac.abort(At),s.ac=null,A(s,O)}),li(s),st(s,0)}}function st(e,t){var n=e.deps;if(n!==null)for(var i=t;i<n.length;i++)Oi(e,n[i])}function Ge(e){var t=e.f;if(!(t&oe)){A(e,N);var n=k,i=wt;k=e,wt=(t&(ae|ue))===0;{var r=ct;gn(e.component_function);var s=it;pn(e.dev_stack??it)}try{t&(K|Rn)?ki(e):un(e),Qn(e);var o=sr(e);e.teardown=typeof o=="function"?o:null,e.wv=nr;var a;On&&Ur&&e.f&O&&e.deps}finally{wt=i,k=n,gn(r),pn(s)}}}function Ie(e){var t=e.f,n=(t&M)!==0;if(w!==null&&!W){var i=k!==null&&(k.f&oe)!==0;if(!i&&(re===null||!re.has(e))){var r=w.deps;if(w.f&Et)e.rv<Ee&&(e.rv=Ee,D===null&&r!==null&&r[L]===e?L++:D===null?D=[e]:D.push(e));else{w.deps??(w.deps=[]),et.call(w.deps,e)||w.deps.push(e);var s=e.reactions;s===null?e.reactions=[w]:et.call(s,w)||s.push(w)}}}if(ri.delete(e),Oe&&te.has(e))return te.get(e);if(n){var o=e;if(Oe){var a=o.v;return(!(o.f&N)&&o.reactions!==null||fr(o))&&(a=nn(o)),te.set(o,a),a}var h=(o.f&z)===0&&!W&&w!==null&&(wt||(w.f&z)!==0),T=(o.f&at)===0;ht(o)&&(h&&(o.f|=z),jn(o)),h&&!T&&(Bn(o),lr(o))}if(C!=null&&C.has(e))return C.get(e);if(e.f&rt)throw e.v;return e.v}function lr(e){if(e.f|=z,e.deps!==null)for(const t of e.deps)(t.reactions??(t.reactions=[])).push(e),t.f&M&&!(t.f&z)&&(Bn(t),lr(t))}function fr(e){if(e.v===R)return!0;if(e.deps===null)return!1;for(const t of e.deps)if(te.has(t)||t.f&M&&fr(t))return!0;return!1}function $i(e){var t=W;try{return W=!0,e()}finally{W=t}}const Ri=["touchstart","touchmove"];function Ci(e){return Ri.includes(e)}function Ni(e,t,n){return(...i)=>{const r=e(...i);var s=r.nodeType===Ar?r.firstChild:r;return or(s,t,n),r}}function Mi(e,t,n){e.__svelte_meta={parent:it,loc:{file:t,line:n[0],column:n[1]}},n[2]&&or(e.firstChild,t,n[2])}function or(e,t,n){for(var i=0;e&&i<n.length;)e.nodeType===Tr&&Mi(e,t,n[i++]),e=e.nextSibling}const _t=Symbol("events"),Ii=new Set,xn=new Set;let jt=null,Bt=!1;function Sn(e){var v,E;var t=this,n=t.ownerDocument,i=e.type,r=((v=e.composedPath)==null?void 0:v.call(e))||[],s=r[0]||e.target;jt=e,Bt||(Bt=!0,setTimeout(()=>{Bt=!1,jt=null}));var o=0,a=jt===e&&e[_t];if(a){var h=r.indexOf(a);if(h!==-1&&(t===document||t===window)){e[_t]=t;return}var T=r.indexOf(t);if(T===-1)return;h<=T&&(o=h)}if(s=r[o]||e.target,s!==t){Ye(e,"currentTarget",{configurable:!0,get(){return s||n}});var _=w,c=k;ie(null),pe(null);try{for(var f,u=[];s!==null&&s!==t;){try{var d=(E=s[_t])==null?void 0:E[i];d!=null&&(!s.disabled||e.target===s)&&d.call(s,e)}catch(x){f?u.push(x):f=x}if(e.cancelBubble)break;o++,s=o<r.length?r[o]:null}if(f){for(let x of u)queueMicrotask(()=>{throw x});throw f}}finally{e[_t]=t,delete e.currentTarget,ie(_),pe(c)}}}var Tn;const qt=((Tn=globalThis==null?void 0:globalThis.window)==null?void 0:Tn.trustedTypes)&&globalThis.window.trustedTypes.createPolicy("svelte-trusted-html",{createHTML:e=>e});function Fi(e){return(qt==null?void 0:qt.createHTML(e))??e}function Pi(e){var t=gi("template");return t.innerHTML=Fi(e.replaceAll("<!>","\\x3C!---->")),t.content}function Di(e,t){var n=k;n.nodes===null&&(n.nodes={start:e,end:t,a:null,t:null})}function Li(e,t){var n=(t&Lr)!==0,i,r=!e.startsWith("<!>");return()=>{i===void 0&&(i=Pi(r?e:"<!>"+e));var s=n||on?document.importNode(i,!0):i.cloneNode(!0);{var o=pi(s),a=s.lastChild;Di(o,a)}return s}}function ji(e,t){e!==null&&e.before(t)}function Bi(e,t){return qi(e,t)}const vt=new Map;function qi(e,{target:t,anchor:n,props:i={},events:r,context:s,intro:o=!0,transformError:a}){vi();var h=void 0,T=wi(()=>{var _=n??t.appendChild(Xn());Jr(_,{pending:()=>{}},u=>{Mn({});var d=$;s&&(d.c=s),r&&(i.$$events=r),h=e(u,i)||{},In()},a);var c=new Set,f=u=>{for(var d=0;d<u.length;d++){var v=u[d];if(!c.has(v)){c.add(v);var E=Ci(v);for(const ce of[t,document]){var x=vt.get(ce);x===void 0&&(x=new Map,vt.set(ce,x));var ge=x.get(v);ge===void 0?(ce.addEventListener(v,Sn,{passive:E}),x.set(v,1)):x.set(v,ge+1)}}}};return f(hr(Ii)),xn.add(f),()=>{var E;for(var u of c)for(const x of[t,document]){var d=vt.get(x),v=d.get(u);--v==0?(x.removeEventListener(u,Sn),d.delete(u),d.size===0&&vt.delete(x)):d.set(u,v)}xn.delete(f),_!==n&&((E=_.parentNode)==null||E.removeChild(_))}});return Ui.set(h,T),h}let Ui=new WeakMap;function Yi(e){e&&Rr(e[ut]??"a component",e.name)}function Hi(){const e=$==null?void 0:$.function;function t(n){$r(n,e[ut])}return{$destroy:()=>t("$destroy()"),$on:()=>t("$on(...)"),$set:()=>t("$set(...)")}}{let e=function(t){if(!(t in globalThis)){let n;Object.defineProperty(globalThis,t,{configurable:!0,get:()=>{if(n!==void 0)return n;Mr(t)},set:i=>{n=i}})}};var Wi=e;e("$state"),e("$effect"),e("$derived"),e("$inspect"),e("$props"),e("$bindable")}const zi="5";var An;typeof window<"u"&&((An=window.__svelte??(window.__svelte={})).v??(An.v=new Set)).add(zi);Yr();Rt[ut]="scripts/grilling-ui/src/App.svelte";var Gi=Ni(Li("<h1>grilling visualizer</h1> <p>Grilling graph will appear here.</p>",1),Rt[ut],[[5,0],[7,0]]);function Rt(e,t){Yi(new.target),Mn(t,!1,Rt);var n={...Hi()},i=Gi();return ji(e,i),In(n)}Bi(Rt,{target:document.getElementById("app")});<\/script>\n  </head>\n  <body>\n    <div id="app"></div>\n  </body>\n</html>\n';
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
async function start(input) {
  const stateDir = createStateDir();
  writeFileSync(join(stateDir, "grilling.pid"), "0\n", "utf-8");
  const key = randomBytes(8).toString("hex");
  writeKey(input.cwd, key, stateDir);
  const state = loadState(stateDir);
  if (state["page-state"] !== "view") {
    throw new Error("Internal error: initial state should be 'view'");
  }
  process.stdout.write(stateDir + "\n");
  return { stateDir, key };
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
}
const POLL_INTERVAL_MS = 100;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1e3;
async function wait(dir, target, timeoutMs = DEFAULT_TIMEOUT_MS) {
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
async function finalize(dir, cwd) {
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
  return { exitCode: 0, markdownPath: mdPath };
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
  const answer = (_a = state.answers) == null ? void 0 : _a[q.id];
  lines.push(`**Answer:** ${answer ?? "(not answered)"}`);
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
const USAGE = `Usage: grilling-cli.mjs <subcommand> [flags]

Subcommands:
  start                              Start a grilling session
  update <sub>                       Mutate grilling state
  get [subset]                       Read grilling state
  refresh                            Signal the server to re-render (stub)
  wait <state>                       Block until page-state matches
  finalize                           Check coast-clear, emit summary

Update subcommands:
  add-question --id <5-word> --title --body --rec --round <n> --deps <ids>
  add-edge --from <id> --to <id> --type dep|contra|ref --id <id>
  promote --id <id> --to-round <n>
  set-state --state <one of 7>
  set-summary --text "running summary"
  resolve-contradiction --edge <id>

Options:
  --help, -h                        Show this help message
  --state <key>                     State key (required for all subcommands except start)
  --timeout <ms>                     Timeout for wait (default: 30 min)
  --no-open                          Do not auto-open the browser (used with start)

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
}
async function cmdStart(rest) {
  await start({ cwd: process.cwd() });
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
  const dir = resolveKey(process.cwd(), values.state);
  const result = await finalize(dir, process.cwd());
  process.stdout.write(`Finalized: ${result.markdownPath}
`);
}
main().catch((e) => {
  process.stderr.write(`${e.message}
`);
  process.exit(1);
});
