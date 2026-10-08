import Phaser from 'phaser';
import type {GameState} from '../core/GameState';
export class PhaserOverlay{
 private readonly game:Phaser.Game;
 constructor(state:GameState){
  let hudText:Phaser.GameObjects.Text|undefined;
  this.game=new Phaser.Game({
   type:Phaser.WEBGL,parent:'ui-root',width:window.innerWidth,height:window.innerHeight,transparent:true,backgroundColor:'rgba(0,0,0,0)',
   scene:{create(this:Phaser.Scene){hudText=this.add.text(16,90,'',{color:'#fff',fontSize:'10px',fontFamily:'monospace',lineSpacing:2}).setAlpha(.42);},update(){hudText?.setText(`PLAYER  ${state.playerState}\nSPEED   ${state.speed.toFixed(1)} m/s`);}},
   scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true}
  });
 }
 destroy(){this.game.destroy(true);}
}