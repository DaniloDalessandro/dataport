import { Badge } from '@/components/ui/badge';

interface Props {
  status: 'pendente' | 'em_analise' | 'resolvida' | 'arquivada';
}

export function ComplaintStatusBadge({ status }: Props) {
  const config = {
    pendente: { label: 'Pendente', className: 'bg-yellow-500 hover:bg-yellow-600' },
    em_analise: { label: 'Em Análise', className: 'bg-blue-500 hover:bg-blue-600' },
    resolvida: { label: 'Resolvida', className: 'bg-green-500 hover:bg-green-600' },
    arquivada: { label: 'Arquivada', className: 'bg-gray-500 hover:bg-gray-600' },
  };

  const { label, className } = config[status];

  return <Badge className={className}>{label}</Badge>;
}
