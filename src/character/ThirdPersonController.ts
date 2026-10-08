import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type {Input} from '../input/Input';
import type {GameState,PlayerState} from '../core/GameState';
import {createHumanoid,type HumanoidRig} from './Humanoid';
import type {PhysicsWorldHandle} from '../physics/PhysicsWorld';
import {ThirdPersonCamera} from '../camera/ThirdPersonCamera';
export class ThirdPersonController{
 readonly object=new THREE.Group();readonly humanoid:HumanoidRig;readonly velocity=new THREE.Vector3();readonly spawn=new THREE.Vector3(0,2.2,0);readonly collider:RAPIER.Collider;readonly characterController:RAPIER.KinematicCharacterController;
 state:PlayerState='IDLE';grounded=false;crouched=false;walkSpeed=3;runSpeed=5.6;acceleration=18;airControl=.35;gravity=-18;jumpSpeed=7;visualRotationSharpness=11;
 private desired=new THREE.Vector3();private forward=new THREE.Vector3();private right=new THREE.Vector3();private relative=new THREE.Vector3();
 constructor(private readonly physics:PhysicsWorldHandle,private readonly input:Input,private readonly camera:ThirdPersonCamera,private readonly stateStore:GameState){
  this.humanoid=createHumanoid();this.object.name='Player';this.object.add(this.humanoid.root);this.humanoid.root.position.y=-1.08;this.object.position.copy(this.spawn);
  const desc=RAPIER.ColliderDesc.capsule(.78,.34).setTranslation({x:this.spawn.x,y:this.spawn.y,z:this.spawn.z});
  this.collider=physics.createCollider(desc);this.characterController=physics.createCharacterController(.02);
 }
 reset(){this.object.position.copy(this.spawn);this.velocity.set(0,0,0);this.collider.setTranslation({x:this.spawn.x,y:this.spawn.y,z:this.spawn.z},true);this.humanoid.resetPose();}
 update(dt:number){
  const input=this.input.move;this.forward.set(-Math.sin(this.camera.yaw),0,-Math.cos(this.camera.yaw));this.right.set(Math.cos(this.camera.yaw),0,-Math.sin(this.camera.yaw));
  this.relative.copy(this.right).multiplyScalar(input.x).addScaledVector(this.forward,input.y);if(this.relative.lengthSq()>1)this.relative.normalize();
  this.crouched=this.input.crouch;const targetSpeed=this.crouched?this.walkSpeed*.62:(this.input.run?this.runSpeed:this.walkSpeed),control=this.grounded?1:this.airControl;
  this.desired.copy(this.relative).multiplyScalar(targetSpeed);const blend=1-Math.exp(-this.acceleration*control*dt);this.velocity.x=THREE.MathUtils.lerp(this.velocity.x,this.desired.x,blend);this.velocity.z=THREE.MathUtils.lerp(this.velocity.z,this.desired.z,blend);
  if(this.grounded){this.velocity.y=Math.max(this.velocity.y,-1.2);if(this.input.consumeJump()){this.velocity.y=this.jumpSpeed;this.grounded=false;}}else this.velocity.y+=this.gravity*dt;
  const translation={x:this.velocity.x*dt,y:this.velocity.y*dt,z:this.velocity.z*dt};this.characterController.computeColliderMovement(this.collider,translation);const corrected=this.characterController.computedMovement(),current=this.collider.translation(),next={x:current.x+corrected.x,y:current.y+corrected.y,z:current.z+corrected.z};
  this.collider.setTranslation(next);this.object.position.set(next.x,next.y,next.z);this.grounded=this.characterController.computedGrounded();
  const speed=Math.hypot(this.velocity.x,this.velocity.z);if(!this.grounded)this.state=this.velocity.y>0?'JUMP':'FALL';else if(speed<.15)this.state='IDLE';else if(this.input.run)this.state='RUN';else this.state='WALK';
  if(input.lengthSq()>.0001){const yaw=Math.atan2(this.relative.x,this.relative.z);this.humanoid.visuals.rotation.y=THREE.MathUtils.damp(this.humanoid.visuals.rotation.y,yaw,this.visualRotationSharpness,dt);}
  this.humanoid.update(dt,this.state,speed);this.humanoid.root.scale.y=THREE.MathUtils.damp(this.humanoid.root.scale.y,this.crouched?.84:1,10,dt);this.stateStore.playerState=this.state;this.stateStore.speed=speed;
 }
 dispose(){}
}