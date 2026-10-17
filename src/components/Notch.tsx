import {useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {Command,Search,SlidersHorizontal,Battery,Volume2} from 'lucide-react';
import {command} from '../bridge';
import type {Snapshot} from '../types';
export function Notch({data,onError}:{data:Snapshot,onError:(e:unknown)=>void}){
 const [expanded,setExpanded]=useState(false);const reduce=useReducedMotion();
 const update=(next:boolean)=>{setExpanded(next);if(next)void command('notch_interaction',{expanded:true}).catch(onError)};
 const open=(kind:string)=>{update(false);void command('open_popup',{kind}).catch(onError)};
 return <div className={`notch-region ${expanded?'notch-expanded':''}`} onKeyDown={e=>{if(e.key==='Escape')update(false)}}>
 <motion.div className="notch-material" aria-hidden="true" initial={false} animate={{transform:expanded?'translateX(-50%) scale(1,1)':'translateX(-50%) scale(.4722,.2619)'}} transition={reduce?{duration:0}:{type:'spring',stiffness:430,damping:38,mass:.8}} onAnimationComplete={()=>{if(!expanded)void command('notch_interaction',{expanded:false}).catch(onError)}}/>
 {!expanded?<button className="notch-compact" aria-label="Expand notch" aria-expanded={false} onClick={()=>update(true)}><Command size={12}/><span>MacTheme</span><i/></button>:<div className="notch-content"><button className="notch-heading" aria-label="Collapse notch" aria-expanded={true} onClick={()=>update(false)}><Command size={15}/><span>{data.status.activeApp}</span><i/></button><div className="notch-readings"><span><Volume2 size={13}/>{data.status.volume===null?'Sound settings':`${Math.round(data.status.volume)}%`}</span><span><Battery size={15}/>{data.status.battery===null?'Desktop':`${data.status.battery}%`}</span></div><div className="notch-actions"><button onClick={()=>open('spotlight')}><Search size={13}/>Search</button><button onClick={()=>open('panel')}><SlidersHorizontal size={13}/>Controls</button></div></div>}
 </div>
}
