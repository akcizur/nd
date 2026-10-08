import RAPIER from '@dimforge/rapier3d-compat';
export type PhysicsWorldHandle=RAPIER.World;
export async function createPhysicsWorld(){await RAPIER.init();const world=new RAPIER.World({x:0,y:-18,z:0});world.timestep=1/60;return world;}
export function addStaticBox(world:PhysicsWorldHandle,x:number,y:number,z:number,hx:number,hy:number,hz:number){const desc=RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z);world.createCollider(desc);}