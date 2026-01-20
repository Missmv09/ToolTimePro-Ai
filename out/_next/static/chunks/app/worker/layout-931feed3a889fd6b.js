(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[300],{2898:function(e,t,r){"use strict";r.d(t,{Z:function(){return createLucideIcon}});var n=r(2265),a={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let toKebabCase=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase().trim(),createLucideIcon=(e,t)=>{let r=(0,n.forwardRef)(({color:r="currentColor",size:s=24,strokeWidth:o=2,absoluteStrokeWidth:i,className:c="",children:l,...d},u)=>(0,n.createElement)("svg",{ref:u,...a,width:s,height:s,stroke:r,strokeWidth:i?24*Number(o)/Number(s):o,className:["lucide",`lucide-${toKebabCase(e)}`,c].join(" "),...d},[...t.map(([e,t])=>(0,n.createElement)(e,t)),...Array.isArray(l)?l:[l]]));return r.displayName=`${e}`,r}},7619:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});var n=r(2898);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,n.Z)("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]])},6141:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});var n=r(2898);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,n.Z)("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]])},8083:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});var n=r(2898);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,n.Z)("HardHat",[["path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z",key:"1dej2m"}],["path",{d:"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5",key:"1p9q5i"}],["path",{d:"M4 15v-3a6 6 0 0 1 6-6h0",key:"1uc279"}],["path",{d:"M14 6h0a6 6 0 0 1 6 6v3",key:"1j9mnm"}]])},7972:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});var n=r(2898);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,n.Z)("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]])},2205:function(e,t,r){Promise.resolve().then(r.bind(r,7946))},7946:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return WorkerLayout}});var n=r(7437),a=r(1396),s=r.n(a),o=r(4033),i=r(7619),c=r(6141),l=r(7972),d=r(8083);let u=[{href:"/worker",label:"Jobs",icon:i.Z},{href:"/worker/time",label:"Time",icon:c.Z},{href:"/worker/profile",label:"Profile",icon:l.Z}];function WorkerLayout(e){let{children:t}=e,r=(0,o.usePathname)();return"/worker/login"===r?(0,n.jsx)(n.Fragment,{children:t}):(0,n.jsxs)("div",{className:"min-h-screen bg-gray-50 flex flex-col",children:[(0,n.jsxs)("header",{className:"bg-navy-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10",children:[(0,n.jsxs)("div",{className:"flex items-center gap-2",children:[(0,n.jsx)("div",{className:"w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center",children:(0,n.jsx)(d.Z,{className:"w-5 h-5 text-navy-500"})}),(0,n.jsx)("span",{className:"font-bold",children:"ToolTime Pro"})]}),(0,n.jsx)("div",{className:"text-sm text-white/70",children:"Worker App"})]}),(0,n.jsx)("main",{className:"flex-1 pb-20",children:t}),(0,n.jsx)("nav",{className:"fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 z-10",children:(0,n.jsx)("div",{className:"flex justify-around max-w-md mx-auto",children:u.map(e=>{let t=r===e.href;return(0,n.jsxs)(s(),{href:e.href,className:"flex flex-col items-center py-2 px-4 rounded-lg transition-colors ".concat(t?"text-gold-500":"text-gray-400 hover:text-navy-500"),children:[(0,n.jsx)(e.icon,{size:24}),(0,n.jsx)("span",{className:"text-xs mt-1 font-medium",children:e.label})]},e.href)})})})]})}},622:function(e,t,r){"use strict";/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var n=r(2265),a=Symbol.for("react.element"),s=Symbol.for("react.fragment"),o=Object.prototype.hasOwnProperty,i=n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,c={key:!0,ref:!0,__self:!0,__source:!0};function q(e,t,r){var n,s={},l=null,d=null;for(n in void 0!==r&&(l=""+r),void 0!==t.key&&(l=""+t.key),void 0!==t.ref&&(d=t.ref),t)o.call(t,n)&&!c.hasOwnProperty(n)&&(s[n]=t[n]);if(e&&e.defaultProps)for(n in t=e.defaultProps)void 0===s[n]&&(s[n]=t[n]);return{$$typeof:a,type:e,key:l,ref:d,props:s,_owner:i.current}}t.Fragment=s,t.jsx=q,t.jsxs=q},7437:function(e,t,r){"use strict";e.exports=r(622)},1396:function(e,t,r){e.exports=r(8326)},4033:function(e,t,r){e.exports=r(94)}},function(e){e.O(0,[326,971,472,744],function(){return e(e.s=2205)}),_N_E=e.O()}]);