import * as THREE from 'three';
import type {PlayerState} from '../core/GameState';
export interface HumanoidRig{root:THREE.Group;visuals:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group;leftLeg:THREE.Group;rightLeg:THREE.Group;torso:THREE.Mesh;head:THREE.Mesh;update:(dt:number,state:PlayerState,speed:number)=>void;resetPose:()=>void;}
const mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.86,metalness:.02});
export function createHumanoid():HumanoidRig{
 const root=new THREE.Group(),visuals=new THREE.Group();root.add(visuals);
 const skin=mat(0xc78a61),shirt=mat(0x4e6d8f),pants=mat(0x272b33),shoes=mat(0x14171b);
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.62,.82,.36),shirt);torso.position.y=1.7;visuals.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.25,16,12),skin);head.position.y=2.34;visuals.add(head);
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.12,10),skin);neck.position.y=2.1;visuals.add(neck);
 const limb=(upper:THREE.Material,lower:THREE.Material,x:number,arm:boolean)=>{const g=new THREE.Group();g.position.set(x,arm?1.95:1.33,0);const a=new THREE.Mesh(new THREE.CapsuleGeometry(arm?.095:.11,arm?.33:.35,4,8),upper);a.position.y=arm?-.22:-.25;g.add(a);const b=new THREE.Mesh(new THREE.CapsuleGeometry(arm?.085:.095,arm?.31:.33,4,8),lower);b.position.y=arm?-.64:-.68;g.add(b);if(arm){const h=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),skin);h.position.y=-.84;g.add(h);}else{const f=new THREE.Mesh(new THREE.BoxGeometry(.2,.11,.34),shoes);f.position.set(0,-.92,-.05);g.add(f);}visuals.add(g);return g;};
 const leftArm=limb(shirt,skin,-.39,true),rightArm=limb(shirt,skin,.39,true),leftLeg=limb(pants,pants,-.18,false),rightLeg=limb(pants,pants,.18,false);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.45,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.24,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;visuals.add(shadow);
 let phase=0;
 const update=(dt:number,state:PlayerState,speed:number)=>{const moving=state==='WALK'||state==='RUN';const gait=state==='RUN'?10.5:7.4;if(moving)phase+=dt*gait*THREE.MathUtils.clamp(speed/(state==='RUN'?7:4),.25,1.4);const swing=moving?Math.sin(phase)*(state==='RUN'?.72:.46):0,armSwing=moving?Math.cos(phase)*(state==='RUN'?.58:.38):0;leftLeg.rotation.x=swing;rightLeg.rotation.x=-swing;leftArm.rotation.x=-armSwing;rightArm.rotation.x=armSwing;torso.position.y=1.7+(moving?Math.abs(Math.sin(phase))*(state==='RUN'?.025:.014):0);head.position.y=2.34+(moving?Math.abs(Math.sin(phase))*.018:0);if(state==='JUMP'){leftArm.rotation.x=-.8;rightArm.rotation.x=-.8;}if(state==='FALL'){leftArm.rotation.x=.7;rightArm.rotation.x=.7;}};
 const resetPose=()=>{leftLeg.rotation.set(0,0,0);rightLeg.rotation.set(0,0,0);leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);torso.position.y=1.7;head.position.y=2.34;};
 return {root,visuals,leftArm,rightArm,leftLeg,rightLeg,torso,head,update,resetPose};
}