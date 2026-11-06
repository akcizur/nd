import RAPIER from '@dimforge/rapier3d-compat';
export type PhysicsWorldHandle=RAPIER.World;
export const PHYSICS_STEP=1/60;
export async function createPhysicsWorld(){await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=PHYSICS_STEP;return world;}
export function addStaticBox(world:PhysicsWorldHandle,x:number,y:number,z:number,hx:number,hy:number,hz:number,rotation?:{x:number;y:number;z:number;w:number}){const desc=RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z);if(rotation)desc.setRotation(rotation);world.createCollider(desc);}
