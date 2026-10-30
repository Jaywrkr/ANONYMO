'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

// Una sola consulta de resumen; conserva la búsqueda y los filtros durante los refrescos.
export function SeguimientoMovil({siempre=false}:{siempre?:boolean}) {
  const router=useRouter();
  const [estado,setEstado]=useState('Conectando con el estudio…');
  useEffect(()=>{
    let activo=true, consultando=false, firma:string|undefined;
    const revisar=async()=>{
      if(consultando||document.hidden||(!siempre&&!matchMedia('(max-width:1023px)').matches))return;
      consultando=true;
      try{
        const r=await fetch('/estudio/resumen',{cache:'no-store'});
        if(!r.ok)throw new Error();
        const q=await r.json() as {firma:string};
        if(!activo)return;
        setEstado(`Al día · ${new Date().toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit',timeZone:'America/Guayaquil'})}`);
        if(firma===undefined||firma!==q.firma)router.refresh();
        firma=q.firma;
      }catch{if(activo)setEstado('Sin conexión. Mostramos la última información recibida.');}
      finally{consultando=false;}
    };
    void revisar();
    const intervalo=setInterval(revisar,8000);
    document.addEventListener('visibilitychange',revisar);
    return()=>{activo=false;clearInterval(intervalo);document.removeEventListener('visibilitychange',revisar);};
  },[router,siempre]);
  return <p role="status" className={`${siempre?'':'lg:hidden'} text-[12px] text-medio`}>{estado}</p>;
}
