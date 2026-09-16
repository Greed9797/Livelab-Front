# Home, Clientes e Base Context

**Data:** 2026-09-16
**Status:** plano pronto para revisão; aplicação posterior com Luna.

## Pedido e autorizações

- Home com pelo menos cinco apresentadoras, horas acumuladas em assiduidade e agenda como último bloco.
- Clientes com lápis para editar direto, mudança de negociação por marco e avisos de fixo/comissão incompletos.
- Base como biblioteca simples de playbooks, estudos e materiais com criação/edição; disponível para a unidade.
- Pesquisar projetos open source e reaproveitar solução compacta.
- Planejar agora; executar depois com Luna.
- Publicação autorizada quando pronto e validado. Autorização não abrange cobranças, dados financeiros sintéticos em produção ou valores não informados da Haag.

## Decisões propostas e perguntas enviadas

1. Confirmado pelo usuário: horas do mês selecionado por apresentadora, até hoje; mês encerrado completo. O plano usa tempo registrado em lives encerradas, conforme API atual, e informa esse limite na interface.
2. Confirmado pelo usuário: Base somente para equipe interna e apresentadoras. Clientes, parceiros e contas de automação não entram no público. Aplicar a restrição em menu, guard, endpoints, busca, materiais globais/locais e downloads; ocultar menu sozinho não é suficiente.
3. Gestão cria/edita; leitores consultam publicados. Sem progresso, certificados ou matrícula.
4. Marco da negociação por competência mensal; setembro/2026 começa em 01/09/2026. Marco em dia intermediário fica fora da primeira versão para evitar regra financeira inventada.
5. Aproveitar Base existente e editor react-md-editor MIT/nohighlight; MDXEditor como alternativa; BookStack descartado como implantação por adicionar stack e operação.

## Evidências e limites

- Último frontend publicado: bd0f920, Vercel dpl_GZBVGvMTSQWpMi3YHdNPze3sCds7, versão 1789530994751.
- Backend atual: 17cbf330, sem mudança nesta etapa.
- Estado observado: somente .fastcontext/ e .playwright-cli/ preexistentes no front, backend limpo.
- Nenhuma consulta de contratos reais, bucket privado ou backup de produção executada neste planejamento.
- Zero legado não comprova “sem cobrança”; histórico atual não comprova negociação antiga.
- Context7 não disponível nesta sessão; pesquisa usou código e fontes oficiais dos projetos.
- Não há .specs/STATE.md nem lições confirmadas no repositório.
- As ferramentas smart-read caíram em fallback determinístico; leituras subsequentes foram por trechos dos arquivos identificados.

## Próxima execução

Ler spec.md, design.md e tasks.md; reconciliar eventuais respostas às perguntas opcionais. Revisar plano com o usuário antes de iniciar os lotes Luna. Não pedir novamente autorização genérica de deploy já concedida. Revalidar branches/produção, migrations e consumidores antes de alterações. Preservar arquivos não versionados.

## Deferred Ideas

- Vigências intermediárias no mês, se houver necessidade contratual real com regra de rateio definida.
- Hospedar/transcodificar vídeo.
- LMS, progresso e certificados.
