# Financeiro com DRE confiável - Context

**Gathered:** 2026-09-16
**Spec:** `.specs/features/financeiro-dre-confiavel/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Substituir a margem parcial da aba Operacional por um DRE baseado no resultado operacional completo. Organizar receitas de marcas, remuneração de apresentadoras e custos manuais em áreas resumidas e expansíveis. Preservar cálculos, permissões, edições e relatórios existentes.

## Implementation Decisions

### Hierarquia financeira

- O resultado operacional completo será a única margem destacada na aba Operacional.
- O DRE seguirá a ordem Receita de marcas, Remuneração de apresentadoras, Custos operacionais e Resultado operacional.
- Cada seção mostrará subtotal e quantidade quando fechada, com detalhamento por entidade ao expandir.

### Veracidade e reconciliação

- O frontend usará exclusivamente `entradas`, `saidas` e `totais` de `/v1/financeiro/operacional` para o DRE.
- A apresentação recusará um detalhamento que não reconcilie em centavos com os totais reportados.
- Contratos `fixo_ou_comissao` mostrarão os dois valores comparados e reconhecerão apenas o vencedor.

### Limpeza

- A margem após custos manuais, seu gráfico, sua comparação anterior e o fluxo que mistura GMV com custos sairão da aba Operacional.
- A lista de usuários deixará de mostrar `apresentadoras.comissao_pct` como “base”.
- Campos consumidos por PDF, CSV, cobrança, snapshots, portal e integrações permanecerão intactos.

### Agent's Discretion

- Densidade visual, ícones e microcopy, desde que usem os tokens e componentes existentes.
- Qual seção do DRE começa expandida em telas grandes.

### Declined / Undiscussed Gray Areas → Assumptions

- Nenhuma regra nova de contabilização será criada. Pendências sem fonte estruturada continuarão explícitas.
- A entrega não altera banco, contratos HTTP existentes nem geração de relatórios.

## Specific References

- Organização “tipo DRE”, com áreas colapsáveis, resumo e detalhamento.
- Separação explícita entre fixo e comissão de marcas, e fixo e comissão de apresentadoras.

## Deferred Ideas

- Modelar remuneração estruturada de supervisores e outras funções.
- Unificar os endpoints financeiros legados depois de medir todos os consumidores externos.
