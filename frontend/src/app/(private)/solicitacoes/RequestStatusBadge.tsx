import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RequestStatusBadgeProps {
  status: 'em_analise' | 'aprovado' | 'reprovado';
  className?: string;
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const statusConfig = {
    em_analise: {
      label: 'Em Análise',
      className: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
    aprovado: {
      label: 'Aprovado',
      className: 'bg-green-500 hover:bg-green-600 text-white',
    },
    reprovado: {
      label: 'Reprovado',
      className: 'bg-red-500 hover:bg-red-600 text-white',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
