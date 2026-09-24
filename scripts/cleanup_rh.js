const fs = require('fs');
let code = fs.readFileSync('src/pages/RH.tsx', 'utf8');

const oldImports = /import\s*\{\s*Palmtree[\s\S]*?\}\s*from\s*'lucide-react'/;
const newImports = `import { 
  Palmtree, 
  FileText, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Upload, 
  Download, 
  Shield, 
  Sparkles, 
  Send, 
  Paperclip, 
  Check, 
  X, 
  Laptop, 
  Users2, 
  Home, 
  Activity, 
  ArrowRight, 
  MapPin, 
  Settings, 
  PhoneCall, 
  DollarSign 
} from 'lucide-react'`;

code = code.replace(oldImports, newImports);
code = code.replace(/const \[filtroBusca, setFiltroBusca\] = useState\(''\)\r?\n/, '');
code = code.replace(/const \[filtroStatusPagamento, setFiltroStatusPagamento\] = useState<string>\('todos'\)\r?\n/, '');
code = code.replace(/defaultTecnico\?\.login/g, '(defaultTecnico as any)?.login');

fs.writeFileSync('src/pages/RH.tsx', code, 'utf8');
console.log('RH.tsx updated successfully');
