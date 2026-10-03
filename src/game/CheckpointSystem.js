import * as THREE from 'three';

export class CheckpointSystem {
  constructor(scene, points=[]) {
    this.points=points.map(p=>new THREE.Vector3(...p)); this.index=0; this.score=0;
    this.marker=new THREE.Mesh(new THREE.TorusGeometry(2.2,.16,10,32),new THREE.MeshBasicMaterial({color:0xffd43b,transparent:true,opacity:.9}));
    this.marker.rotation.x=Math.PI/2; scene.add(this.marker); this.sync();
  }
  sync(){ if(!this.points.length){this.marker.visible=false;return;} this.marker.visible=true; this.marker.position.copy(this.points[this.index]); }
  update(position){ if(!this.marker.visible)return false; if(position.distanceTo(this.marker.position)<2.8){this.score+=100; this.index++; if(this.index>=this.points.length){this.marker.visible=false;return true;} this.sync();} return false; }
}
