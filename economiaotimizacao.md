Aqui está uma implementação enxuta, seguindo boas práticas do NestJS:
Aqui está a versão refinada dos parâmetros e do system prompt — já pronta para você usar no seu MVP.

✅ Parâmetros recomendados (para GPT-5 mini)
Parâmetro	Valor sugerido	Explicação
model	"gpt-5-mini"	Usa o modelo econômico, mas de alta qualidade.
temperature	0.1 – 0.3	Baixa criatividade → consistência didática e linguagem mais neutra.
max_tokens	4000 – 5000	Garante capítulos longos, sem corte. Para capítulos de 8–10 páginas.
top_p	0.9	Mantém alguma diversidade sem perder foco.
presence_penalty	0.0 – 0.2	Ajuda a evitar repetição de termos.
frequency_penalty	0.0 – 0.2	Também reduz redundância.
stop	opcional, ex.: ["\n\nFIM_DO_CAPITULO"]	Para você delimitar o final da resposta.
n	1	Gera uma única versão por vez (mais econômico).

1) Instalação do SDK

No seu projeto NestJS:

npm install openai


Depois configure sua variável de ambiente:

# .env
OPENAI_API_KEY=sk-xxxxxxx


E registre no NestJS usando ConfigModule (ou outro gerenciador de env que já use).

2) Service para gerar capítulos
// src/chapters/chapters.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ChaptersService {
  private client: OpenAI;

  private SYSTEM_PROMPT = `
Você é um autor e editor instrucional profissional, especialista na criação de materiais didáticos para [NOME DA DISCIPLINA] no nível [ENSINO FUNDAMENTAL / MÉDIO / SUPERIOR].

Objetivo: gerar capítulos de livro didático claros, envolventes e alinhados às boas práticas pedagógicas.

Regras de estilo:
- Linguagem simples e objetiva, adequada ao público-alvo.
- Explicações passo a passo, usando exemplos práticos e contextualizados.
- Estruture com subtítulos, listas e boxes de destaque para facilitar a leitura.
- Sempre apresente pelo menos 2 exemplos resolvidos e 3 exercícios por capítulo (com gabarito ao final).
- Inclua um resumo ou checklist de revisão ao final do capítulo.
- Se o conteúdo for denso, use comparações, metáforas ou analogias para facilitar o entendimento.
- Mantenha consistência de termos técnicos ao longo do livro.

Formato obrigatório de saída:
1. **Título do Capítulo**
2. **Objetivos de Aprendizagem** (3 a 5 bullets)
3. **Conteúdo Explicativo** dividido em seções lógicas
4. **Exemplos Resolvidos** (pelo menos 2)
5. **Exercícios** (fácil, médio, difícil)
6. **Gabarito dos Exercícios**
7. **Resumo Final ou Checklist**
`;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async gerarCapitulo(
    titulo: string,
    outline: string,
    indice: number,
  ): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Escreva o Capítulo ${indice}: ${titulo}\n\nUse este esboço como guia:\n${outline}\n\nSiga exatamente o formato definido no system prompt.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 4500,
      top_p: 0.9,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    return completion.choices[0].message.content ?? '';
  }
}

3) Controller para expor endpoint
// src/chapters/chapters.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ChaptersService } from './chapters.service';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  async gerarCapitulo(
    @Body()
    body: { titulo: string; outline: string; indice: number },
  ) {
    const { titulo, outline, indice } = body;
    const capitulo = await this.chaptersService.gerarCapitulo(
      titulo,
      outline,
      indice,
    );
    return { capitulo };
  }
}

4) Exemplo de uso (requisição HTTP)
curl -X POST http://localhost:3000/chapters \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Introdução à Matemática Financeira",
    "outline": "Definição de juros, aplicações práticas, histórico do conceito",
    "indice": 1
  }'


Resposta virá em JSON com o capítulo completo.

5) Boas práticas no NestJS

Use ConfigModule para centralizar a chave da API.

Se for gerar muitos capítulos em lote, use queue/batch (ex.: BullMQ) para evitar timeouts de request HTTP.

Salve o resultado no banco (ex.: Postgres) ou em arquivo (Markdown, PDF).

Adicione logs para medir custo e tokens usados (usage vem no retorno da API).