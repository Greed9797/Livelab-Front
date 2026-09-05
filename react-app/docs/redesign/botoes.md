# Formato dos botões

Todas as ações usam `--radius-pill`: botões com texto ficam em formato pill; botões quadrados de ícone ficam circulares. Isso também vale para ações em tabelas, modais, filtros e abas com aparência de botão, em qualquer estado ou tema.

Use `components/ui/Button.tsx` para ações comuns. Nas ações existentes com anatomia própria, use `rounded-[var(--radius-pill)]` ou `borderRadius: 'var(--radius-pill)'`, sem um raio numérico local. Botões compostos, como exportação com menu, arredondam só as extremidades externas e mantêm a divisão interna reta.

Campos, itens de menu, navegação lateral, cartões selecionáveis e células da agenda mantêm a forma de sua superfície. Links textuais e abas sublinhadas também mantêm sua apresentação textual.

Esta uniformização refina as exceções de raio de ícones e da ação Sair presentes no handoff original. Alturas, espaçamentos, cores e comportamentos existentes são preservados.
