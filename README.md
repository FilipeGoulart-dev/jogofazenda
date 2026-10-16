# Jogo da Fazenda 3D

Jogo 3D de fazenda feito com **Three.js + Vite**, rodando no navegador (sem assets externos: todos os modelos são primitivas 3D).

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm run build    # gera a versão de produção em dist/
```

O progresso é salvo automaticamente no `localStorage` do navegador (a cada 15 s e ao fechar a página).

## Mecânicas

- **Plantio:** lavre com a Enxada (2), plante com Sementes (9, troque com Q), regue com o Regador (3) para crescer 2× mais rápido e colha quando maduro. Trigo, milho, cenoura e morango.
- **Animais (reprodução por casal):**
  - *Aves:* galinheiro. Galinha + galo na mesma cerca = ovos férteis que chocam pintinhos. Sem galo, as galinhas põem ovos para vender.
  - *Bovinos:* curral. Vaca + touro adultos geram bezerros após a gestação. Vacas acumulam leite (Balde, 7).
  - *Ovinos:* redil. Ovelha + carneiro geram cordeiros. Ovelhas produzem lã (Tesoura, 6).
  - Ninguém nasce sem um macho e uma fêmea adultos juntos. Animais precisam de ração (E perto da cerca) para produzir e crescer.
- **Peixes:** tilápias no lago. Macho e fêmea adultos geram alevinos. Pesque com a Vara (8) na beira da água.
- **Abelhas:** apiário com colmeias compradas na Loja. Produzem mel e cera; mais canteiros plantados = mais mel. Colônias fortes geram enxames.
- **Produção:** Moinho (trigo → farinha, milho → ração), Queijaria (leite → queijo), Tecelagem (lã → tecido), Padaria (farinha + ovo → pão).
- **Venda:** Loja (L). Os preços caem a cada venda e voltam ao normal com o tempo. Caminhão dá +20%.
- **Missões:** 16 missões em sequência (colheita, construções, nascimentos, vendas, pesca, melhorias...), com recompensas em dinheiro e XP.
- **Construção:** B abre o menu. E coloca, R gira, Esc cancela. Silos aumentam o armazém.
- **Veículos (Oficina, O):** Bicicleta (rápida), Trator (colhe sozinho os canteiros maduros por onde passa) e Caminhão (+20% na venda). Aproxime-se e pressione E para subir.
- **Melhorias (Oficina, O):** Irrigação, Adubação, Nutrição Animal e Ferramentas Reforçadas, em 3 níveis cada.

## Controles

| Tecla | Ação |
|---|---|
| W A S D / setas | andar (ou dirigir) |
| Shift | correr |
| Arrastar mouse / roda | girar e aproximar a câmera |
| E | interagir com o que está à frente |
| 1–9 | escolher ferramenta |
| Q | trocar a semente |
| B / R / Esc | construir / girar / cancelar |
| L / O / M / I / H | loja / oficina / missões / inventário / ajuda |

## Estrutura

```
src/
  config.js      dados e balanceamento (itens, animais, construções, missões...)
  game.js        lógica do jogo (sem Three.js): economia, reprodução, plantio, salvamento
  world.js       cena 3D e sincronização com o estado
  models.js      modelos 3D feitos com primitivas
  controller.js  movimento, veículos, tecla E e modo de construção
  ui.js          HUD, barra de atalhos, painéis
  main.js        inicialização e laço principal
```

## Testes

A lógica de reprodução, colheita, venda, processamento e missões foi verificada com um script em Node (importando `src/game.js` diretamente), e a interface foi testada num Chromium headless carregando o jogo.
