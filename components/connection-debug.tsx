"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { Activity, RefreshCw } from "lucide-react"

export function ConnectionDebug() {
  const [logs, setLogs] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev.slice(-9), `${timestamp}: ${message}`])
  }

  useEffect(() => {
    // Interceptar logs do console para mostrar na interface
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args) => {
      const message = args.join(" ")
      if (
        message.includes("📨") ||
        message.includes("👤") ||
        message.includes("📡") ||
        message.includes("✅") ||
        message.includes("❌")
      ) {
        addLog(message)
      }
      originalLog(...args)
    }

    console.error = (...args) => {
      const message = args.join(" ")
      if (message.includes("subscription") || message.includes("realtime") || message.includes("message")) {
        addLog(`ERROR: ${message}`)
      }
      originalError(...args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  const testConnection = async () => {
    addLog("🔄 Testando conexão...")

    try {
      const { data, error } = await supabase.from("profiles").select("count").single()
      if (error) {
        addLog(`❌ Erro na conexão: ${error.message}`)
      } else {
        addLog("✅ Conexão com banco OK")
      }
    } catch (error) {
      addLog(`❌ Erro inesperado: ${error}`)
    }
  }

  if (!isVisible) {
    return (
      <Button onClick={() => setIsVisible(true)} variant="outline" size="sm" className="fixed bottom-4 right-4 z-50">
        <Activity className="h-4 w-4 mr-2" />
        Debug
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-80 z-50 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Debug de Conexão</CardTitle>
          <div className="flex gap-2">
            <Button onClick={testConnection} variant="outline" size="sm">
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button onClick={() => setIsVisible(false)} variant="outline" size="sm">
              ✕
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`p-1 rounded text-xs ${
                log.includes("ERROR") || log.includes("❌")
                  ? "bg-red-50 text-red-700"
                  : log.includes("✅")
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-50 text-gray-700"
              }`}
            >
              {log}
            </div>
          ))}
          {logs.length === 0 && <div className="text-muted-foreground text-center py-4">Aguardando logs...</div>}
        </div>
      </CardContent>
    </Card>
  )
}
