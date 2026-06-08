import{g as e,h as t}from"./src-B9_Wv8F3.js";import{n}from"./path-B1L27emi.js";import{t as r}from"./arc-DspQKuL8.js";import{t as i}from"./array-CLXCPui0.js";import{Kt as a,N as o,O as s,Ot as c,Qt as l,an as u,cn as d,in as f,pt as p,rn as m,sn as h,tn as g,vn as _,xn as v,yn as y}from"./index-DX92lClt.js";import{t as b}from"./chunk-4BX2VUAB-stBopT1p.js";import{t as x}from"./mermaid-parser.core-BkegMWDQ.js";function S(e,t){return t<e?-1:t>e?1:t>=e?0:NaN}function C(e){return e}function w(){var e=C,t=S,r=null,a=n(0),o=n(c),s=n(0);function l(n){var l,u=(n=i(n)).length,d,f,p=0,m=Array(u),h=Array(u),g=+a.apply(this,arguments),_=Math.min(c,Math.max(-c,o.apply(this,arguments)-g)),v,y=Math.min(Math.abs(_)/u,s.apply(this,arguments)),b=y*(_<0?-1:1),x;for(l=0;l<u;++l)(x=h[m[l]=l]=+e(n[l],l,n))>0&&(p+=x);for(t==null?r!=null&&m.sort(function(e,t){return r(n[e],n[t])}):m.sort(function(e,n){return t(h[e],h[n])}),l=0,f=p?(_-u*b)/p:0;l<u;++l,g=v)d=m[l],x=h[d],v=g+(x>0?x*f:0)+b,h[d]={data:n[d],index:l,value:x,startAngle:g,endAngle:v,padAngle:y};return h}return l.value=function(t){return arguments.length?(e=typeof t==`function`?t:n(+t),l):e},l.sortValues=function(e){return arguments.length?(t=e,r=null,l):t},l.sort=function(e){return arguments.length?(r=e,t=null,l):r},l.startAngle=function(e){return arguments.length?(a=typeof e==`function`?e:n(+e),l):a},l.endAngle=function(e){return arguments.length?(o=typeof e==`function`?e:n(+e),l):o},l.padAngle=function(e){return arguments.length?(s=typeof e==`function`?e:n(+e),l):s},l}var T=m.pie,E={sections:new Map,showData:!1,config:T},D=E.sections,O=E.showData,k=structuredClone(T),A={getConfig:t(()=>structuredClone(k),`getConfig`),clear:t(()=>{D=new Map,O=E.showData,l()},`clear`),setDiagramTitle:v,getDiagramTitle:d,setAccTitle:y,getAccTitle:u,setAccDescription:_,getAccDescription:f,addSection:t(({label:t,value:n})=>{if(n<0)throw Error(`"${t}" has invalid value: ${n}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);D.has(t)||(D.set(t,n),e.debug(`added new section: ${t}, with value: ${n}`))},`addSection`),getSections:t(()=>D,`getSections`),setShowData:t(e=>{O=e},`setShowData`),getShowData:t(()=>O,`getShowData`)},j=t((e,t)=>{b(e,t),t.setShowData(e.showData),e.sections.map(t.addSection)},`populateDb`),M={parse:t(async t=>{let n=await x(`pie`,t);e.debug(n),j(n,A)},`parse`)},N=t(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,`getStyles`),P=t(e=>{let t=[...e.values()].reduce((e,t)=>e+t,0),n=[...e.entries()].map(([e,t])=>({label:e,value:t})).filter(e=>e.value/t*100>=1);return w().value(e=>e.value).sort(null)(n)},`createPieArcs`),F={parser:M,db:A,renderer:{draw:t((t,n,i,c)=>{e.debug(`rendering pie chart
`+t);let l=c.db,u=h(),d=s(l.getConfig(),u.pie),f=p(n),m=f.append(`g`);m.attr(`transform`,`translate(225,225)`);let{themeVariables:_}=u,[v]=o(_.pieOuterStrokeWidth);v??=2;let y=d.textPosition,b=r().innerRadius(0).outerRadius(185),x=r().innerRadius(185*y).outerRadius(185*y);m.append(`circle`).attr(`cx`,0).attr(`cy`,0).attr(`r`,185+v/2).attr(`class`,`pieOuterCircle`);let S=l.getSections(),C=P(S),w=[_.pie1,_.pie2,_.pie3,_.pie4,_.pie5,_.pie6,_.pie7,_.pie8,_.pie9,_.pie10,_.pie11,_.pie12],T=0;S.forEach(e=>{T+=e});let E=C.filter(e=>(e.data.value/T*100).toFixed(0)!==`0`),D=a(w).domain([...S.keys()]);m.selectAll(`mySlices`).data(E).enter().append(`path`).attr(`d`,b).attr(`fill`,e=>D(e.data.label)).attr(`class`,`pieCircle`),m.selectAll(`mySlices`).data(E).enter().append(`text`).text(e=>(e.data.value/T*100).toFixed(0)+`%`).attr(`transform`,e=>`translate(`+x.centroid(e)+`)`).style(`text-anchor`,`middle`).attr(`class`,`slice`);let O=m.append(`text`).text(l.getDiagramTitle()).attr(`x`,0).attr(`y`,-400/2).attr(`class`,`pieTitleText`),k=[...S.entries()].map(([e,t])=>({label:e,value:t})),A=m.selectAll(`.legend`).data(k).enter().append(`g`).attr(`class`,`legend`).attr(`transform`,(e,t)=>{let n=22*k.length/2;return`translate(216,`+(t*22-n)+`)`});A.append(`rect`).attr(`width`,18).attr(`height`,18).style(`fill`,e=>D(e.label)).style(`stroke`,e=>D(e.label)),A.append(`text`).attr(`x`,22).attr(`y`,14).text(e=>l.getShowData()?`${e.label} [${e.value}]`:e.label);let j=512+Math.max(...A.selectAll(`text`).nodes().map(e=>e?.getBoundingClientRect().width??0)),M=O.node()?.getBoundingClientRect().width??0,N=450/2-M/2,F=450/2+M/2,I=Math.min(0,N),L=Math.max(j,F)-I;f.attr(`viewBox`,`${I} 0 ${L} 450`),g(f,450,L,d.useMaxWidth)},`draw`)},styles:N};export{F as diagram};