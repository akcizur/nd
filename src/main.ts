import './style.css';
import { Game } from './core/Game';
const root=document.getElementById('app');
if(!root) throw new Error('ND bootstrap: #app missing');
const game=new Game(root);
void game.physicsPromise.then(()=>game.start());
window.addEventListener('beforeunload',()=>game.dispose(),{once:true});