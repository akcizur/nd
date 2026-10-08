import * as THREE from 'three';
export class ThirdPersonCamera{
 yaw=0;pitch=-.24;distance=5.4;height=.8;minPitch=-1.15;maxPitch=.58;sensitivity=.0032;minDistance=2.2;maxDistance=7.5;
 private current=new THREE.Vector3();private desired=new THREE.Vector3();private target=new THREE.Vector3();private offset=new THREE.Vector3();
 constructor(readonly camera:THREE.PerspectiveCamera){}
 lookDelta(dx:number,dy:number){this.yaw-=dx*this.sensitivity;this.pitch-=dy*this.sensitivity;this.pitch=THREE.MathUtils.clamp(this.pitch,this.minPitch,this.maxPitch);}
 zoom(amount:number){this.distance=THREE.MathUtils.clamp(this.distance+amount,this.minDistance,this.maxDistance);}
 update(dt:number,subject:THREE.Object3D){this.target.copy(subject.position);this.target.y+=this.height;const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);this.offset.set(Math.sin(this.yaw)*cp,sp,Math.cos(this.yaw)*cp).multiplyScalar(this.distance);this.desired.copy(this.target).add(this.offset);this.current.lerp(this.desired,1-Math.exp(-dt*14));this.camera.position.copy(this.current);this.camera.lookAt(this.target);}
}