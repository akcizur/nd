import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type {Input} from '../input/Input';
import type {GameState,PlayerState} from '../core/GameState';
import {createHumanoid,type HumanoidRig} from './Humanoid';
import type {PhysicsWorldHandle} from '../physics/PhysicsWorld';
import {ThirdPersonCamera} from '../camera/ThirdPersonCamera';
export class ThirdPersonController{
 readonly object=new THREE.Group();readonly humanoid:HumanoidRig;readonly velocity=new THREE.Vector3();readonly spawn=new THREE.Vector3(0,.9,0);readonly collider:RAPIER.Collider;readonly characterController:RAPIER.KinematicCharacterController;
 state:PlayerState='IDLE';grounded=false;crouched=false;walkSpeed=1.4;runSpeed=3.5;acceleration=12;braking=18;airControl=.28;gravity=-9.81;jumpSpeed=Math.sqrt(2*9.81*.45);visualRotationSharpness=11;
 private desired=new THREE.Vector3();private forward=new THREE.Vector3();private right=new THREE.Vector3();private relative=new THREE.Vector3();
 constructor(private readonly physics:PhysicsWorldHandle,private readonly input:Input,private readonly camera:ThirdPersonCamera,private readonly stateStore:GameState){
  this.humanoid=createHumanoid();this.object.name='Player';this.object.add(this.humanoid.root);this.humanoid.root.position.y=-.9;this.object.position.copy(this.spawn);
  const desc=RAPIER.ColliderDesc.capsule(.58,.32).setTranslation(this.spawn.x,this.spawn.y,this.spawn.z);
  this.collider=physics.createCollider(desc);this.characterController=physics.createCharacterController(.015);this.characterController.setUp({x:0,y:1,z:0});this.characterController.setMaxSlopeClimbAngle(Math.PI/4);this.characterController.setMinSlopeSlideAngle(Math.PI/3);this.characterController.enableAutostep(.28,.18,true);
 }
 reset(){this.object.position.copy(this.spawn);this.velocity.set(0,0,0);this.crouched=false;this.collider.setShape(new RAPIER.Capsule(.58,.32));this.collider.setTranslation({x:this.spawn.x,y:this.spawn.y,z:this.spawn.z});this.humanoid.resetPose();}
 update(dt:number){
  const input=this.input.move;this.forward.set(-Math.sin(this.camera.yaw),0,-Math.cos(this.camera.yaw));this.right.set(Math.cos(this.camera.yaw),0,-Math.sin(this.camera.yaw));
  this.relative.copy(this.right).multiplyScalar(input.x).addScaledVector(this.forward,input.y);if(this.relative.lengthSq()>1)this.relative.normalize();
  const wantsCrouch=this.input.crouch; if(wantsCrouch!==this.crouched){const oldHalf=this.crouched?.305:.58,newHalf=wantsCrouch?.305:.58;if(wantsCrouch||!this.physics.castShape({x:this.object.position.x,y:this.object.position.y,z:this.object.position.z},{x:0,y:0,z:0}, {x:0,y:1,z:0},new RAPIER.Capsule(newHalf,.32),0,.02,undefined,this.collider.handle)){const p=this.collider.translation();const dy=newHalf-oldHalf;this.collider.setShape(new RAPIER.Capsule(newHalf,.32));this.collider.setTranslation({x:p.x,y:p.y+dy,z:p.z});this.object.position.y+=dy;this.crouched=wantsCrouch;}}
  const targetSpeed=this.crouched?this.walkSpeed*.62:(this.input.run?this.runSpeed:this.walkSpeed),control=this.grounded?1:this.airControl;
  this.desired.copy(this.relative).multiplyScalar(targetSpeed);const hasInput=this.relative.lengthSq()>.001;const rate=(hasInput?this.acceleration:this.braking)*control;const blend=1-Math.exp(-rate*dt);this.velocity.x=THREE.MathUtils.lerp(this.velocity.x,this.desired.x,blend);this.velocity.z=THREE.MathUtils.lerp(this.velocity.z,this.desired.z,blend);
  if(this.grounded){this.velocity.y=Math.min(this.velocity.y,0);if(this.input.consumeJump()){this.velocity.y=this.jumpSpeed;this.grounded=false;}}else this.velocity.y+=this.gravity*dt;
  const translation={x:this.velocity.x*dt,y:this.velocity.y*dt,z:this.velocity.z*dt};this.characterController.computeColliderMovement(this.collider,translation);const corrected=this.characterController.computedMovement(),current=this.collider.translation(),next={x:current.x+corrected.x,y:current.y+corrected.y,z:current.z+corrected.z};
  this.collider.setTranslation(next);this.object.position.set(next.x,next.y,next.z);this.grounded=this.characterController.computedGrounded();if(this.grounded&&this.velocity.y<0)this.velocity.y=0;
  const speed=Math.hypot(this.velocity.x,this.velocity.z);if(!this.grounded)this.state=this.velocity.y>0?'JUMP':'FALL';else if(speed<.15)this.state='IDLE';else if(this.input.run)this.state='RUN';else this.state='WALK';
  if(input.lengthSq()>.0001){const yaw=Math.atan2(this.relative.x,this.relative.z);this.humanoid.visuals.rotation.y=THREE.MathUtils.damp(this.humanoid.visuals.rotation.y,yaw,this.visualRotationSharpness,dt);}
  this.humanoid.update(dt,this.state,speed);this.humanoid.root.scale.y=THREE.MathUtils.damp(this.humanoid.root.scale.y,this.crouched?.78:1,10,dt);this.stateStore.playerState=this.state;this.stateStore.speed=speed;
 }
 dispose(){}
}
