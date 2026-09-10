(() => {
  const script=document.currentScript;
  if(!script||document.getElementById('portfolio-particle-bg'))return;
  const layer=document.createElement('div');
  layer.id='portfolio-particle-bg';
  layer.setAttribute('aria-hidden','true');
  const iframe=document.createElement('iframe');
  iframe.title='装飾用の淡い青紫の粒子背景';
  iframe.tabIndex=-1;
  iframe.setAttribute('sandbox','allow-scripts');
  iframe.src=new URL('portfolio-particles.html',script.src).href;
  layer.append(iframe);
  document.body.prepend(layer);
  let pending=false;
  const update=()=>{
    pending=false;
    const cover=document.querySelector('[data-page-curl]');
    const ready=!cover||getComputedStyle(cover).display==='none';
    document.body.classList.toggle('portfolio-particles-visible',ready);
    const main=document.querySelector('main');
    const profile=document.getElementById('profile');
    if(main&&profile){
      const viewportWidth=document.documentElement.clientWidth;
      const mainRect=main.getBoundingClientRect();
      const mainStyle=getComputedStyle(main);
      const mainLeft=mainRect.left;
      const mainContentLeft=mainLeft+(parseFloat(mainStyle.paddingLeft)||0);
      main.style.setProperty('--profile-blur-start',profile.offsetTop+'px');
      main.style.setProperty('--particle-viewport-width',viewportWidth+'px');
      main.style.setProperty('--particle-viewport-left',(-mainLeft)+'px');
      main.style.setProperty('--particle-marquee-left',(-mainContentLeft)+'px');
    }
  };
  const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(update);}};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('load',schedule,{once:true});
  update();
})();