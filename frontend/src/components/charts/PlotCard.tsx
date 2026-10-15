import Plot from 'react-plotly.js';
import type { Data,Layout } from 'plotly.js';
import { Card } from '@/components/ui/Card';

export function PlotCard({title,subtitle,data,layout}:{title:string;subtitle?:string;data:Data[];layout?:Partial<Layout>}){
  return <Card className="overflow-hidden p-5">
    <div className="mb-3"><h3 className="font-bold">{title}</h3>{subtitle&&<p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>}</div>
    <Plot data={data} layout={{autosize:true,height:270,margin:{l:42,r:18,t:10,b:42},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, sans-serif',color:'#64748b',size:11},xaxis:{gridcolor:'rgba(148,163,184,.13)',zeroline:false},yaxis:{gridcolor:'rgba(148,163,184,.13)',zeroline:false},showlegend:false,...layout}} config={{displayModeBar:false,responsive:true}} useResizeHandler style={{width:'100%',height:'100%'}}/>
  </Card>
}
