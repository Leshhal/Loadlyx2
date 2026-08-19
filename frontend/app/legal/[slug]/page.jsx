import { notFound } from 'next/navigation';import MarketingDetailPage,{marketingPages} from '@/components/MarketingDetailPage';
export function generateStaticParams(){return Object.keys(marketingPages).filter(k=>k.startsWith('legal/')).map(k=>({slug:k.split('/')[1]}));}
export default function Page({params}){const key=`legal/${params.slug}`;if(!marketingPages[key])return notFound();return <MarketingDetailPage pageKey={key}/>;}
