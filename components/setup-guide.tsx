import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Code } from "lucide-react"

export function SetupGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-fit mb-4">
            <Code className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Configuração Necessária
          </CardTitle>
          <CardDescription>Configure as variáveis de ambiente do Supabase para continuar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              Para usar o chat, você precisa configurar as variáveis de ambiente do Supabase.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Crie um projeto no Supabase</h3>
              <p className="text-sm text-muted-foreground">
                Acesse{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  supabase.com
                </a>{" "}
                e crie um novo projeto.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Configure as variáveis de ambiente</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Adicione estas variáveis no seu arquivo <code className="bg-muted px-1 rounded">.env.local</code>:
              </p>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <div>NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima</div>
                <div>SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico</div>
                <div>NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Execute os scripts SQL</h3>
              <p className="text-sm text-muted-foreground">
                No Supabase SQL Editor, execute os scripts{" "}
                <code className="bg-muted px-1 rounded">01-create-tables.sql</code> e{" "}
                <code className="bg-muted px-1 rounded">02-create-functions.sql</code> que estão na pasta scripts.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Reinicie o servidor</h3>
              <p className="text-sm text-muted-foreground">
                Após configurar as variáveis, reinicie o servidor de desenvolvimento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
