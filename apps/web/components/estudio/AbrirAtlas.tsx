'use client';
import {useEffect,useState} from 'react';
export function AbrirAtlas({id,children='Hablar con Atlas',className='inline-flex min-h-11 items-center text-[13px] underline'}:{id:string;children?:React.ReactNode;className?:string}){
 const [listo,setListo]=useState(false);useEffect(()=>setListo(true),[]);
 return <button disabled={!listo} aria-busy={!listo} type="button" className={className} onClick={()=>window.dispatchEvent(new CustomEvent('anonymo:atlas',{detail:{id}}))}>{children}</button>;
}
