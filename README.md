# Sensor de Proximidade — Feira de Projetos USF 2026.2

Site estático (HTML, CSS e JS puros, sem build). Abra o `index.html` ou sirva a pasta.

## Estrutura

```
index.html     conteúdo
styles.css     estilos
app.js         simulador do sensor, realce do código, navegação
assets/
  video-1.mp4, video-2.mp4       vídeos (troque pelos novos, mantendo os nomes)
  poster-1.jpg, poster-2.jpg     capa de cada vídeo
  diagrama-eco.jpg, circuito.jpg imagens do relatório
```

## Trocar os vídeos

1. Coloque os novos arquivos em `assets/` como `video-1.mp4` e `video-2.mp4`.
2. Gere as capas (frame do segundo 3, por exemplo):

```bash
ffmpeg -ss 3 -i assets/video-1.mp4 -frames:v 1 -q:v 3 assets/poster-1.jpg
ffmpeg -ss 3 -i assets/video-2.mp4 -frames:v 1 -q:v 3 assets/poster-2.jpg
```

3. Para comprimir um vídeo grande (mantém boa qualidade e abre rápido na web):

```bash
ffmpeg -i original.mp4 -c:v libx264 -preset veryfast -crf 26 -movflags +faststart -c:a aac -b:a 96k assets/video-1.mp4
```

Se os vídeos novos forem horizontais, troque `aspect-ratio: 464 / 832` em `.videos video` (styles.css) por `16 / 9`.

## Deploy no GitHub Pages

1. Crie um repositório e envie o conteúdo desta pasta na raiz.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Entregar dentro do Google Sites (se o professor exigir)

O Google Sites aceita embutir uma página externa em tela cheia:

1. Abra o site no editor do Google Sites e crie ou escolha uma página em branco.
2. **Inserir → Incorporar → Por URL**, cole o endereço do GitHub Pages e clique em **Inserir**.
3. Arraste as bordas do bloco para ocupar a página inteira e aumente a altura (ou use o botão de tela cheia do bloco).
4. Em **Publicar**, deixe o Google Sites apontando para essa página.

Assim o trabalho continua sendo "um Google Sites" e todo o conteúdo e o visual vêm do código.

## Dados que vale conferir

- RA do Thieder: o relatório diz `202609737`; o Google Sites antigo dizia `202609373`.
- João Gabriel Dias Reis aparece no relatório, mas não estava no Google Sites antigo.
- A seção **História** foi escrita a partir do relatório; ajuste datas e detalhes se quiser.
