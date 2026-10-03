export class AnimationSystem {
  constructor(object) { this.object=object; this.mixer=null; this.actions={}; this.state='idle'; }
  bind(mixer, clips) { this.mixer=mixer; for(const clip of clips) this.actions[clip.name.toLowerCase()]=mixer.clipAction(clip); if(this.actions.idle) this.play('idle',0); }
  play(name, fade=.16) { if(!this.mixer||this.state===name||!this.actions[name]) return; const next=this.actions[name], current=this.actions[this.state]; if(current) current.fadeOut(fade); next.reset().fadeIn(fade).play(); this.state=name; }
  update(dt) { this.mixer?.update(dt); }
  setUpperBody(action) { this.upperBody=action; }
}
