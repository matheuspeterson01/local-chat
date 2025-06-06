"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Database, Play, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { useState } from "react"
import { supabase } from "@/lib/supabase/client"

export function DatabaseSetup() {
  const [checking, setChecking] = useState(false)
  const [tablesExist, setTablesExist] = useState<boolean | null>(null)
  const [setupStatus, setSetupStatus] = useState<string>("")
  const [canRetry, setCanRetry] = useState(false)

  const checkTables = async () => {
    setChecking(true)
    setCanRetry(false)
    setSetupStatus("🔍 Verificando configuração do banco...")

    try {
      // Verificar se as tabelas existem
      const { error: profilesError } = await supabase.from("profiles").select("id").limit(1)
      const { error: messagesError } = await supabase.from("messages").select("id").limit(1)

      if (profilesError || messagesError) {
        setTablesExist(false)
        setSetupStatus("❌ Tabelas não encontradas. Execute os scripts SQL primeiro.")
        setCanRetry(true)
        setChecking(false)
        return
      }

      setSetupStatus("✅ Tabelas encontradas. Testando criação de perfil...")

      // Testar se conseguimos criar/buscar um perfil de teste
      const testUserId = "test-user-id"
      const { error: testError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: testUserId,
            username: "test_user",
            status: "online",
          },
          { onConflict: "id" },
        )
        .select()

      if (testError) {
        setSetupStatus(`⚠️ Problema com perfis: ${testError.message}`)
        setCanRetry(true)
      } else {
        // Limpar o perfil de teste
        await supabase.from("profiles").delete().eq("id", testUserId)
        setSetupStatus("✅ Configuração completa e funcionando!")
        setTablesExist(true)

        // Recarregar a página após verificar que tudo está OK
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch (error) {
      setTablesExist(false)
      setSetupStatus(`❌ Erro na verificação: ${error}`)
      setCanRetry(true)
      console.error("Database check error:", error)
    }

    setChecking(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-fit mb-4">
            <Database className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Configuração do Banco de Dados
          </CardTitle>
          <CardDescription>Execute os scripts SQL para criar as tabelas necessárias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>Execute os scripts SQL no Supabase SQL Editor na ordem indicada abaixo.</AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                01-create-tables.sql
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Cria as tabelas profiles e messages com políticas RLS
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                02-create-functions.sql
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Cria funções e triggers para gerenciar perfis automaticamente
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                04-verify-and-fix.sql (opcional)
              </h3>
              <p className="text-sm text-muted-foreground ml-8">Verifica e corrige problemas de dados existentes</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  4
                </span>
                Verificar configuração
              </h3>
              <div className="ml-8 space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={checkTables}
                    disabled={checking}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {checking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Verificar Configuração
                      </>
                    )}
                  </Button>

                  {canRetry && (
                    <Button onClick={checkTables} variant="outline" disabled={checking}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tentar Novamente
                    </Button>
                  )}
                </div>

                {setupStatus && <div className="text-sm font-mono bg-muted p-2 rounded">{setupStatus}</div>}
              </div>
            </div>

            {tablesExist === true && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✅ Perfeito! Banco configurado com sucesso. Redirecionando...
                </AlertDescription>
              </Alert>
            )}

            {tablesExist === false && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  Execute os scripts SQL no Supabase SQL Editor na ordem indicada.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
