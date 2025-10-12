import { Badge } from '@/components/ui/badge';

interface Props {
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
}

export function ComplaintPriorityBadge({ priority }: Props) {
  const config = {
    baixa: { label: 'Baixa', className: 'bg-gray-400 hover:bg-gray-500' },
    media: { label: 'Média', className: 'bg-blue-400 hover:bg-blue-500' },
    alta: { label: 'Alta', className: 'bg-orange-500 hover:bg-orange-600' },
    urgente: { label: 'Urgente', className: 'bg-red-600 hover:bg-red-700' },
  };

  const { label, className } = config[priority];

  return <Badge className={className}>{label}</Badge>;
}
