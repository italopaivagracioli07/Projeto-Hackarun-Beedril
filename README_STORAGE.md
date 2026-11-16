# VibeMind — Módulo Storage (implementação demonstrativa)

**Equipe 04 — Mega Beedrill | HackaRun 2026**  
Responsável pelo módulo de armazenamento: **Luiz Fernando Azevedo Jales Pereira**.

> Este pacote complementa o planejamento técnico inicial da equipe. **Não substitua o README principal do repositório**: envie este arquivo como `README_STORAGE.md`.

## O que foi implementado?

- **`localStorage`**: eventos, respostas anônimas de interesse, avaliações de eventos e desbloqueio do Easter Egg.
- **`sessionStorage`**: rascunho da pesquisa enquanto a aba permanece aberta e contagem temporária de cliques no logo.
- **Dashboard demonstrativo**: total de eventos, total de respostas, interesses por categoria, canais de coleta e média das avaliações.
- **Recomendação por afinidade**: prioriza eventos de categorias escolhidas pela pessoa (não é IA treinada).
- **Importação e exportação JSON**: backup para demonstração e testes.
- **Easter Egg sexta-feira 13**: 13 cliques no logo exibem o evento secreto.
- **Testes automatizados**: Node.js, sem dependências externas.

## Estrutura

```text
README_STORAGE.md
package.json
src/
  storage/
    vibemindStorage.js    <-- ARQUIVO PRINCIPAL para integrar ao React/Vite
demo/
  index.html              <-- interface local demonstrativa
  styles.css
  app.js
tests/
  storage.test.mjs
```

## Como executar em Windows — passo a passo

### Opção A: Visual Studio Code

1. Extraia o ZIP em uma pasta.
2. Abra a pasta no VS Code.
3. Se tiver a extensão **Live Server**, clique com o botão direito em `demo/index.html` → **Open with Live Server**.
4. Abra a aba **③ Storage** e clique em **Carregar dados fictícios**.
5. Teste também **① Visitante** e **② EventMind**.

### Opção B: Python (sem extensão)

Abra o terminal na pasta que contém `README_STORAGE.md`:

```bash
py -m http.server 5500
```

Acesse **http://localhost:5500/demo/** no navegador. Se `py` não funcionar, tente `python -m http.server 5500`.

**Evite abrir `index.html` com duplo clique:** com `file://`, módulos JavaScript e o `localStorage` podem não funcionar da mesma forma em todos os navegadores.

### Testes automatizados (Node.js)

```bash
npm test
```

> Não é necessário instalar pacotes (`npm install`), porque não há dependências externas.

## Integrando ao React + Vite da equipe

Copie `src/storage/vibemindStorage.js` para a pasta `src/services/` do projeto principal. No componente React, importe:

```js
import { vibeStorage, CATEGORY_LABELS } from './services/vibemindStorage.js';

// Página de pesquisa — armazenar resposta local:
vibeStorage.savePreference({
  interests: ['musica', 'cultura'],
  channel: 'qr',
  ageRange: 'nao-informado',
  schedule: 'tarde'
});

// Página de recomendação:
const eventosSugeridos = vibeStorage.recommendEvents(['musica', 'cultura']);

// Página da gestão:
const indicadores = vibeStorage.getDashboard();
```

> **Observação React:** depois de salvar, atualize o estado da interface ou recarregue os indicadores. A API de Storage não faz renderização React automaticamente.

## Contrato das funções

| Função | Uso |
|---|---|
| `addEvent({ title, category, date })` | Cadastra um evento local |
| `listEvents()` / `removeEvent(id)` | Lista/remove eventos |
| `savePreference({ interests, channel, ageRange, schedule })` | Registra pesquisa anônima |
| `listPreferences()` | Lista preferências locais |
| `recommendEvents(['musica'])` | Ordena eventos pelo interesse |
| `saveEvaluation({ eventId, rating })` | Registra avaliação de 1–5 |
| `getDashboard()` | Gera indicadores locais |
| `saveDraft(data)` / `loadDraft()` / `clearDraft()` | Usa sessionStorage |
| `exportJSON()` / `importJSON(json)` | Backup dos registros |
| `seedDemoData()` / `clearAll()` | Cria dados fictícios / limpa tudo |
| `registerLogoClick()` | Easter Egg: 13 cliques |

### Valores válidos

**Categorias**: `musica`, `jogos`, `cultura`, `infantil`, `gastronomia`, `tecnologia`.

**Canais**: `qr`, `totem`, `assistido`.

**Faixas etárias** (opcionais): `nao-informado`, `crianca`, `adolescente`, `adulto`, `idoso`.

**Horários**: `indiferente`, `manha`, `tarde`, `noite`.

## Ponto fundamental: limites de Storage

`localStorage` é **local ao navegador/origem** e não sincroniza automaticamente dados entre celulares ou notebooks. Por isso, **os totais mostrados neste MVP são apenas dos dados salvos no navegador que abre o dashboard**. Não representem esses números como contagem real de visitantes do shopping.

Para um piloto com vários celulares, será necessário implementar **persistência compartilhada** (como Supabase/PostgreSQL) no fluxo de respostas e avaliações. `localStorage` e `sessionStorage` poderão continuar armazenando preferências locais e rascunhos; o dashboard central consultará o banco remoto. Essa integração **não está neste pacote**.

Não salve dados sensíveis, senhas ou tokens privados no `localStorage`. Esta demo não pede nomes, telefones ou localização precisa. Dados gerados por `seedDemoData()` são **fictícios** e o painel os identifica.

## Teste manual rápido

1. Clique em **③ Storage → Carregar dados fictícios**.
2. Em **② EventMind**, confira 6 eventos, 4 respostas e 3 avaliações.
3. Em **① Visitante**, marque Música + Cultura, clique em **Salvar preferências** e veja o ranking.
4. Volte a **② EventMind**: agora são 5 respostas e as barras mudaram.
5. Em **① Visitante**, escolha um evento e dê uma nota.
6. Vá a **③ Storage**: o JSON mostra eventos, pesquisas e avaliações.
7. Recarregue a aba: os registros continuam presentes, pois foram salvos no `localStorage`.
8. Clique **13 vezes no ✦** do cabeçalho: surge o Easter Egg da sexta-feira 13.

## Fontes técnicas

- [MDN — Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN — localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN — Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
