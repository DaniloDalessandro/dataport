"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Car, Wrench, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vehicle, useVehicles } from "@/hooks/useVehicles";

export default function VehicleDetailsPage() {
  const params = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getVehicle } = useVehicles();

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        if (!params.id || Array.isArray(params.id)) {
          throw new Error('ID do veículo inválido');
        }

        const vehicleId = parseInt(params.id);
        if (isNaN(vehicleId)) {
          throw new Error('ID do veículo deve ser um número');
        }

        const vehicleData = await getVehicle(vehicleId);
        setVehicle(vehicleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar veículo');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchVehicle();
    }
  }, [params.id]);

  const isMaintenanceDue = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      'ativo': 'default',
      'manutencao': 'destructive',
      'inativo': 'secondary'
    };
    return variants[status] || 'outline';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'ativo': 'Ativo',
      'manutencao': 'Em Manutenção',
      'inativo': 'Inativo'
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando detalhes do veículo...</span>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Erro</h1>
          <p className="text-gray-600">{error || 'Veículo não encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="h-full w-full">
        <div className="min-h-screen w-full p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-100 text-blue-800 p-3 rounded-full text-2xl">
                🚛
              </span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Detalhes do Veículo: {vehicle.marca} {vehicle.modelo}
                </h1>
                <p className="text-gray-600">Informações completas do veículo</p>
              </div>
            </div>

            {(vehicle.status === 'manutencao' || isMaintenanceDue(vehicle.proximaManutencao)) && (
              <Alert variant={vehicle.status === 'manutencao' ? "destructive" : "default"} className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {vehicle.status === 'manutencao'
                    ? "Este veículo está em manutenção!"
                    : "A manutenção deste veículo está próxima!"}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-6">
            {/* Card Dados do Veículo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-blue-600" />
                  Dados do Veículo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Informações Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Placa:</strong>
                      <span className="text-gray-900">{vehicle.placa}</span>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Marca:</strong>
                      <span className="text-gray-900">{vehicle.marca}</span>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Modelo:</strong>
                      <span className="text-gray-900">{vehicle.modelo}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Ano:</strong>
                      <span className="text-gray-900">{vehicle.ano}</span>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Cor:</strong>
                      <span className="text-gray-900">{vehicle.cor}</span>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Categoria:</strong>
                      <span className="text-gray-900">{vehicle.categoria}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Combustível:</strong>
                      <span className="text-gray-900">{vehicle.combustivel}</span>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Capacidade:</strong>
                      <span className="text-gray-900">{vehicle.capacidade}</span>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Status:</strong>
                      <span className="text-gray-900">{getStatusLabel(vehicle.status)}</span>
                    </div>
                  </div>
                </div>

                {/* Documentação */}
                <div className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Chassi:</strong>
                      <span className="text-gray-900">{vehicle.chassi}</span>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">RENAVAM:</strong>
                      <span className="text-gray-900">{vehicle.renavam}</span>
                    </div>
                  </div>
                </div>

                {/* Proprietário */}
                <div className="mb-8">
                  <div className="flex flex-col">
                    <strong className="text-gray-600 mb-1 text-sm">Proprietário:</strong>
                    <span className="text-gray-900">{vehicle.proprietario}</span>
                  </div>
                </div>

                {/* Linha divisória para campos de auditoria */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Data de criação:</strong>
                      <span className="text-gray-900">
                        {format(new Date(vehicle.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {vehicle.created_by_username && (
                      <div className="flex flex-col">
                        <strong className="text-gray-600 mb-1 text-sm">Criado por:</strong>
                        <span className="text-gray-900">{vehicle.created_by_username}</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <strong className="text-gray-600 mb-1 text-sm">Última atualização:</strong>
                      <span className="text-gray-900">
                        {format(new Date(vehicle.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {vehicle.updated_by_username && (
                      <div className="flex flex-col">
                        <strong className="text-gray-600 mb-1 text-sm">Atualizado por:</strong>
                        <span className="text-gray-900">{vehicle.updated_by_username}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Manutenção */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Manutenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <strong className="text-gray-600 mb-1 text-sm">KM Rodados:</strong>
                    <span className="text-gray-900">{vehicle.kmRodados.toLocaleString("pt-BR")} km</span>
                  </div>
                  <div className="flex flex-col">
                    <strong className="text-gray-600 mb-1 text-sm">Última Manutenção:</strong>
                    <span className="text-gray-900">
                      {format(new Date(vehicle.ultimaManutencao), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <strong className="text-gray-600 mb-1 text-sm">Próxima Manutenção:</strong>
                    <span className="text-gray-900">
                      {format(new Date(vehicle.proximaManutencao), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                      {vehicle.status === 'manutencao' && " (Em andamento)"}
                      {vehicle.status !== 'manutencao' && isMaintenanceDue(vehicle.proximaManutencao) && " (Próxima)"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Condutores Vinculados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-600" />
                  Condutores Vinculados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicle.condutores && vehicle.condutores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Nome</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">CPF</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Categoria CNH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicle.condutores.map((condutor, index) => (
                          <tr key={condutor.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                            <td className="py-3 px-4 text-gray-900 text-sm">{condutor.nome}</td>
                            <td className="py-3 px-4 text-gray-900 text-sm">{condutor.cpf}</td>
                            <td className="py-3 px-4 text-gray-900 text-sm">{condutor.license_category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum condutor vinculado a este veículo</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}