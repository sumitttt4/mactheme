import { Folder, Globe, Code2, Terminal, FileText, Settings2, AppWindow } from 'lucide-react';
export function AppGlyph({name}:{name:string}) {
 const kind=/explorer|folder/i.test(name)?'files':/edge|chrome|browser/i.test(name)?'browser':/code/i.test(name)?'code':/terminal|powershell/i.test(name)?'terminal':/notepad|text/i.test(name)?'notes':/settings/i.test(name)?'settings':'app';
 const Icon={files:Folder,browser:Globe,code:Code2,terminal:Terminal,notes:FileText,settings:Settings2,app:AppWindow}[kind];
 return <span className={`app-glyph glyph-${kind}`} data-app={kind}><Icon size={25} strokeWidth={1.7}/></span>;
}
