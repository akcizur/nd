import { VirtualJoystick } from './VirtualJoystick.js';

export class MobileControls {
  constructor(input) {
    this.input=input;
    this.root=document.createElement('div');
    this.root.className='mobile-controls';
    this.root.innerHTML=`
      <div class="mobile-zone mobile-zone--left"></div>
      <div class="mobile-zone mobile-zone--right"></div>
      <div class="mobile-actions">
        <button type="button" data-action="interact">E</button>
        <button type="button" data-action="handbrake">HB</button>
        <button type="button" data-action="sprint">RUN</button>
        <button type="button" data-action="jump">JUMP</button>
      </div>`;
    document.body.appendChild(this.root);
    const radius=()=>Math.min(innerWidth,innerHeight)*.11;
    this.left=new VirtualJoystick({zone:this.root.querySelector('.mobile-zone--left'),radius:radius(),onChange:(x,y)=>input.setMove(x,y)});
    this.right=new VirtualJoystick({zone:this.root.querySelector('.mobile-zone--right'),radius:radius(),onChange:(x,y)=>input.setLook(x,y)});
    this.buttons=[...this.root.querySelectorAll('[data-action]')];
    for(const button of this.buttons){
      const action=button.dataset.action;
      const down=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);input.setAction(action,true);button.classList.add('active');if(['interact','jump'].includes(action))setTimeout(()=>input.setAction(action,false),60);};
      const up=e=>{e?.preventDefault();if(!['interact','jump'].includes(action))input.setAction(action,false);button.classList.remove('active');};
      button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);
    }
    addEventListener('resize',()=>{const r=radius();this.left.setRadius(r);this.right.setRadius(r);});
  }
  setVehicleMode(vehicle){ this.root.classList.toggle('vehicle-controls',vehicle); }
}
