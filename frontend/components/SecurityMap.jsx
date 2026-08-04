'use client';

import { useEffect, useRef } from 'react';

export default function SecurityMap({ events, onSelect }) {
  const mapNode = useRef(null); const mapRef = useRef(null);
  useEffect(() => {
    let cancelled=false;
    async function ready(){
      if(!document.querySelector('link[data-loadlyx-leaflet]')){const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.dataset.loadlyxLeaflet='true';document.head.appendChild(link);}
      if(!window.L){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}
      if(cancelled||!mapNode.current)return; if(mapRef.current){mapRef.current.remove();}
      const map=window.L.map(mapNode.current,{worldCopyJump:true}).setView([52.13,-106.67],4); mapRef.current=map;
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      const markers=[]; events.forEach(event=>{const lat=Number(event.latitude);const lng=Number(event.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const marker=window.L.marker([lat,lng]).addTo(map).bindTooltip(`${event.user?.email||'User'} · ${event.riskLevel||'LOW'} risk`);marker.on('click',()=>onSelect(event));markers.push(marker);});
      if(markers.length){const group=window.L.featureGroup(markers);map.fitBounds(group.getBounds().pad(.25),{maxZoom:10});}
    }
    ready().catch(()=>{}); return()=>{cancelled=true;if(mapRef.current){mapRef.current.remove();mapRef.current=null;}};
  },[events,onSelect]);
  return <div ref={mapNode} style={{height:520,borderRadius:24,overflow:'hidden',background:'#e2e8f0'}} aria-label="Interactive approximate login activity map"/>;
}
