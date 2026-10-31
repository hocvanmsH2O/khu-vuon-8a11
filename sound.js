/* Âm thanh tự tạo bằng code (không dùng tệp nhạc). Nút #snd bật/tắt; mặc định tắt. */
var Snd=(()=>{let ac=null,master,sfx,amb,on=false,timers=[];
 function init(){if(ac)return;ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.9;master.connect(ac.destination);
  sfx=ac.createGain();sfx.gain.value=.55;sfx.connect(master);amb=ac.createGain();amb.gain.value=0;amb.connect(master);buildWind()}
 function tone(f,t0,dur,type='sine',vol=.3,f2){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g);g.connect(sfx);o.start(t0);o.stop(t0+dur+.05)}
 function noiseBuf(sec){const b=ac.createBuffer(1,ac.sampleRate*sec,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;l=(l+.02*w)/1.02;d[i]=l*3.5}return b}
 function buildWind(){const s=ac.createBufferSource();s.buffer=noiseBuf(4);s.loop=true;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=500;
  const g=ac.createGain();g.gain.value=.10;const lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=.09;lg.gain.value=.07;lfo.connect(lg);lg.connect(g.gain);
  s.connect(f);f.connect(g);g.connect(amb);s.start();lfo.start()}
 function bird(){if(!on)return;const t=ac.currentTime,n=2+Math.floor(Math.random()*4),base=2400+Math.random()*1600;
  for(let i=0;i<n;i++){const o=ac.createOscillator(),g=ac.createGain(),t0=t+i*(.09+Math.random()*.05);o.frequency.setValueAtTime(base,t0);o.frequency.exponentialRampToValueAtTime(base*(1.2+Math.random()*.5),t0+.06);
   g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.05,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+.08);o.connect(g);g.connect(amb);o.start(t0);o.stop(t0+.1)}
  timers.push(setTimeout(bird,2500+Math.random()*5000))}
 function bee(){if(!on)return;const t=ac.currentTime,d=1.8+Math.random()*1.5,o=ac.createOscillator(),v=ac.createOscillator(),vg=ac.createGain(),f=ac.createBiquadFilter(),g=ac.createGain();
  o.type='sawtooth';o.frequency.value=210+Math.random()*40;v.frequency.value=7;vg.gain.value=12;v.connect(vg);vg.connect(o.frequency);f.type='lowpass';f.frequency.value=900;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+d*.4);g.gain.linearRampToValueAtTime(0,t+d);o.connect(f);f.connect(g);g.connect(amb);o.start(t);v.start(t);o.stop(t+d);v.stop(t+d);
  timers.push(setTimeout(bee,9000+Math.random()*12000))}
 const fx={
  pop(){const t=ac.currentTime;tone(620,t,.12,'sine',.35,280)},
  ting(){const t=ac.currentTime;tone(1320,t,.9,'sine',.22);tone(1980,t,.7,'sine',.10);tone(1760,t+.12,.9,'sine',.16)},
  water(){const t=ac.currentTime;for(let i=0;i<6;i++){const t0=t+i*.07+Math.random()*.04;tone(700+Math.random()*900,t0,.09,'sine',.18,1500+Math.random()*800)}},
  jingle(){const t=ac.currentTime;[523,659,784,1047].forEach((f,i)=>tone(f,t+i*.11,.35,'triangle',.22));tone(1568,t+.46,.6,'sine',.12)},
  chime(){const t=ac.currentTime;[2093,2637,3136,2349,2794].forEach((f,i)=>tone(f,t+i*.13+Math.random()*.05,1.4,'sine',.08))}};
 function set(v){on=v;init();if(ac.state==='suspended')ac.resume();
  amb.gain.cancelScheduledValues(ac.currentTime);amb.gain.linearRampToValueAtTime(on?1:0,ac.currentTime+1.2);
  timers.forEach(clearTimeout);timers=[];if(on){timers.push(setTimeout(bird,800));timers.push(setTimeout(bee,4000))}
  const b=document.getElementById('snd');if(b){b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.textContent=on?'🔊 Tắt âm thanh':'🔇 Bật âm thanh';}
  try{localStorage.setItem('vuon-snd',on?'1':'0')}catch(e){}}
 return{toggle(){set(!on)},play(n){if(on&&ac)fx[n]()},resumeIfSaved(){let s=null;try{s=localStorage.getItem('vuon-snd')}catch(e){}
  if(s==='1'){const go=()=>{set(true);removeEventListener('pointerdown',go)};addEventListener('pointerdown',go)}}};
})();

document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('snd');if(b)b.addEventListener('click',function(e){e.stopPropagation();Snd.toggle();Snd.play('ting')});Snd.resumeIfSaved();});
