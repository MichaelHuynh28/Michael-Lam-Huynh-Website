(function(){
  var cv=document.getElementById('sea'),cx=cv.getContext('2d'),gauge=document.getElementById('gauge'),
      reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,
      touch=matchMedia('(pointer: coarse)').matches,
      scale=parseFloat(document.body.getAttribute('data-depth'))||1,
      stops=[[15,76,92],[10,52,72],[6,30,50],[3,12,22]],
      W,H,dpr,parts=[],rings=[],flashes=[],progress=0,raf=0,mx=-999,my=-999,io=null;

  function resize(){dpr=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
    cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);}
  function seed(){parts=[];var n=touch?40:85;
    for(var i=0;i<n;i++)parts.push({x:Math.random()*W,y:Math.random()*H,r:.7+Math.pow(Math.random(),2.5)*3,s:.12+Math.random()*.3,p:Math.random()*6.28,h:Math.random()});}
  function colorAt(t){var s=t*(stops.length-1),i=Math.min(Math.floor(s),stops.length-2),f=s-i;
    return stops[i].map(function(v,k){return Math.round(v+(stops[i+1][k]-v)*f)});}
  function update(){var max=document.documentElement.scrollHeight-innerHeight;
    progress=(max>0?Math.min(1,Math.max(0,scrollY/max)):0)*scale;
    document.body.style.background='rgb('+colorAt(progress)+')';
    gauge.textContent=Math.round(progress*200)+' m';}
  function draw(t){
    cx.clearRect(0,0,W,H);
    var a=.3+progress*.6;
    cx.shadowBlur=9;
    parts.forEach(function(p){
      if(!reduce){
        p.y-=p.s;p.x+=Math.sin(t/1000+p.p)*.2;
        var dx=p.x-mx,dy=p.y-my,d=Math.sqrt(dx*dx+dy*dy);
        if(d<90&&d>0){p.x+=dx/d*(90-d)*.05;p.y+=dy/d*(90-d)*.05;}
        if(p.y<-10){p.y=H+10;p.x=Math.random()*W;}
      }
      var c='hsl('+(165+p.h*35)+',100%,72%)';
      cx.shadowColor=c;cx.fillStyle=c;cx.globalAlpha=a*(.5+.5*Math.sin(t/(450+p.h*900)+p.p));
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.283);cx.fill();
    });
    cx.shadowBlur=0;
    if(!reduce&&progress>.75&&Math.random()<.012&&flashes.length<1)flashes.push({x:Math.random()*W,y:H*(.2+Math.random()*.7),r:2+Math.random()*3.5,g:30+Math.random()*40,t:0,d:70+Math.random()*90,h:155+Math.random()*40});
    flashes=flashes.filter(function(f){return f.t<f.d});
    flashes.forEach(function(f){
      f.t++;f.y-=.1;
      var k=Math.sin(Math.PI*f.t/f.d)*(.75+.25*Math.sin(f.t*.5));
      var gr=cx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.g);
      gr.addColorStop(0,'hsla('+f.h+',100%,85%,'+(.9*k)+')');
      gr.addColorStop(.15,'hsla('+f.h+',100%,70%,'+(.35*k)+')');
      gr.addColorStop(1,'hsla('+f.h+',100%,60%,0)');
      cx.globalAlpha=1;cx.fillStyle=gr;cx.beginPath();cx.arc(f.x,f.y,f.g,0,6.283);cx.fill();
      cx.fillStyle='hsla('+f.h+',100%,92%,'+k+')';cx.beginPath();cx.arc(f.x,f.y,f.r,0,6.283);cx.fill();
    });
    rings=rings.filter(function(r){return r.a>0});
    rings.forEach(function(r){
      r.r+=r.v;r.a-=.011;cx.lineWidth=1.2;
      cx.globalAlpha=Math.max(r.a,0)*.45;cx.strokeStyle='#BFFFF5';
      cx.beginPath();cx.arc(r.x,r.y,r.r,0,6.283);cx.stroke();
      cx.globalAlpha=Math.max(r.a,0)*.22;
      cx.beginPath();cx.arc(r.x,r.y,r.r*.7,0,6.283);cx.stroke();
    });
    cx.globalAlpha=1;
    if(!reduce)raf=requestAnimationFrame(draw);
  }
  function start(){cancelAnimationFrame(raf);resize();seed();update();raf=requestAnimationFrame(draw);}

  function setupReveal(on){
    var sec=document.getElementById('projects');if(!sec)return;
    if(io){io.disconnect();io=null;}
    var els=[].slice.call(sec.querySelectorAll('.rv'));
    els.forEach(function(e){e.classList.remove('in')});
    if(!on||reduce||!('IntersectionObserver' in window)){sec.classList.remove('rv-on');return;}
    sec.classList.add('rv-on');
    io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}})},{threshold:.15,rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(e){io.observe(e)});
  }
  (function(){
    var c=document.querySelector('.carousel');if(!c)return;
    var sl=c.querySelector('.slides'),dots=[].slice.call(c.querySelectorAll('.dots span'));
    function go(d){sl.scrollBy({left:d*sl.clientWidth,behavior:reduce?'auto':'smooth'});}
    c.querySelector('.prev').addEventListener('click',function(){go(-1)});
    c.querySelector('.next').addEventListener('click',function(){go(1)});
    sl.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){go(1);e.preventDefault();}if(e.key==='ArrowLeft'){go(-1);e.preventDefault();}});
    sl.addEventListener('scroll',function(){var i=Math.round(sl.scrollLeft/sl.clientWidth);dots.forEach(function(d,k){d.classList.toggle('on',k===i)});},{passive:true});
  })();
  function bubbles(el){
    for(var i=0;i<28;i++){var b=document.createElement('i'),z=6+Math.random()*24;
      b.style.cssText='left:'+(Math.random()*100)+'%;width:'+z+'px;height:'+z+'px;animation-duration:'+(1.1+Math.random()*1.3)+'s;animation-delay:'+(Math.random()*.9)+'s';
      el.appendChild(b);}
  }
  var dv=document.getElementById('dive');
  if(dv&&document.documentElement.classList.contains('diving')){
    bubbles(dv);
    try{sessionStorage.setItem('dived','1')}catch(e){}
    var doneDive=function(){document.documentElement.classList.remove('diving')};
    dv.addEventListener('click',doneDive);
    addEventListener('keydown',doneDive,{once:true});
    setTimeout(doneDive,3100);
  }
  setupReveal(true);
  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',function(){resize();seed();update();});
  addEventListener('mousemove',function(e){if(reduce||touch)return;mx=e.clientX;my=e.clientY;});
  addEventListener('click',function(e){if(!reduce)rings.push({x:e.clientX,y:e.clientY,r:2,a:1,v:3});});
  start();
})();
