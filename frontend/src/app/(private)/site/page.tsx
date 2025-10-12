"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, FileText, Mail, Newspaper } from "lucide-react"

export default function SitePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento do Site</h1>
          <p className="text-muted-foreground">
            Gerencie o conteúdo e configurações do site institucional
          </p>
        </div>
        <Button>
          <Globe className="mr-2 h-4 w-4" />
          Visualizar Site
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Página Inicial</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Editar página principal
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sobre Nós</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Seções da página sobre
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicações</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Artigos publicados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Contatos recebidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas alterações no site
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Página "Sobre" atualizada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Há 2 horas por João Silva
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                  <Newspaper className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Nova publicação adicionada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Há 5 horas por Maria Santos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Nova mensagem de contato
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Há 1 dia por Pedro Oliveira
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
            <CardDescription>
              Visitas dos últimos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Visitas Totais</p>
                  <p className="text-2xl font-bold">1,234</p>
                </div>
                <div className="text-sm text-green-600 font-medium">+12%</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Páginas Visitadas</p>
                  <p className="text-2xl font-bold">3,456</p>
                </div>
                <div className="text-sm text-green-600 font-medium">+8%</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Taxa de Conversão</p>
                  <p className="text-2xl font-bold">3.2%</p>
                </div>
                <div className="text-sm text-red-600 font-medium">-2%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
