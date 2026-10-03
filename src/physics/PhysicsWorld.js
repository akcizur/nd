import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  static async create() {
    await RAPIER.init();
    return new PhysicsWorld(new RAPIER.World({x:0,y:-9.81,z:0}));
  }
  constructor(world) { this.world=world; this.staticBodies=[]; }
  addStaticBox(x,y,z,w,h,d) {
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,y,z));
    const collider=RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2);
    this.world.createCollider(collider,body); this.staticBodies.push(body); return body;
  }
  step() { this.world.step(); }
}
